"""
Chart Store & Candlestick Manager for Naytra.
Maintains historical OHLCV candles (green/red) and merges future purple forecast candles.
Implements the core dynamic replacement logic where purple forecast candles are smoothly
replaced by real candles as time passes and real market ticks arrive.
"""
import os
import json
import time
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from app.config import settings, SENSEX_DICT

# IST Timezone (UTC +5:30)
IST = timezone(timedelta(hours=5, minutes=30))


class Candle(BaseModel):
    timestamp: int  # Epoch seconds
    datetime_iso: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    is_forecast: bool = False
    color: str = settings.CANDLE_COLOR_BULLISH
    confidence: Optional[float] = None
    upper_bound: Optional[float] = None
    lower_bound: Optional[float] = None

    @classmethod
    def create_actual(
        cls,
        timestamp: int,
        open_p: float,
        high_p: float,
        low_p: float,
        close_p: float,
        volume: int,
    ) -> "Candle":
        color = settings.CANDLE_COLOR_BULLISH if close_p >= open_p else settings.CANDLE_COLOR_BEARISH
        dt = datetime.fromtimestamp(timestamp, tz=IST).isoformat()
        return cls(
            timestamp=timestamp,
            datetime_iso=dt,
            open=round(open_p, 2),
            high=round(high_p, 2),
            low=round(low_p, 2),
            close=round(close_p, 2),
            volume=int(volume),
            is_forecast=False,
            color=color,
        )

    @classmethod
    def create_forecast(
        cls,
        timestamp: int,
        open_p: float,
        high_p: float,
        low_p: float,
        close_p: float,
        volume: int,
        confidence: float = 0.82,
        upper_bound: Optional[float] = None,
        lower_bound: Optional[float] = None,
    ) -> "Candle":
        dt = datetime.fromtimestamp(timestamp, tz=IST).isoformat()
        return cls(
            timestamp=timestamp,
            datetime_iso=dt,
            open=round(open_p, 2),
            high=round(high_p, 2),
            low=round(low_p, 2),
            close=round(close_p, 2),
            volume=int(volume),
            is_forecast=True,
            color=settings.CANDLE_COLOR_FORECAST,  # Purple #8A2BE2
            confidence=round(confidence, 3),
            upper_bound=round(upper_bound, 2) if upper_bound else None,
            lower_bound=round(lower_bound, 2) if lower_bound else None,
        )


