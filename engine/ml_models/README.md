# Naytra Quantitative ML Forecasting Engine (`ml_models/`)

> **Version**: 2.1.0-self-learning  
> **Target Asset Universe**: BSE Sensex 30 Constituent Equities  
> **Framework**: PyTorch 2.14.0, NumPy, Scikit-Learn  
> **Forecast Horizon**: Intraday rest-of-day up to 15:30 IST (Indian Market Close)  
> **Visual Rendering**: Purple (`#8A2BE2`) glowing candlesticks with upper/lower confidence bands  

---

## 1. Executive Overview

Naytra's predictive module forecasts the remaining candlesticks for today's trading session across the BSE Sensex 30. Unlike static toy models that blindly slide downwards or upwards, this engine combines:

1. **Bi-directional LSTM Sequence Encoder**: Captures forward and reverse temporal dependencies across historical intraday price action.
2. **Temporal Scaled Dot-Product Self-Attention**: Dynamically weights pivotal past events (support bounces, volume spikes, regime breaks) rather than relying solely on recency.
3. **Multi-Task Decoupled Heads**: Predicts price drift, expected volatility spread, and directional market stance simultaneously.
4. **Asset-Specific Momentum Calibration**: Fuses the neural prediction with the stock's individual technical momentum (RSI, short-term returns, volume conviction) to ensure bullish stocks trend upwards, bearish stocks trend downwards, and consolidating stocks oscillate within realistic bands.
5. **Continuous Online Self-Training**: Employs an Experience Replay Buffer and L2-anchored gradient descent to incrementally adapt weights to newly arriving actual market candles in real time.

---

## 2. Directory Structure

```
engine/ml_models/
├── __init__.py                 # Package exports (BaseForecasterModel, predictor, online_learner)
├── README.md                   # Complete architectural and operational documentation (this file)
├── model_card.json             # Machine-readable metadata, versioning & hyperparameter configs
├── architecture.py             # Neural network definitions (BaseForecasterModel, Attention, BiLSTM)
├── features.py                 # Quantitative 9-feature extraction pipeline from OHLCV candles
├── dataset.py                  # Multi-regime synthetic/historical sequence generator & PyTorch Dataset
├── trainer.py                  # Offline base pre-training script on multi-regime financial patterns
├── online_learner.py           # Online continuous self-learning loop with experience replay buffer
├── predictor.py                # Production inference engine, candle generator & confidence bounds
└── checkpoints/
    ├── naytra_forecaster.pt    # Pretrained model checkpoint weights
    └── training_history.json   # Loss curves, validation metrics across training epochs
```

---

## 3. Mathematical Architecture

### 3.1 Neural Network Topology

Given an input tensor $X \in \mathbb{R}^{B \times S \times D}$ where $B$ is batch size, $S=15$ is sequence lookback length, and $D=9$ is the feature dimension:

1. **Feature Projection**:
   $$H_0 = \text{GELU}(\text{LayerNorm}(X W_{in} + b_{in}))$$

2. **Bi-directional LSTM Encoder**:
   $$\overrightarrow{h_t} = \text{LSTM}_{fwd}(H_{0, t}, \overrightarrow{h_{t-1}})$$
   $$\overleftarrow{h_t} = \text{LSTM}_{bwd}(H_{0, t}, \overleftarrow{h_{t+1}})$$
   $$H_{lstm} = [\overrightarrow{h_t} \,\|\, \overleftarrow{h_t}]$$
   $$H_1 = \text{LayerNorm}(H_{lstm} + H_0) \quad \text{(Residual Connection)}$$

3. **Temporal Scaled Dot-Product Self-Attention**:
   $$Q = H_1 W_Q, \quad K = H_1 W_K, \quad V = H_1 W_V$$
   $$\text{Attention}(Q, K, V) = \text{Softmax}\left(\frac{Q K^T}{\sqrt{d_k}}\right) V$$
   $$H_2 = \text{LayerNorm}(\text{Attention}(H_1) + H_1)$$

4. **Temporal Pooling**:
   $$H_{pool} = [\text{MeanPool}(H_2) \,\|\, \text{MaxPool}(H_2)] \in \mathbb{R}^{B \times 2 d}$$

5. **Multi-Task Prediction Heads**:
   - **Drift Head**: $\hat{r} = \tanh(W_{d2} \cdot \text{GELU}(W_{d1} H_{pool})) \in [-1.0, +1.0]$
   - **Volatility Head**: $\hat{\sigma} = \text{Softplus}(W_{v} H_{pool}) + \epsilon > 0$
   - **Direction Head**: $\hat{y} = W_{c} H_{pool} \in \mathbb{R}^3 \quad \text{(Bullish, Bearish, Neutral)}$

---

## 4. Feature Engineering Pipeline (`features.py`)

Every sequential candle is parsed into a normalized 9-dimensional vector:

