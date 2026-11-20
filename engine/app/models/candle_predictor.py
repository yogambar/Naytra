"""
ML Candlestick Forecasting Adapter.
Re-exports the modular production ML system from `ml_models/`.
Maintains backward compatibility with all existing engine routes, supervisors, and tests.
"""
import sys
import os

# Ensure engine root is on path for ml_models
engine_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if engine_root not in sys.path:
    sys.path.insert(0, engine_root)

from ml_models.predictor import CandlePredictor, predictor, model_health, ModelHealthMetrics
from ml_models.architecture import NaytraHybridForecaster, BaseForecasterModel
from ml_models.features import FeatureExtractor
from ml_models.online_learner import OnlineLearner

__all__ = [
    "CandlePredictor",
    "predictor",
    "model_health",
    "ModelHealthMetrics",
    "NaytraHybridForecaster",
    "BaseForecasterModel",
    "FeatureExtractor",
    "OnlineLearner",
]
