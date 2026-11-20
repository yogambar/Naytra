"""
Naytra ML Candlestick Forecasting - Market Dataset Generator & Loader.

Generates multi-regime historical market data (Bullish, Bearish, Mean-Reverting,
Volatile, Consolidation) for offline pre-training of the hybrid forecaster.
"""
from typing import Tuple, List, Dict
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from ml_models.features import FeatureExtractor


class SyntheticCandle:
    def __init__(self, open_p: float, high_p: float, low_p: float, close_p: float, volume: float):
        self.open = open_p
        self.high = high_p
        self.low = low_p
        self.close = close_p
        self.volume = volume


def generate_market_regime_series(
    num_candles: int = 120,
    regime: str = "bullish",
    base_price: float = 1500.0,
    base_volatility: float = 0.003,
) -> Tuple[List[SyntheticCandle], float, float, int]:
    """
    Simulates a sequence of OHLCV candles representing a specific market regime.
    Returns:
        (candles, future_drift, future_volatility, direction_label)
        direction_label: 0 = Bullish, 1 = Bearish, 2 = Neutral
    """
    if regime == "bullish":
        drift_mean = 0.0008
        direction_label = 0
        sentiment = np.random.uniform(0.2, 0.8)
    elif regime == "bearish":
        drift_mean = -0.0008
        direction_label = 1
        sentiment = np.random.uniform(-0.8, -0.2)
    elif regime == "volatile":
        drift_mean = 0.0
        base_volatility *= 2.2
        direction_label = 2
        sentiment = np.random.uniform(-0.3, 0.3)
    else:  # neutral / consolidation
        drift_mean = 0.0
        base_volatility *= 0.6
        direction_label = 2
        sentiment = 0.0

    curr_price = base_price
    candles = []

    for _ in range(num_candles):
        pct_change = np.random.normal(drift_mean, base_volatility)
        open_p = curr_price
        close_p = max(10.0, open_p * (1.0 + pct_change))
        spread = abs(np.random.normal(0, base_volatility * open_p * 0.8))
        high_p = max(open_p, close_p) + spread
        low_p = max(5.0, min(open_p, close_p) - spread)
        volume = max(100.0, np.random.lognormal(mean=10.0, sigma=0.5))

        candles.append(SyntheticCandle(open_p, high_p, low_p, close_p, volume))
        curr_price = close_p

    # Compute future target over the next 12 candles
    future_pct = (curr_price - candles[-12].close) / candles[-12].close if num_candles >= 12 else 0.0
    future_drift = float(np.clip(future_pct / 0.03, -1.0, 1.0))  # Normalized to [-1, 1]
    future_vol = float(np.std([c.close for c in candles[-12:]]) / curr_price) if num_candles >= 12 else 0.005

    return candles, future_drift, future_vol, direction_label


class MarketSequenceDataset(Dataset):
    """
    PyTorch Dataset providing sliding window sequences and multi-task target labels.
    """
    def __init__(self, sequences: np.ndarray, drifts: np.ndarray, vols: np.ndarray, directions: np.ndarray):
        self.sequences = torch.tensor(sequences, dtype=torch.float32)
        self.drifts = torch.tensor(drifts, dtype=torch.float32).unsqueeze(-1)
        self.vols = torch.tensor(vols, dtype=torch.float32).unsqueeze(-1)
        self.directions = torch.tensor(directions, dtype=torch.long)

    def __len__(self) -> int:
        return len(self.sequences)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        return self.sequences[idx], self.drifts[idx], self.vols[idx], self.directions[idx]


def build_training_dataset(
    num_samples: int = 1200,
    seq_len: int = 15,
) -> MarketSequenceDataset:
    """
    Constructs a balanced multi-regime training dataset.
    """
    regimes = ["bullish", "bearish", "volatile", "neutral"]
    all_seqs = []
    all_drifts = []
    all_vols = []
    all_dirs = []

    samples_per_regime = num_samples // len(regimes)

    for reg in regimes:
        for _ in range(samples_per_regime):
            base_p = float(np.random.choice([800.0, 1200.0, 1500.0, 2400.0, 3200.0, 4200.0]))
            candles, drift, vol, dir_label = generate_market_regime_series(
                num_candles=seq_len + 12,
                regime=reg,
                base_price=base_p,
            )
            # Feature extraction for sequence
            features = FeatureExtractor.extract(candles[:seq_len])
            all_seqs.append(features)
            all_drifts.append(drift)
            all_vols.append(vol)
            all_dirs.append(dir_label)

    seq_arr = np.array(all_seqs, dtype=np.float32)
    drift_arr = np.array(all_drifts, dtype=np.float32)
    vol_arr = np.array(all_vols, dtype=np.float32)
    dir_arr = np.array(all_dirs, dtype=np.int64)

    return MarketSequenceDataset(seq_arr, drift_arr, vol_arr, dir_arr)
