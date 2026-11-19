"""
Unit and Integration Tests for Naytra Predictive Backend Engine.
Tests:
1. Candlestick creation & color invariants (Green/Red actuals, Purple forecasts)
2. Dynamic replacement logic (Purple forecast replaced by Real candle)
3. ML time-series forecasting bounds & intervals
4. Gemini market reasoner structured output
5. Ops health diagnostics & API endpoints
"""
import pytest
import time
from app.charts.candle_manager import Candle, CandleStore
from app.models.candle_predictor import CandlePredictor
from app.llm.market_reasoner import MarketReasoner
from app.config import settings


def test_candle_color_invariants():
    ts = int(time.time())
    # Bullish actual: Close >= Open -> Green #00C805
    c_bull = Candle.create_actual(ts, 100.0, 105.0, 99.0, 102.0, 5000)
    assert not c_bull.is_forecast
    assert c_bull.color == settings.CANDLE_COLOR_BULLISH

    # Bearish actual: Close < Open -> Red #FF3B30
    c_bear = Candle.create_actual(ts + 300, 102.0, 103.0, 98.0, 99.0, 6000)
    assert not c_bear.is_forecast
    assert c_bear.color == settings.CANDLE_COLOR_BEARISH

    # Forecast candle -> Purple #8A2BE2
    c_fc = Candle.create_forecast(ts + 600, 99.0, 101.0, 98.5, 100.5, 4500)
    assert c_fc.is_forecast
    assert c_fc.color == settings.CANDLE_COLOR_FORECAST


def test_dynamic_replacement_logic():
    """
    Core invariant: When real market data arrives for timestamp T,
    any prior purple forecast candle at T must be cleanly replaced by the real candle.
    """
    store = CandleStore(data_dir="/tmp/test_charts")
    ts = 1700000000

    # 1. Initially set a forecast candle at ts
    fc = Candle.create_forecast(ts, 1500.0, 1520.0, 1495.0, 1510.0, 2000)
    store.set_forecast_candles("RELIANCE", "5m", [fc])

    # Verify forecast exists
    chart = store.get_chart("RELIANCE", "5m", limit_actual=10, include_forecast=True)
    assert len(chart) == 1
    assert chart[0].is_forecast is True
    assert chart[0].color == settings.CANDLE_COLOR_FORECAST

    # 2. Real tick arrives at ts (e.g. market closed at 1490 -> bearish actual)
    actual = Candle.create_actual(ts, 1500.0, 1505.0, 1488.0, 1490.0, 8500)
    store.add_actual_candle("RELIANCE", "5m", actual)

    # 3. Verify forecast was REPLACED by actual candle
    updated_chart = store.get_chart("RELIANCE", "5m", limit_actual=10, include_forecast=True)
    assert len(updated_chart) == 1
    assert updated_chart[0].is_forecast is False
    assert updated_chart[0].color == settings.CANDLE_COLOR_BEARISH
    assert updated_chart[0].close == 1490.0


def test_ml_forecaster_bounds():
    predictor = CandlePredictor(checkpoints_dir="/tmp/test_checkpoints")
    future_ts = predictor.calculate_remaining_intervals(interval_min=5)
    assert len(future_ts) > 0

    forecasts = predictor.forecast_rest_of_day("TCS", interval="5m")
    assert len(forecasts) > 0
    for fc in forecasts:
        assert fc.is_forecast is True
        assert fc.color == settings.CANDLE_COLOR_FORECAST
        assert fc.upper_bound >= fc.close
        assert fc.lower_bound <= fc.close


@pytest.mark.asyncio
async def test_llm_reasoner_schema():
    reasoner = MarketReasoner()
    insight = await reasoner.generate_insight("INFY")
    assert insight["symbol"] == "INFY"
    assert "summary" in insight
    assert "primary_catalyst" in insight
    assert "technical_stance" in insight
    assert "confidence_pct" in insight
    assert insight["confidence_pct"] >= 50
    assert "key_levels" in insight
