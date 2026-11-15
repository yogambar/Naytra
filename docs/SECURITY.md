# Security — Naytra

---

> **Naytra is a paper-trading simulator. No real money, bank accounts, or brokerage integrations are involved.** Despite this, we treat user data and credentials with production-grade security practices.

---

## 1. Authentication

### Provider

**Firebase Authentication** (project `naytra-53238`)

### Supported Methods

| Method | Status |
| --- | --- |
| Email / Password | Planned (M1) |
| Google Sign-In | Planned (M1) |

### Token Flow

1. Client authenticates with Firebase Auth SDK.
2. Firebase issues a signed **ID token** (JWT).
3. Client sends the token on every API request:
   ```
   Authorization: Bearer <firebase-id-token>
   ```
4. FastAPI middleware verifies the token using the **Firebase Admin SDK**:
   - Validates signature against Google's public keys.
   - Checks `exp` (expiry), `iss` (issuer), `aud` (audience = `naytra-53238`).
   - Extracts the `uid` for user-scoped operations.
5. Tokens are **never stored server-side**. Token refresh is handled entirely by the Firebase SDK on the client.

---

## 2. Authorization

- **User-scoped queries**: Every database query that returns user data filters by the authenticated `uid`. No user can access another user's wallet, orders, or portfolio.
- **No admin panel** exists yet. When added, it will use role-based access control (RBAC) with Firebase custom claims.
- **Principle of least privilege**: API endpoints expose only the data the authenticated user owns.

---

## 3. Data Security

### SQL Injection Prevention

- **All database access goes through SQLAlchemy ORM** with parameterized queries.
- **No raw SQL strings** are concatenated with user input — ever.
- Alembic migrations are code-reviewed before execution.

### Data at Rest

- PostgreSQL runs in a local Docker container during development.
- For production, the hosting provider's encryption-at-rest will apply (see `OPEN_QUESTIONS.md` Q3).

### Data in Transit

- All production traffic will be served over **HTTPS / TLS 1.2+**.
- Local development uses plain HTTP (`localhost` only).

---

## 4. Security Headers

The API and the static hosting layer apply the following headers on every response:

| Header | Value | Purpose |
| --- | --- | --- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.googleapis.com; frame-ancestors 'none';` | Prevent XSS, data exfiltration, clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking (legacy header) |
| `X-XSS-Protection` | `0` | Disabled — CSP is the modern replacement |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Disable unused browser features |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolate browsing context |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevent cross-origin resource loading |
| `Cache-Control` | `no-store` (API responses) | Prevent caching of sensitive data |

---

## 5. Secrets Management

| Rule | Detail |
| --- | --- |
| **Environment variables only** | All secrets are stored in `.env` files. |
| **Git-ignored** | `.env` is in `.gitignore`. A `.env.example` with placeholder keys (no values) is committed. |
| **Never in chat** | Do not paste secrets, API keys, or service account JSON into any chat, issue, or PR. |
| **Firebase service account key** | Downloaded from Firebase Console, stored locally as a JSON file, path set via `FIREBASE_SERVICE_ACCOUNT` env var. Git-ignored. |
| **google-services.json** | Android-specific Firebase config. Downloaded per-developer. Git-ignored at `android/app/google-services.json`. |
| **Rotation** | `SECRET_KEY` and database passwords should be rotated before any production deployment. |

---

## 6. No Real Money

This point bears repeating:

- Naytra uses **virtual currency** (paper money) only.
- There are **no bank integrations**, no payment gateways, no UPI, no real brokerage connections.
- The wallet is a simulated ledger funded by a signup bonus.
- The app is educational — it teaches market concepts without financial risk.

---

## 7. Rate Limiting

Rate limiting protects against abuse and denial-of-service. Implemented via **Redis sliding window counters**.

| Scope | Limit | Window |
| --- | --- | --- |
| Per-IP (unauthenticated) | 30 requests | 1 minute |
| Per-user (authenticated) | 120 requests | 1 minute |
| Trade endpoints | 10 requests | 1 minute |

Exceeded limits return `429 Too Many Requests` with `Retry-After` header.

---

## 8. Input Validation

### Backend (FastAPI / Pydantic)

- All request bodies are validated via **Pydantic models** with strict type coercion.
- Path and query parameters use FastAPI's built-in type validation.
- String fields have maximum length constraints.
- Numeric fields have range constraints (e.g., order quantity ≥ 1).

### Frontend (React)

- Form inputs are validated before submission (client-side UX only — never trusted by the server).
- Zod or equivalent schema validation on API response shapes for type safety.

### General

- **Reject unknown fields**: API models use `model_config = ConfigDict(extra="forbid")`.
- **Sanitize display**: User-generated content (e.g., display name) is escaped on render via React's default JSX escaping.
- **No `eval()` or `dangerouslySetInnerHTML`**: Prohibited patterns.

---

## 9. Dependency Security

- Dependencies are version-pinned in `requirements.txt` (API) and `package-lock.json` (web).
- `npm audit` and `pip audit` will be run in CI (planned).
- Dependabot / Renovate will be configured for automated vulnerability alerts.

---

## 10. Incident Response (Planned)

Since Naytra handles no real money or PII beyond email addresses (via Firebase), the incident response plan is lightweight:

1. **Detect**: Monitor error rates and auth failures.
2. **Contain**: Revoke Firebase service account keys; rotate `SECRET_KEY`.
3. **Notify**: Inform affected users if email addresses were exposed.
4. **Remediate**: Patch the vulnerability, deploy, and document.

---

*Last updated: 2026-11-14*
