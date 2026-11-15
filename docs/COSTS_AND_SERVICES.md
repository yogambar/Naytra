# Costs and Services — Naytra

---

> **Current total monthly cost: \$0**

Naytra is built entirely on free tiers and open-source tooling during development and initial launch.

---

## Service Inventory

### 1. Firebase Authentication

| Property | Value |
| --- | --- |
| **Plan** | Spark (free) |
| **Provider** | Google Firebase |
| **Project** | `naytra-53238` |
| **Cost** | \$0 |
| **Free tier limits** | 50,000 MAU (monthly active users) for email/password; 50,000 MAU for federated (Google) sign-in; 10 SMS/day for phone auth (not used) |
| **Used for** | User registration, sign-in, ID token issuance |
| **Risk** | No risk at current scale. Revisit if MAU exceeds 50K. |

---

### 2. Firebase Hosting

| Property | Value |
| --- | --- |
| **Plan** | Spark (free) |
| **Provider** | Google Firebase |
| **Cost** | \$0 |
| **Free tier limits** | 10 GB storage, 360 MB/day transfer, custom domain + SSL included |
| **Used for** | Serving the React SPA as static files |
| **Risk** | 360 MB/day is ~3,600 page loads (assuming ~100 KB per load). Sufficient for early users. |

---

### 3. PostgreSQL

| Property | Value |
| --- | --- |
| **Provider** | Local Docker container (official `postgres:16` image) |
| **Cost** | \$0 |
| **Used for** | Persistent data — users, wallet, ledger, orders, portfolio, market snapshots |
| **Production plan** | TBD — see `OPEN_QUESTIONS.md` Q3. Options include Render PostgreSQL (free tier: 256 MB, 90-day expiry), Supabase, or Railway. |

---

### 4. Redis

| Property | Value |
| --- | --- |
| **Provider** | Local Docker container (official `redis:7` image) |
| **Cost** | \$0 |
| **Used for** | Rate limiting, session cache, replay engine pub-sub |
| **Production plan** | TBD — options include Upstash (free tier: 10K commands/day), Redis Cloud (30 MB free), or Railway. |

---

### 5. Android Distribution

| Property | Value |
| --- | --- |
| **Method** | Capacitor wrapping of the web SPA |
| **Cost** | \$0 |
| **Android package** | `com.rgc.naytra` |
| **Play Store fee** | Not yet paid. Google Play Developer registration is a one-time \$25 fee — deferred until release readiness (M7). |
| **Used for** | Native Android shell with WebView |

---

### 6. Fonts

| Property | Value |
| --- | --- |
| **Fonts** | Bricolage Grotesque (headings), IBM Plex Sans (body) |
| **Licence** | SIL Open Font License (OFL) |
| **Hosting** | Self-hosted (bundled in the SPA build) |
| **Cost** | \$0 |
| **Why self-hosted** | Zero external requests, faster LCP, privacy (no Google Fonts tracking), guaranteed availability. |

---

### 7. Development Tools (All Free)

| Tool | Purpose |
| --- | --- |
| Vite | Web dev server + bundler |
| Docker Desktop | Local Postgres + Redis |
| VS Code | IDE (developer choice) |
| Git / GitHub | Version control |

---

## Cost Summary

| Service | Monthly Cost | Notes |
| --- | --- | --- |
| Firebase Auth (Spark) | \$0 | Free up to 50K MAU |
| Firebase Hosting (Spark) | \$0 | Free up to 360 MB/day |
| PostgreSQL (Docker) | \$0 | Local only |
| Redis (Docker) | \$0 | Local only |
| Android (Capacitor) | \$0 | Play Store \$25 one-time deferred |
| Fonts (OFL, self-hosted) | \$0 | — |
| **Total** | **\$0** | |

---

## Future Cost Triggers

The following events would introduce costs:

| Trigger | Estimated Cost | Action |
| --- | --- | --- |
| Firebase MAU > 50K | ~\$0.0055/MAU on Blaze plan | Upgrade Firebase plan |
| Production API hosting | \$0–7/month (Render/Railway free → paid) | Choose host (Q3 in `OPEN_QUESTIONS.md`) |
| Production PostgreSQL | \$0–7/month (managed free tiers) | Choose provider |
| Google Play Store registration | \$25 one-time | Pay when ready to publish |
| Custom domain | ~\$10–15/year | Register domain |
| Market data licensing | TBD | See `OPEN_QUESTIONS.md` Q2, Q7 |

---

*Last updated: 2026-11-14*
