"""
Naytra ML Candlestick Forecasting - Quantitative Feature Engineering.

Transforms raw OHLCV candles into a standardized (N, 9) feature tensor
capturing price momentum, mean-reversion signals, volatility envelopes,
and macro sentiment fusion.
"""
from typing import List, Optional
import numpy as np


class FeatureExtractor:
    """
    Computes technical and sentiment features across sequential candles.
    Robust against short sequences (dynamically adapts window sizes).
    """

    FEATURE_NAMES = [
        "return_1",
        "return_5",
        "normalized_true_range",
        "rsi_14",
        "macd_histogram",
        "bollinger_pct_b",
        "volume_zscore",
        "candle_conviction",
        "sentiment_score",
    ]
    INPUT_DIM = len(FEATURE_NAMES)  # 9

    @staticmethod
    def extract(candles: list, sentiment: float = 0.0) -> np.ndarray:
        """
        Extracts (N, 9) feature matrix from a list of Candle objects.
        Args:
            candles: List of Candle instances (must have close, open, high, low, volume).
            sentiment: Float in [-1.0, +1.0] from news analysis.
        Returns:
            np.ndarray of shape (N, 9) with dtype float32.
        """
        n = len(candles)
        if n == 0:
            return np.zeros((1, FeatureExtractor.INPUT_DIM), dtype=np.float32)

        closes = np.array([float(c.close) for c in candles], dtype=np.float32)
        opens = np.array([float(c.open) for c in candles], dtype=np.float32)
        highs = np.array([float(c.high) for c in candles], dtype=np.float32)
        lows = np.array([float(c.low) for c in candles], dtype=np.float32)
        volumes = np.array([float(getattr(c, "volume", 1000.0)) for c in candles], dtype=np.float32)

        # 1. 1-period normalized return
        r1 = np.zeros(n, dtype=np.float32)
        if n > 1:
            r1[1:] = (closes[1:] - closes[:-1]) / (closes[:-1] + 1e-6)

        # 2. 5-period rolling return momentum
        r5 = np.zeros(n, dtype=np.float32)
        for i in range(n):
            lookback = max(0, i - 4)
            r5[i] = (closes[i] - closes[lookback]) / (closes[lookback] + 1e-6)

        # 3. Normalized True Range (Intraday volatility)
        prev_close = np.roll(closes, 1)
        prev_close[0] = opens[0]
        tr = np.maximum(highs - lows, np.maximum(np.abs(highs - prev_close), np.abs(lows - prev_close)))
        tr_norm = tr / (closes + 1e-6)

        # 4. RSI-14 (Relative Strength Index) centered at 0 (-0.5 to +0.5)
        gains = np.maximum(r1, 0.0)
        losses = np.maximum(-r1, 0.0)
        w_rsi = max(1, min(n, 14))
        avg_gain = np.convolve(gains, np.ones(w_rsi) / w_rsi, mode="same")
        avg_loss = np.convolve(losses, np.ones(w_rsi) / w_rsi, mode="same")
        rs = (avg_gain + 1e-6) / (avg_loss + 1e-6)
        rsi = (100.0 - (100.0 / (1.0 + rs))) / 100.0 - 0.5  # In [-0.5, 0.5]

        # 5. MACD Histogram (Fast EMA 6 vs Slow EMA 16 normalized)
        w_fast = max(1, min(n, 6))
        w_slow = max(1, min(n, 16))
        ema_fast = np.convolve(closes, np.ones(w_fast) / w_fast, mode="same")
        ema_slow = np.convolve(closes, np.ones(w_slow) / w_slow, mode="same")
        macd_line = (ema_fast - ema_slow) / (closes + 1e-6)
        macd_signal = np.convolve(macd_line, np.ones(min(n, 5)) / min(n, 5), mode="same")
        macd_hist = macd_line - macd_signal

        # 6. Bollinger Bands %B: (Close - Lower) / (Upper - Lower) centered at 0
        w_bb = max(2, min(n, 15))
        sma_bb = np.convolve(closes, np.ones(w_bb) / w_bb, mode="same")
        # Rolling standard deviation
        rolling_std = np.zeros(n, dtype=np.float32)
        for i in range(n):
            start_idx = max(0, i - w_bb + 1)
            rolling_std[i] = np.std(closes[start_idx : i + 1])
        bb_upper = sma_bb + 2.0 * rolling_std
        bb_lower = sma_bb - 2.0 * rolling_std
        bb_width = np.maximum(bb_upper - bb_lower, closes * 0.001)
        bb_pct = (closes - bb_lower) / bb_width - 0.5  # Centered at 0

        # 7. Standardized Volume (Z-score)
        v_std = float(np.std(volumes))
        v_mean = float(np.mean(volumes))
        vol_z = (volumes - v_mean) / (v_std if v_std > 1e-3 else 1.0)
        vol_z = np.clip(vol_z, -3.0, 3.0) / 3.0  # Normalized to [-1, 1]

        # 8. Candle Conviction: (Close - Open) / (High - Low + epsilon)
        body = closes - opens
        total_range = np.maximum(highs - lows, closes * 0.0005)
        conviction = body / total_range  # In [-1, 1]

        # 9. Sentiment Score
        sentiment_col = np.full(n, float(np.clip(sentiment, -1.0, 1.0)), dtype=np.float32)

        # Assemble and ensure shape (n, 9)
        features = np.column_stack([
            r1.astype(np.float32),
            r5.astype(np.float32),
            tr_norm.astype(np.float32),
            rsi.astype(np.float32),
            macd_hist.astype(np.float32),
            bb_pct.astype(np.float32),
            vol_z.astype(np.float32),
            conviction.astype(np.float32),
            sentiment_col.astype(np.float32),
        ])

        # Replace any potential NaN / Inf with 0.0
        features = np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)
        return features
