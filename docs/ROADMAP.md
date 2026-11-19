# Roadmap — Naytra

---

## 1. Updated Execution Pipeline

Following the architectural directive, development is strictly ordered into:
1. **Engine Layer**: Standalone Backend Server (Charts, Market/News Ingestion, ML Candle Predictor + LLM Reasoning).
2. **Operations & Observability**: High Availability, Auto-Restart, Monitoring, and the Backend Engineer Ops Console.
3. **Abstraction & Optimization**: Redis caching, load balancing, rate limiting, and client abstraction.
4. **Main App Features**: Complete Holdings, Profile, Learn, Wallet, and Dashboard with purple forecast candles.

```mermaid
flowchart TD
    subgraph Step 1 ["Step 1: Standalone Prediction Backend Engine"]
        S1A["Market & News Ingestion Worker"] --> S1B["Chart Store & Candle Manager"]
        S1B --> S1C["ML Candle Predictor (Purple Candles)"]
        S1C --> S1D["LLM Market Reasoning Engine"]
    end

    subgraph Step 2 ["Step 2: Reliability & Backend Engineer Console"]
        S2A["Always-On Daemon (Auto-restart, Backups)"] --> S2B["Health Probes & Metrics (Model, LLM, API Keys)"]
        S2B --> S2C["Backend Engineer Ops Console UI"]
    end

    subgraph Step 3 ["Step 3: Abstraction & Caching"]
        S3A["Strictly Abstracted API Endpoints"] --> S3B["Redis Layer & Client Stale-While-Revalidate"]
    end

    subgraph Step 4 ["Step 4: Main Naytra App Completion"]
        S4A["Holdings & Paper Trading"]
        S4B["Dashboard with Purple Forecasts"]
        S4C["Wallet & Double-Entry Ledger"]
        S4D["Profile, Settings & Learn Hub"]
    end

    Step 1 --> Step 2
    Step 2 --> Step 3
    Step 3 --> Step 4
```

---

## 2. Updated Modules Matrix

| Module ID | Module Name | Scope & Technical Implementation | Execution Order | Status |
|---|---|---|---|---|
| **MOD-01** | **Standalone Chart & Ingestion Engine** | Periodic worker polling live/replay BSE Sensex 30 market feeds, financial RSS, and news sources. Stores raw ticks, computes time-bucketed OHLCV candles (1m, 5m, 15m, 1D), and caches historical charts. | **Step 1** | ✅ **Completed** |
| **MOD-02** | **ML Candle Predictor (Purple Candles)** | Trained time-series forecasting model (PyTorch LSTM + Scikit-Learn transformers) projecting remaining candles of today's session. Actual candles rendered in Green/Red; predicted future candles tagged as **Purple (`#8A2BE2`)**. Purple candles automatically replaced in real-time as actual ticks arrive. | **Step 1** | ✅ **Completed** |
| **MOD-03** | **LLM Market Reasoning Engine** | Gemini 2.5 Flash service synthesizing sentiment, technical indicators (RSI, MACD, Volume), and predicted trajectories into structured causal rationales, catalysts, and confidence scores. | **Step 1** | ✅ **Completed** |
| **MOD-04** | **Backend Daemon & Self-Healing Supervisor** | Process supervisor daemon (`engine/supervisor.py`) ensuring permanent uptime with auto-restart on exit, memory guards, rotating logs, and automated daily database backups. | **Step 2** | ✅ **Completed** |
| **MOD-05** | **Backend Engineer Ops & Health Console** | Dedicated web dashboard (`/console`) for backend engineers: live candle charts with purple forecasts, LLM reasoning feed, live ML model health & latency, API key status, Redis hit rates, and CPU/RAM. | **Step 2** | ✅ **Completed** |
| **MOD-06** | **Abstracted API & Cache-Control Gateway** | High-performance FastAPI routing gateway (`/api/v1/market/`). Enforces Redis L2 caching headers (`Cache-Control: public, max-age=...`, ETag, stale-while-revalidate) to protect the backend from client overloading. | **Step 3** | ✅ **Completed** |
| **MOD-07** | **Interactive Chart Integration in Main App** | Upgraded main web app chart view (`StockChartModal.tsx`) rendering Green/Red actual candles alongside Purple forecast candles with timeline crosshair, interval selectors, and Gemini reasoning. | **Step 4** | ✅ **Completed** |
| **MOD-08** | **Holdings & Portfolio Manager (`/holdings`)** | Real-time position tracking from Firestore `portfolios/{userId}`: average buy price, current valuation, unrealized/realized P&L in integer paise, and instant liquidation actions. | **Step 4** | ✅ **Completed** |
| **MOD-09** | **Paper Trading & Order Execution Engine** | Order ticket with simulated execution, double-entry ledger balancing in integer paise (`wallets/{userId}/ledger/{txId}`), and persistent order book (`orders/{userId}`). | **Step 4** | ✅ **Completed** |
| **MOD-10** | **Dashboard & Activity Hub (`/dashboard`)** | Aggregated view: Total Net Worth tracker (Cash + Stocks), Sensex top movers ticker with SWR cache, purple prediction preview, and recent executed orders history. | **Step 4** | ✅ **Completed** |
| **MOD-11** | **User Profile, Security & Account Management (`/profile`)** | Formatted username (`@name<email_code>`), phone/city editing, notification preferences, Capacitor native settings, Ops Console shortcut, and GDPR account deletion. | **Step 4** | ✅ **Completed** |
| **MOD-12** | **Educational Learning Hub (`/learn`)** | Interactive trading modules, candlestick pattern guides, ML purple forecast candles explanation, and double-entry ledger tutorials. | **Step 4** | ✅ **Completed** |

---

## 3. Milestones Status Tracking

- **M0: Foundation** — ✅ Completed (React 18 SPA + FastAPI base)
- **M1: Authentication & User Lifecycle** — ✅ Completed (Firebase Auth + Indian Phone + Trie City + Firestore Initialization + User Tag)
- **M2: Virtual Wallet & Ledger** — ✅ Completed (₹10,000 Signup Bonus + 3D Animation + Double-Entry Ledger in Integer Paise)
- **M3: Standalone Forecasting Backend & Ops Console** — ✅ Completed (Twelve Data + Marketaux + PyTorch LSTM + Gemini 2.5 Flash + Supervisor Daemon + Ops Console UI)
- **M4: Main App Feature Completion & Screen Rollout** — ✅ Completed (Holdings, Paper Trading, Dashboard Net Worth, Profile, Learn Academy, SWR Cache)
- **M5: Native Packaging & Release** — 🟡 **Ready for Capacitor Android Build**
