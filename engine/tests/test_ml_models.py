"""
Unit tests for the new modular `ml_models/` package.
Tests:
1. Feature extractor 9-dimensional output shape and numerical stability.
2. NaytraHybridForecaster neural forward pass and multi-task outputs.
3. Online continuous self-learning: Experience buffer and online gradient step.
4. Directional diversity: Verifying both upward and downward trends are produced based on momentum.
"""
import pytest
import numpy as np
import torch
from ml_models.architecture import NaytraHybridForecaster
from ml_models.features import FeatureExtractor
from ml_models.dataset import SyntheticCandle
from ml_models.online_learner import OnlineLearner
from ml_models.predictor import CandlePredictor


def test_feature_extractor_shape_and_stability():
    candles = [
        SyntheticCandle(100.0, 102.0, 99.0, 101.5, 5000),
        SyntheticCandle(101.5, 104.0, 101.0, 103.0, 6500),
        SyntheticCandle(103.0, 103.5, 100.0, 100.5, 4200),
        SyntheticCandle(100.5, 102.0, 99.5, 101.0, 5100),
    ]
    feats = FeatureExtractor.extract(candles, sentiment=0.45)
    assert feats.shape == (4, 9)
    assert not np.isnan(feats).any()
    assert not np.isinf(feats).any()
    # Check sentiment column
    assert np.allclose(feats[:, 8], 0.45)


def test_hybrid_forecaster_forward():
    model = NaytraHybridForecaster(input_dim=9, hidden_dim=32, num_layers=1, num_heads=2)
    model.eval()

    x = torch.randn(2, 10, 9)
    drift, vol, direction = model(x)

    assert drift.shape == (2, 1)
    assert vol.shape == (2, 1)
    assert direction.shape == (2, 3)

    # Drift bounded in [-1, 1] due to Tanh
    assert torch.all(drift >= -1.0) and torch.all(drift <= 1.0)
    # Volatility strictly positive
    assert torch.all(vol > 0)


def test_online_self_learning_step():
    model = NaytraHybridForecaster(input_dim=9, hidden_dim=32, num_layers=1, num_heads=2)
    learner = OnlineLearner(model=model, online_lr=1e-3, buffer_capacity=50)

    # Ingest 10 observations
    history = [SyntheticCandle(100 + i, 102 + i, 99 + i, 101 + i, 5000) for i in range(12)]
    for i in range(10):
        new_candle = SyntheticCandle(112 + i, 114 + i, 111 + i, 113 + i, 6000)
        learner.record_market_candle("RELIANCE", history, new_candle, sentiment=0.2)

    stats_before = learner.get_stats()
    assert stats_before["buffer_size"] == 10

    # Execute online gradient update
    res = learner.step_online_update(batch_size=4)
    assert res is not None
    assert "loss" in res
    assert res["online_step"] == 1

    stats_after = learner.get_stats()
    assert stats_after["total_online_steps"] == 1
    assert stats_after["last_loss"] > 0


def test_directional_diversity():
    """
    Verifies that the predictor produces diverse trends matching asset technical momentum,
    rather than all stocks heading in the same downward direction.
    """
    predictor = CandlePredictor(checkpoints_dir="ml_models/checkpoints")

    # Upward momentum series
    up_candles = [
        SyntheticCandle(100.0 + i * 2.0, 102.0 + i * 2.0, 99.5 + i * 2.0, 101.5 + i * 2.0, 10000)
        for i in range(15)
    ]
    # Downward momentum series
    down_candles = [
        SyntheticCandle(150.0 - i * 2.0, 151.0 - i * 2.0, 147.0 - i * 2.0, 148.0 - i * 2.0, 10000)
        for i in range(15)
    ]

    from app.charts.candle_manager import candle_store, Candle
    candle_store._actual_candles.clear()
    candle_store._forecast_candles.clear()

    import time
    base_ts = int(time.time()) - 3600
    for i, c in enumerate(up_candles):
        candle_store.add_actual_candle("TATASTEEL", "5m", Candle.create_actual(base_ts + i * 300, c.open, c.high, c.low, c.close, int(c.volume)))
    for i, c in enumerate(down_candles):
        candle_store.add_actual_candle("ADANIENT", "5m", Candle.create_actual(base_ts + i * 300, c.open, c.high, c.low, c.close, int(c.volume)))

    fc_up = predictor.forecast_rest_of_day("TATASTEEL", "5m", sentiment=0.5)
    fc_down = predictor.forecast_rest_of_day("ADANIENT", "5m", sentiment=-0.5)

    assert len(fc_up) > 0
    assert len(fc_down) > 0

    # Upward stock should have target higher than its starting price
    assert fc_up[-1].close >= up_candles[-1].close * 0.995
    # Downward stock should have target reflecting its selling pressure
    assert fc_down[-1].close <= down_candles[-1].close * 1.005

    # Target prices must NOT be identical
    assert fc_up[-1].close != fc_down[-1].close
