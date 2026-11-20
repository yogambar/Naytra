"""
Naytra ML Candlestick Forecasting - Continuous Self-Training & Online Learning Engine.

Enables the model to dynamically learn and self-adapt from streaming live candles
without catastrophic forgetting. Uses an Experience Replay Buffer and
anchored online gradient updates.
"""
import os
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Tuple, Deque
from collections import deque
import numpy as np
import torch
import torch.nn as nn

from ml_models.architecture import NaytraHybridForecaster
from ml_models.features import FeatureExtractor

logger = logging.getLogger("naytra.ml.online")
IST = timezone(timedelta(hours=5, minutes=30))


class OnlineExperience:
    def __init__(self, features: np.ndarray, target_drift: float, target_vol: float, target_dir: int, symbol: str):
        self.features = features  # (seq_len, 9)
        self.target_drift = target_drift  # float
        self.target_vol = target_vol  # float
        self.target_dir = target_dir  # int: 0=bullish, 1=bearish, 2=neutral
        self.symbol = symbol
        self.timestamp = time.time()


class OnlineLearner:
    """
    Continuous Online Adaptation Manager.
    - Collects real market candles into an experience replay buffer.
    - Executes online gradient descent steps during live operation.
    - Regularizes against base weights (Elastic Weight Consolidation / Anchor Loss)
      to maintain long-term generalization while adapting to current market regime.
    """

    def __init__(
        self,
        model: NaytraHybridForecaster,
        checkpoint_dir: str = "ml_models/checkpoints",
        buffer_capacity: int = 500,
        online_lr: float = 1e-4,
        anchor_weight: float = 0.05,
    ):
        self.model = model
        self.checkpoint_dir = checkpoint_dir
        os.makedirs(self.checkpoint_dir, exist_ok=True)
        self.device = next(model.parameters()).device
        self.buffer: Deque[OnlineExperience] = deque(maxlen=buffer_capacity)
        self.anchor_weight = anchor_weight

        # Optimizer for online adaptation (small learning rate for stability)
        self.optimizer = torch.optim.Adam(
            self.model.parameters(),
            lr=online_lr,
            weight_decay=1e-5,
        )

        # Clone baseline parameters for anchor regularization
        self.base_params = {
            name: param.clone().detach()
            for name, param in self.model.named_parameters()
        }

        # Online learning diagnostics
        self.total_online_steps = 0
        self.total_samples_observed = 0
        self.recent_losses: Deque[float] = deque(maxlen=50)
        self.last_adapted_at: Optional[str] = None
        self.last_loss = 0.0

    def record_market_candle(
        self,
        symbol: str,
        historical_candles: list,
        new_actual_candle,
        sentiment: float = 0.0,
    ):
        """
        Ingests a new actual candle, pairs it with historical feature sequence,
        and enqueues the observation into the replay buffer.
        """
        if len(historical_candles) < 8:
            return

        # Feature matrix of historical sequence
        feats = FeatureExtractor.extract(historical_candles[-15:], sentiment=sentiment)
        last_price = historical_candles[-1].close
        new_price = new_actual_candle.close

        # Calculate actual normalized return
        pct = (new_price - last_price) / (last_price + 1e-6)
        target_drift = float(np.clip(pct / 0.015, -1.0, 1.0))
        target_vol = float((new_actual_candle.high - new_actual_candle.low) / (new_price + 1e-6))

        if pct > 0.001:
            target_dir = 0  # Bullish
        elif pct < -0.001:
            target_dir = 1  # Bearish
        else:
            target_dir = 2  # Neutral

        exp = OnlineExperience(
            features=feats,
            target_drift=target_drift,
            target_vol=target_vol,
            target_dir=target_dir,
            symbol=symbol,
        )
        self.buffer.append(exp)
        self.total_samples_observed += 1

    def step_online_update(self, batch_size: int = 16) -> Optional[Dict[str, float]]:
        """
        Performs one incremental online gradient update from the replay buffer.
        """
        if len(self.buffer) < max(8, batch_size // 2):
            return None

        # Sample mini-batch with recency weighting
        indices = np.random.choice(len(self.buffer), size=min(batch_size, len(self.buffer)), replace=False)
        batch = [self.buffer[i] for i in indices]

        seqs = torch.tensor(np.array([b.features for b in batch]), dtype=torch.float32).to(self.device)
        drifts = torch.tensor([[b.target_drift] for b in batch], dtype=torch.float32).to(self.device)
        vols = torch.tensor([[b.target_vol] for b in batch], dtype=torch.float32).to(self.device)
        dirs = torch.tensor([b.target_dir for b in batch], dtype=torch.long).to(self.device)

        self.model.train()
        self.optimizer.zero_grad()

        pred_drift, pred_vol, pred_dir = self.model(seqs)

        # Supervised task loss
        mse = nn.MSELoss()
        ce = nn.CrossEntropyLoss()
        l_drift = mse(pred_drift, drifts)
        l_vol = mse(pred_vol, vols)
        l_dir = ce(pred_dir, dirs)
        task_loss = l_drift + 0.5 * l_vol + 0.3 * l_dir

        # Anchor Regularization: L2 distance from base model to prevent catastrophic forgetting
        anchor_loss = torch.tensor(0.0, device=self.device)
        for name, param in self.model.named_parameters():
            if name in self.base_params:
                anchor_loss += torch.sum((param - self.base_params[name]) ** 2)

        total_loss = task_loss + self.anchor_weight * anchor_loss

        total_loss.backward()
        torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=0.5)
        self.optimizer.step()
        self.model.eval()

        self.total_online_steps += 1
        loss_val = float(total_loss.item())
        self.last_loss = loss_val
        self.recent_losses.append(loss_val)
        self.last_adapted_at = datetime.now(tz=IST).isoformat()

        # Periodically commit adapted checkpoint
        if self.total_online_steps % 50 == 0:
            ckpt_path = os.path.join(self.checkpoint_dir, "naytra_online_latest.pt")
            torch.save(self.model.state_dict(), ckpt_path)
            logger.info("Committed online self-trained checkpoint at step %d", self.total_online_steps)

        return {
            "online_step": self.total_online_steps,
            "loss": round(loss_val, 4),
            "drift_loss": round(float(l_drift.item()), 4),
            "dir_loss": round(float(l_dir.item()), 4),
        }

    def get_stats(self) -> dict:
        avg_loss = float(np.mean(self.recent_losses)) if self.recent_losses else 0.0
        return {
            "total_online_steps": self.total_online_steps,
            "total_samples_observed": self.total_samples_observed,
            "buffer_size": len(self.buffer),
            "avg_recent_loss": round(avg_loss, 4),
            "last_loss": round(self.last_loss, 4),
            "last_adapted_at": self.last_adapted_at,
        }
