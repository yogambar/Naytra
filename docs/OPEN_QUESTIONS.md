# Open Questions — Naytra

> These questions require **owner decisions** before the relevant milestone can be completed. Each question is tagged with the milestone it blocks.

---

## Q1: Final Deployment Host for the API

**Blocks:** M7 (Release Preparation)

Where will the FastAPI backend run in production?

| Option | Free Tier | Limits | Notes |
| --- | --- | --- | --- |
| **Render** | Yes | 750 hrs/month, spins down after 15 min inactivity, 512 MB RAM | Cold starts ~30s. Good DX. |
| **Railway** | Yes | \$5 credit/month, sleeps after inactivity | Simple deploy from GitHub. |
| **Fly.io** | Yes | 3 shared VMs, 256 MB each | Requires Dockerfile. Global edge. |
| **Self-hosted (VPS)** | No | — | Full control, but ops burden. |
| **Oracle Cloud Free** | Yes | 1 GB RAM ARM instance, always free | Generous but complex setup. |

**Decision needed:** Choose a host and confirm. This determines the deployment pipeline.

---

## Q2: Source of Replay Market Data

**Blocks:** M3 (Market Data, Replay Engine)

The replay engine needs historical BSE Sensex 30 price data. Options:

| Option | Pros | Cons |
| --- | --- | --- |
| **Synthetic generator** | No licensing issues; works immediately; fully deterministic for testing | Not realistic; less educational value |
| **CSV import of legally held data** | Real market behavior; better learning experience | Must verify legal right to use the data; storage and parsing overhead |
| **BSE API / third-party vendor** | Live data; most realistic | Licensing cost; API rate limits; regulatory questions |

**Decision needed:** Confirm the data source. If CSV, provide the data files and confirm their provenance. See also Q7.

---

## Q3: Backend Hosting Provider

**Blocks:** M7 (Release Preparation)

Related to Q1, but specifically for the **PostgreSQL** and **Redis** production instances:

| Option | PostgreSQL | Redis |
| --- | --- | --- |
| **Render** | 256 MB free, 90-day expiry, then paid | Not available on free tier |
| **Railway** | Included in \$5 credit | Included in \$5 credit |
| **Supabase** | 500 MB free, 2 projects | N/A (use Upstash) |
| **Upstash** | N/A | 10K commands/day free |
| **Neon** | 512 MB free, generous limits | N/A |

**Decision needed:** Choose providers for PostgreSQL and Redis in production.

---

## Q4: Signup Bonus Range and Wording

**Blocks:** M2 (Virtual Wallet)

Current assumption: new users receive a virtual signup bonus between **₹1,000 and ₹10,000**.

Questions:

1. **Confirm the range.** Is ₹1,000–₹10,000 correct?
2. **Fixed or random?** Should every user get the same amount, or a random amount within the range?
3. **Wording.** What should the UI say?
   - "Welcome bonus"
   - "Practice funds"
   - "Virtual starting capital"
   - Something else?

**Decision needed:** Confirm amount, distribution method, and UI copy.

---

## Q5: Privacy Policy and Terms of Service

**Blocks:** M7 (Release Preparation)

Before publishing on the Play Store or any public URL, we need:

1. **Privacy Policy** — what data we collect (email, usage analytics), how it's stored, DPDP Act compliance.
2. **Terms of Service** — no real money, educational purpose, limitation of liability, no investment advice disclaimer.

> **Recommendation:** These documents should undergo **professional legal review**, especially regarding the Digital Personal Data Protection Act (DPDP) 2023 and SEBI guidelines on simulated trading.

**Decision needed:** Engage a lawyer or confirm self-drafted documents are acceptable for initial release.

---

## Q6: Confirm Sensex 30 Stock Universe

**Blocks:** M3 (Market Data)

The app will simulate trading on the **BSE Sensex 30** constituents. The Sensex 30 list changes periodically (rebalanced semi-annually).

Questions:

1. Should we use the **current** Sensex 30 list as of a specific date?
2. Should the list **auto-update** when BSE rebalances, or stay fixed?
3. Are there any stocks the owner wants to **exclude** (e.g., for simplicity)?

**Decision needed:** Provide the definitive stock list or confirm "use the current Sensex 30 as of launch date."

---

## Q7: Market Data Licensing, DPDP Act, and Securities Regulation

**Blocks:** M3 (Market Data), M7 (Release)

Using real BSE market data (even delayed) may require:

1. **BSE data licensing** — BSE charges vendors for redistribution of market data. Does educational / non-commercial use qualify for an exemption?
2. **DPDP Act 2023** — We collect email addresses and usage data. A Data Protection Impact Assessment may be required.
3. **SEBI regulations** — Simulated trading apps may need disclaimers or may fall under advisory regulations. Clarify our position.

**Decision needed:** Consult with a legal advisor on all three points. This may affect M3 data source choices and M7 release readiness.

---

## Q8: Default Simulated Brokerage Charges

**Blocks:** M5 (Paper Trading)

To teach users about real trading costs, we plan to simulate brokerage charges on each trade.

Questions:

1. **Flat fee or percentage-based?** (e.g., ₹20 flat per order like Zerodha, or 0.05% of trade value)
2. **Include STT, GST, SEBI turnover fee, stamp duty?** Or just a simplified "brokerage" line item?
3. **Configurable per user?** Or a fixed system-wide setting?

**Decision needed:** Confirm the brokerage model and rates.

---

## Summary

| # | Question | Blocks | Priority |
| --- | --- | --- | --- |
| Q1 | API deployment host | M7 | Medium |
| Q2 | Replay market data source | M3 | **High** |
| Q3 | Backend hosting (DB + cache) | M7 | Medium |
| Q4 | Signup bonus range and wording | M2 | Medium |
| Q5 | Privacy policy and terms | M7 | Medium |
| Q6 | Sensex 30 stock list | M3 | **High** |
| Q7 | Legal review (data, DPDP, SEBI) | M3, M7 | **High** |
| Q8 | Simulated brokerage charges | M5 | Low |

---

*Last updated: 2026-11-14*
