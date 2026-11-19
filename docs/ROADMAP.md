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

| Module ID | Module Name | Scope & Technical Implementation | Execution Order |
|---|---|---|---|
| **MOD-01** | **Standalone Chart & Ingestion Engine** | Periodic worker polling live/replay BSE Sensex 30 market feeds, financial RSS, and news sources. Stores raw ticks, computes time-bucketed OHLCV candles (1m, 5m, 15m, 1D), and caches historical charts. | **Step 1 (First)** |
| **MOD-02** | **ML Candle Predictor (Purple Candles)** | Trained time-series forecasting model (ARIMA / LSTM / Transformer hybrid) that projects the remaining candles for today's trading session. Actual candles rendered in Green/Red; predicted future candles tagged as **Purple (`#8A2BE2`)**. Purple candles automatically replaced in real-time as actual market ticks arrive. | **Step 1** |
| **MOD-03** | **LLM Market Reasoning Engine** | Multimodal/LLM synthesis service (Gemini API) that ingests live sentiment, technical indicators (RSI, MACD, Volume), and predicted trajectories to output concise, human-understandable market rationales and confidence ratings. | **Step 1** |
| **MOD-04** | **Backend Daemon & Self-Healing Supervisor** | Process manager configuration (supervisord / systemd / background watcher) ensuring the backend engine stays permanently alive with auto-restart on exit, memory guards, rotating loggers, and automated database backups. | **Step 2** |
| **MOD-05** | **Backend Engineer Ops & Health Console** | Dedicated web dashboard for backend engineers showing: live candle charts with purple forecasts, LLM reasoning feed, live ML model health & inference latency, LLM quota/tokens, API key status, Redis hit rates, and system memory/CPU. | **Step 2** |
| **MOD-06** | **Abstracted API & Cache-Control Gateway** | High-performance FastAPI routing gateway. Client app has zero visibility into internal ML/LLM models or pipelines. Enforces Redis caching headers (`Cache-Control: public, max-age=...`, ETag, stale-while-revalidate) to protect the backend from client overloading. | **Step 3** |
| **MOD-07** | **Interactive Chart Integration in Main App** | Upgrading main web app chart view to render actual Green/Red candles alongside Purple forecast candles with timeline cursor, interval selectors, and LLM reasoning drawer. | **Step 4** |
| **MOD-08** | **Holdings & Portfolio Manager (`/holdings`)** | Real-time position tracking: average buy price, current valuation, unrealized/realized P&L, sector weights, and instant liquidation actions. | **Step 4** |
| **MOD-09** | **Paper Trading & Order Execution Engine (`/orders`)** | Market and limit order ticket with simulated execution, slippage simulation, regulatory fee computation (STT, exchange fees in integer paise), and double-entry ledger balancing. | **Step 4** |
| **MOD-10** | **Dashboard & Activity Hub (`/dashboard`)** | Aggregated view: Net worth tracker, Sensex top gainers/losers ticker, purple prediction preview, and quick-trade actions. | **Step 4** |
| **MOD-11** | **User Profile, Security & Account Management (`/profile`)** | User username (`name + email number string`), mobile/city editing, notification preferences, Capacitor native settings, and GDPR account deletion. | **Step 4** |
| **MOD-12** | **Educational Learning Hub (`/learn`)** | Interactive trading modules, candlestick pattern guides, simulated trading tutorials, and risk disclosure checks. | **Step 4** |

---

## 3. Milestones Status Tracking

- **M0: Foundation** — ✅ Completed (React 18 SPA + FastAPI base)
- **M1: Authentication & User Lifecycle** — ✅ Completed (Firebase Auth + Indian Phone + Trie City + Firestore Initialization + User Tag)
- **M2: Virtual Wallet & Ledger** — ✅ Completed (₹10,000 Signup Bonus + 3D Animation + Double-Entry Ledger)
- **M3: Standalone Forecasting Backend & Ops Console** — 🟡 **In Progress (Active Focus)**
- **M4: Main App Feature Completion & Screen Rollout** — ⚪ Queued (Executes after M3)
- **M5: Native Packaging & Release** — ⚪ Queued
