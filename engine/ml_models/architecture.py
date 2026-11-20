"""
Naytra ML Candlestick Forecasting - Neural Network Architecture.

Defines:
1. BaseForecasterModel: Abstract base class providing a plug-and-play contract.
   Any future model (Transformer, LightGBM, Chronos, etc.) must implement this interface.
2. TemporalSelfAttention: Scaled dot-product attention over sequence time-steps.
3. NaytraHybridForecaster: Production BiLSTM + Temporal Attention + Multi-Task Heads.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F


class BaseForecasterModel(nn.Module, ABC):
    """
    Abstract interface for all Naytra market forecasting models.
    To replace the default model with a new one in the future:
    1. Subclass BaseForecasterModel.
    2. Implement `forward(x)` and `predict(features)`.
    3. Update `ml_models/predictor.py` to instantiate your new class.
    """

    @abstractmethod
    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Forward pass.
        Args:
            x: Input tensor of shape (batch_size, seq_len, input_dim)
        Returns:
            Tuple of:
            - drift_pred: Normalized future price drift (batch_size, 1) in [-1, +1]
            - vol_pred: Predicted volatility (batch_size, 1) > 0
            - direction_logits: Classification logits (batch_size, 3) [Bullish, Bearish, Neutral]
        """
        pass

    @abstractmethod
    def get_config(self) -> Dict[str, Any]:
        """Returns model hyperparameters and metadata."""
        pass


class TemporalSelfAttention(nn.Module):
    """
    Scaled Dot-Product Temporal Self-Attention layer.
    Allows the model to dynamically weight significant historical candles
    (e.g., support/resistance rejections, volume spikes) over recency bias.
    """
    def __init__(self, hidden_dim: int, num_heads: int = 4, dropout: float = 0.1):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = hidden_dim // num_heads
        assert hidden_dim % num_heads == 0, "hidden_dim must be divisible by num_heads"

        self.q_proj = nn.Linear(hidden_dim, hidden_dim)
        self.k_proj = nn.Linear(hidden_dim, hidden_dim)
        self.v_proj = nn.Linear(hidden_dim, hidden_dim)
        self.out_proj = nn.Linear(hidden_dim, hidden_dim)
        self.dropout = nn.Dropout(dropout)
        self.scale = 1.0 / (self.head_dim ** 0.5)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch_size, seq_len, hidden_dim)
        b, s, d = x.shape
        h = self.num_heads

        q = self.q_proj(x).view(b, s, h, self.head_dim).transpose(1, 2)  # (b, h, s, head_dim)
        k = self.k_proj(x).view(b, s, h, self.head_dim).transpose(1, 2)
        v = self.v_proj(x).view(b, s, h, self.head_dim).transpose(1, 2)

        # Scaled dot-product attention
        scores = torch.matmul(q, k.transpose(-2, -1)) * self.scale  # (b, h, s, s)
        weights = F.softmax(scores, dim=-1)
        weights = self.dropout(weights)

        context = torch.matmul(weights, v)  # (b, h, s, head_dim)
        context = context.transpose(1, 2).contiguous().view(b, s, d)  # (b, s, d)
        return self.out_proj(context)


class NaytraHybridForecaster(BaseForecasterModel):
    """
    Production BiLSTM + Temporal Self-Attention Multi-Task Forecaster.

    Architecture:
    Input (b, seq_len, 9)
      │
      ▼
    BiLSTM Encoder (num_layers=2, bidirectional=True)
      │
      ▼
    LayerNorm & Residual Connection
      │
      ▼
    Temporal Self-Attention (num_heads=4)
      │
      ▼
    Global Average + Max Pooling across time dimension
      │
      ├──► Drift Head (Linear -> GELU -> Linear -> Tanh) -> normalized price return
      ├──► Volatility Head (Linear -> Softplus) -> future candle spread / confidence band width
      └──► Direction Head (Linear -> GELU -> Linear) -> [Bullish, Bearish, Neutral] logits
    """

    def __init__(
        self,
        input_dim: int = 9,
        hidden_dim: int = 64,
        num_layers: int = 2,
        num_heads: int = 4,
        dropout: float = 0.15,
    ):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.num_heads = num_heads
        self.dropout_rate = dropout

        # Input feature projection
        self.input_proj = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
        )

        # Bi-directional LSTM Encoder
        self.lstm = nn.LSTM(
            input_size=hidden_dim,
            hidden_size=hidden_dim // 2,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )

        # Attention layer over LSTM hidden states
        self.layer_norm1 = nn.LayerNorm(hidden_dim)
        self.attention = TemporalSelfAttention(hidden_dim, num_heads=num_heads, dropout=dropout)
        self.layer_norm2 = nn.LayerNorm(hidden_dim)

        # Multi-task prediction heads
        pooled_dim = hidden_dim * 2  # Concat of mean and max pooling

        # 1. Price Drift Head: projects intraday return clamped in [-1.0, +1.0] (scaled in inference)
        self.drift_head = nn.Sequential(
            nn.Linear(pooled_dim, 32),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1),
            nn.Tanh(),
        )

        # 2. Volatility Head: projects candle spread / wick variance > 0
        self.volatility_head = nn.Sequential(
            nn.Linear(pooled_dim, 32),
            nn.GELU(),
            nn.Linear(32, 1),
            nn.Softplus(),
        )

        # 3. Directional Stance Head: classifies market regime [Bullish=0, Bearish=1, Neutral=2]
        self.direction_head = nn.Sequential(
            nn.Linear(pooled_dim, 32),
            nn.GELU(),
            nn.Linear(32, 3),
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        # x: (b, seq_len, input_dim)
        h0 = self.input_proj(x)  # (b, s, hidden_dim)

        # LSTM pass
        lstm_out, _ = self.lstm(h0)  # (b, s, hidden_dim)
        h1 = self.layer_norm1(lstm_out + h0)  # Residual connection

        # Attention pass
        attn_out = self.attention(h1)  # (b, s, hidden_dim)
        h2 = self.layer_norm2(attn_out + h1)

        # Multi-resolution temporal pooling (mean + max across sequence)
        mean_pool = torch.mean(h2, dim=1)  # (b, hidden_dim)
        max_pool, _ = torch.max(h2, dim=1)  # (b, hidden_dim)
        pooled = torch.cat([mean_pool, max_pool], dim=-1)  # (b, pooled_dim)

        # Multi-task heads
        drift = self.drift_head(pooled)  # (b, 1) in [-1, 1]
        vol = self.volatility_head(pooled) + 1e-4  # (b, 1) > 0
        direction = self.direction_head(pooled)  # (b, 3)

        return drift, vol, direction

    def get_config(self) -> Dict[str, Any]:
        return {
            "model_type": "NaytraHybridForecaster",
            "input_dim": self.input_dim,
            "hidden_dim": self.hidden_dim,
            "num_layers": self.num_layers,
            "num_heads": self.num_heads,
            "dropout": self.dropout_rate,
            "parameter_count": sum(p.numel() for p in self.parameters() if p.requires_grad),
        }