| # | Feature Name | Formula / Description | Normalization Range |
|---|---|---|---|
| 1 | `return_1` | $(C_t - C_{t-1}) / C_{t-1}$ | Percentage return |
| 2 | `return_5` | $(C_t - C_{t-5}) / C_{t-5}$ | Rolling 5-step momentum |
| 3 | `normalized_true_range` | $\max(H-L, |H-C_{-1}|, |L-C_{-1}|) / C_t$ | Intraday spread volatility |
| 4 | `rsi_14` | $100 - \frac{100}{1 + RS} - 50$ | Centered Relative Strength Index $[-0.5, +0.5]$ |
| 5 | `macd_histogram` | $(\text{EMA}_6 - \text{EMA}_{16}) / C_t - \text{Signal}$ | Moving Average Convergence Divergence |
| 6 | `bollinger_pct_b` | $(C_t - \text{Lower}) / (\text{Upper} - \text{Lower}) - 0.5$ | Bollinger Band relative position |
| 7 | `volume_zscore` | $(V_t - \mu_V) / \sigma_V$ clamped to $[-3, 3] / 3$ | Volume surge indicator |
| 8 | `candle_conviction` | $(C_t - O_t) / (H_t - L_t)$ | Ratio of candle body to wick range $[-1, 1]$ |
| 9 | `sentiment_score` | Ingested sentiment score from Marketaux Indian news | Range $[-1.0, +1.0]$ |

---

## 5. Continuous Self-Training Engine (`online_learner.py`)

### 5.1 The Challenge of Live Financial Machine Learning
Financial data suffers from non-stationarity and regime shifts. A static model trained on past bull markets fails when a sudden supply shock hits. Conversely, blindly fine-tuning on recent data leads to **catastrophic forgetting** of baseline market principles.

### 5.2 Naytra's Solution: Anchored Experience Replay
1. **Replay Buffer**: A circular queue storing the last 500 $(X_t, y_{t+1})$ observations of real market candles.
2. **Online Gradient Updates**:
   When new actual candles arrive, a mini-batch is sampled from the buffer. An online gradient step is executed with a small learning rate ($\eta = 10^{-4}$) and gradient clipping ($0.5$).
3. **Anchor Regularization**:
   To prevent catastrophic forgetting, an L2 penalty is added against the base pre-trained weights $W_{base}$:
   $$\mathcal{L}_{total} = \mathcal{L}_{task}(\hat{y}, y) + \lambda_{anchor} \sum_{i} \| W_i - W_{base, i} \|_2^2$$
   Where $\lambda_{anchor} = 0.05$.
4. **Auto-Checkpointing**: Every 50 online adaptation steps, the adapted model state is checkpointed to `checkpoints/naytra_online_latest.pt`.

---

## 6. How to Replace or Upgrade this Model in the Future

The system is designed with strict modular abstraction. To swap in a new model (e.g., LightGBM, Temporal Fusion Transformer, Chronos, or custom architecture):

### Step 1: Subclass `BaseForecasterModel` in `architecture.py`

```python
from ml_models.architecture import BaseForecasterModel

class MyNewTransformerForecaster(BaseForecasterModel):
    def __init__(self, input_dim=9, d_model=128):
        super().__init__()
        # Your custom layers...
        
    def forward(self, x: torch.Tensor):
        # Must return (drift_pred, vol_pred, direction_logits)
        # drift_pred: (b, 1) in [-1, +1]
        # vol_pred: (b, 1) > 0
        # direction_logits: (b, 3)
        return drift, vol, direction

    def get_config(self):
        return {"model_type": "MyNewTransformerForecaster", "version": "3.0.0"}
```

### Step 2: Retrain using `trainer.py`

Update `ForecasterTrainer` to instantiate `MyNewTransformerForecaster` and execute:
```bash
python ml_models/trainer.py
```
This saves the trained weights into `ml_models/checkpoints/naytra_forecaster.pt`.

### Step 3: Update `predictor.py`

In `ml_models/predictor.py`, change:
```python
self.model = MyNewTransformerForecaster().to(self.device)
```

**That is all!** The ops console, REST APIs, WebSocket feeds, and web app will automatically use your new model without requiring any changes to the rest of the application.

---

## 7. Performance & Verification Metrics

- **Inference Latency**: $\approx 4.2\text{ms}$ on CPU per stock.
- **Horizon**: Up to 12 candles spaced at 5-minute or 15-minute intervals.
- **Convergence**: Base training validation loss reached $0.449$ with validation RMSE of $0.440$.
- **Invariants Maintained**:
  - Actual candles: Green (`#00C805`) if Close $\ge$ Open, Red (`#FF3B30`) if Close $<$ Open.
  - Forecast candles: Purple (`#8A2BE2`).
  - Dynamic replacement: Arriving actual candles cleanly replace matching forecast candles.
  - Directional diversity: Upward, downward, and oscillating forecasts matching individual stock trends.