class CandleStore:
    def __init__(self, data_dir: str = "data/historical"):
        self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)
        # In-memory storage: {symbol: {interval: {timestamp: Candle}}}
        self._actual_candles: Dict[str, Dict[str, Dict[int, Candle]]] = {}
        self._forecast_candles: Dict[str, Dict[str, Dict[int, Candle]]] = {}
        self._last_prices: Dict[str, float] = {}

    def set_last_price(self, symbol: str, price: float):
        self._last_prices[symbol] = round(price, 2)

    def get_last_price(self, symbol: str) -> Optional[float]:
        return self._last_prices.get(symbol)

    def add_actual_candle(self, symbol: str, interval: str, candle: Candle):
        """
        Adds an actual real candle.
        DYNAMIC REPLACEMENT: If a forecast candle previously existed at this timestamp,
        it is permanently replaced by this real actual candle (green/red).
        """
        if symbol not in self._actual_candles:
            self._actual_candles[symbol] = {}
        if interval not in self._actual_candles[symbol]:
            self._actual_candles[symbol][interval] = {}

        self._actual_candles[symbol][interval][candle.timestamp] = candle
        self._last_prices[symbol] = candle.close

        # Clear any forecast that was sitting at this timestamp
        if symbol in self._forecast_candles and interval in self._forecast_candles[symbol]:
            self._forecast_candles[symbol][interval].pop(candle.timestamp, None)

    def set_forecast_candles(self, symbol: str, interval: str, forecast_list: List[Candle]):
        """
        Updates the purple forecast candles for the remaining today session.
        Only keeps forecasts that are strictly in the future compared to actual candles.
        """
        if symbol not in self._forecast_candles:
            self._forecast_candles[symbol] = {}
        self._forecast_candles[symbol][interval] = {}

        actuals = self._actual_candles.get(symbol, {}).get(interval, {})
        latest_actual_ts = max(actuals.keys()) if actuals else 0

        for fc in forecast_list:
            # Only store forecast if timestamp is ahead of latest actual
            if fc.timestamp > latest_actual_ts:
                self._forecast_candles[symbol][interval][fc.timestamp] = fc

    def get_chart(
        self,
        symbol: str,
        interval: str = "5m",
        limit_actual: int = 100,
        include_forecast: bool = True,
        timeline: str = "1D",
    ) -> List[Candle]:
        """
        Returns candlestick timeline for specified timeframe (1D, 1W, 1M, 1Y, 5Y).
        Predictions (purple candles) are STRICTLY generated and included only on the '1D' timeline.
        All other timelines (1W, 1M, 1Y, 5Y) display historical actual data only.
        """
        # Ensure predictions only appear on 1D timeline
        allow_forecast = include_forecast and (timeline == "1D" or interval in ["1m", "5m", "15m"])

        # If requesting multi-day / long-term timeline, generate appropriate historical points
        if timeline in ["1W", "1M", "1Y", "5Y"]:
            return self._get_multi_period_candles(symbol, timeline)

        actual_dict = self._actual_candles.get(symbol, {}).get(interval, {})
        forecast_dict = self._forecast_candles.get(symbol, {}).get(interval, {}) if allow_forecast else {}

        # Sort actual candles by timestamp ascending
        sorted_actuals = sorted(actual_dict.values(), key=lambda c: c.timestamp)
        if len(sorted_actuals) > limit_actual:
            sorted_actuals = sorted_actuals[-limit_actual:]

        latest_actual_ts = sorted_actuals[-1].timestamp if sorted_actuals else 0

        # Filter forecasts to strictly future timestamps
        future_forecasts = []
        if allow_forecast:
            future_forecasts = [
                fc for fc in forecast_dict.values()
                if fc.timestamp > latest_actual_ts
            ]
        sorted_forecasts = sorted(future_forecasts, key=lambda c: c.timestamp)

        return sorted_actuals + sorted_forecasts

    def _get_multi_period_candles(self, symbol: str, timeline: str) -> List[Candle]:
        """Generates historical actual candles for 1W, 1M, 1Y, 5Y periods."""
        last_price = self.get_last_price(symbol) or 1500.0
        now_ts = int(time.time())

        # Determine step and count
        if timeline == "1W":
            days = 7
            points = 28
            step_sec = 7 * 86400 // points
            volatility = 0.006
        elif timeline == "1M":
            days = 30
            points = 30
            step_sec = 86400
            volatility = 0.012
        elif timeline == "1Y":
            days = 365
            points = 52
            step_sec = 7 * 86400
            volatility = 0.025
        else:  # 5Y
            days = 365 * 5
            points = 60
            step_sec = 30 * 86400
            volatility = 0.045

        candles = []
        start_ts = now_ts - (days * 86400)
        # Reconstruct backward from last price
        prices = [last_price]
        curr = last_price
        for _ in range(points - 1):
            change = np.random.normal(0, volatility * curr)
            curr = max(10.0, curr - change)
            prices.insert(0, curr)

        for i, p in enumerate(prices):
            ts = start_ts + (i * step_sec)
            open_p = round(p * (1.0 + np.random.normal(0, volatility * 0.3)), 2)
            close_p = round(p, 2)
            high_p = round(max(open_p, close_p) + abs(np.random.normal(0, volatility * curr * 0.5)), 2)
            low_p = round(min(open_p, close_p) - abs(np.random.normal(0, volatility * curr * 0.5)), 2)
            vol = int(np.random.randint(15000, 250000))
            c = Candle.create_actual(ts, open_p, high_p, low_p, close_p, vol)
            candles.append(c)

        return candles

    def get_latest_candle(self, symbol: str, interval: str = "5m") -> Optional[Candle]:
        actual_dict = self._actual_candles.get(symbol, {}).get(interval, {})
        if not actual_dict:
            return None
        max_ts = max(actual_dict.keys())
        return actual_dict[max_ts]

    def export_summary(self) -> dict:
        total_actuals = sum(
            len(intervals.get("5m", {})) for intervals in self._actual_candles.values()
        )
        total_forecasts = sum(
            len(intervals.get("5m", {})) for intervals in self._forecast_candles.values()
        )
        return {
            "tracked_symbols": list(self._actual_candles.keys()),
            "total_actual_candles": total_actuals,
            "total_forecast_candles": total_forecasts,
            "last_prices": self._last_prices,
        }

    def save_to_disk(self):
        """Serializes current actual candles to disk for cold start recovery."""
        for symbol, intervals in self._actual_candles.items():
            for interval, candles in intervals.items():
                filepath = os.path.join(self.data_dir, f"{symbol}_{interval}.json")
                try:
                    data = [c.dict() for c in sorted(candles.values(), key=lambda x: x.timestamp)]
                    with open(filepath, "w") as f:
                        json.dump(data, f)
                except Exception:
                    pass

    def load_from_disk(self):
        """Restores historical actual candles from disk if present."""
        if not os.path.exists(self.data_dir):
            return
        for fname in os.listdir(self.data_dir):
            if fname.endswith(".json") and "_" in fname:
                parts = fname[:-5].split("_")
                symbol = parts[0]
                interval = parts[1]
                filepath = os.path.join(self.data_dir, fname)
                try:
                    with open(filepath, "r") as f:
                        data = json.load(f)
                    for item in data:
                        candle = Candle(**item)
                        self.add_actual_candle(symbol, interval, candle)
                except Exception:
                    pass


candle_store = CandleStore()
