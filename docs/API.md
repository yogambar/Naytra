# API Reference — Naytra

---

## 1. Overview

The Naytra API is a RESTful JSON service built with **FastAPI**. It powers the React SPA and the Android (Capacitor) shell.

| Property | Value |
| --- | --- |
| **Base URL** | `http://localhost:8000` (dev) |
| **API prefix** | `/api/v1/` |
| **Content-Type** | `application/json` |
| **Auth** | Firebase ID token (`Authorization: Bearer <token>`) — enforced from M1 onward |

---

## 2. Versioning

All endpoints are prefixed with `/api/v1/`. When breaking changes are needed, a new version prefix (`/api/v2/`) will be introduced. The previous version will be maintained for at least one milestone cycle before deprecation.

---

## 3. Response Envelope

Every response follows a consistent envelope format:

### Success

```json
{
  "ok": true,
  "data": { ... },
  "error": null
}
```

### Error

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": { ... }
  }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `ok` | `boolean` | `true` if the request succeeded |
| `data` | `object \| array \| null` | Response payload on success; `null` on error |
| `error` | `object \| null` | Error details on failure; `null` on success |
| `error.code` | `string` | Machine-readable error code (see §6) |
| `error.message` | `string` | Human-readable description |
| `error.details` | `object \| null` | Optional additional context (e.g., field-level validation errors) |

---

## 4. Current Endpoints

### 4.1 `GET /api/v1/health`

Lightweight liveness check. Returns immediately — does **not** verify database or Redis connectivity.

**Authentication:** None

**Response `200 OK`:**

```json
{
  "ok": true,
  "data": {
    "status": "healthy"
  },
  "error": null
}
```

---

### 4.2 `GET /api/v1/ready`

Readiness check. Verifies that the API can reach PostgreSQL and Redis.

**Authentication:** None

**Response `200 OK`:**

```json
{
  "ok": true,
  "data": {
    "status": "ready",
    "checks": {
      "postgres": "ok",
      "redis": "ok"
    }
  },
  "error": null
}
```

**Response `503 Service Unavailable`:**

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "NOT_READY",
    "message": "One or more dependencies are unavailable",
    "details": {
      "postgres": "ok",
      "redis": "error"
    }
  }
}
```

---

### 4.3 `GET /api/v1/meta`

Returns application metadata for the frontend (version, supported features, data mode).

**Authentication:** None

**Response `200 OK`:**

```json
{
  "ok": true,
  "data": {
    "app": "naytra",
    "version": "0.1.0",
    "data_mode": "DEMO",
    "firebase_project": "naytra-53238"
  },
  "error": null
}
```

---

## 5. Authentication (M1+)

Starting in **Milestone 1**, all endpoints except `/health`, `/ready`, and `/meta` will require authentication.

### Flow

1. The client signs in via Firebase Auth (email/password or Google).
2. Firebase returns an ID token.
3. The client sends the token on every API request:

   ```
   Authorization: Bearer <firebase-id-token>
   ```

4. FastAPI middleware verifies the token using the Firebase Admin SDK.
5. The verified `uid` is injected into the request context for user-scoped queries.

### Error Responses

| Scenario | HTTP Status | Error Code |
| --- | --- | --- |
| Missing `Authorization` header | `401` | `AUTH_MISSING` |
| Malformed or expired token | `401` | `AUTH_INVALID` |
| Token valid but user disabled | `403` | `AUTH_DISABLED` |

---

## 6. Error Codes

| Code | HTTP Status | Description |
| --- | --- | --- |
| `VALIDATION_ERROR` | `422` | Request body or query params failed validation |
| `NOT_FOUND` | `404` | Requested resource does not exist |
| `AUTH_MISSING` | `401` | No `Authorization` header provided |
| `AUTH_INVALID` | `401` | Token is malformed, expired, or unverifiable |
| `AUTH_DISABLED` | `403` | User account is disabled |
| `FORBIDDEN` | `403` | Authenticated but not authorized for this action |
| `RATE_LIMITED` | `429` | Too many requests — try again later |
| `NOT_READY` | `503` | Server dependencies unavailable |
| `INTERNAL_ERROR` | `500` | Unexpected server error |
| `INSUFFICIENT_FUNDS` | `400` | Wallet balance too low for this trade |
| `MARKET_CLOSED` | `400` | Attempted trade outside simulated market hours |

---

## 7. HTTP Status Code Summary

| Status | Meaning |
| --- | --- |
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request / business rule violation |
| `401` | Unauthenticated |
| `403` | Forbidden |
| `404` | Not found |
| `422` | Validation error |
| `429` | Rate limited |
| `500` | Internal server error |
| `503` | Service unavailable |

---

## 8. Rate Limiting

### Plan

Rate limiting will be enforced via **Redis-backed sliding window counters**.

| Scope | Limit | Window |
| --- | --- | --- |
| **Per-IP (unauthenticated)** | 30 requests | 1 minute |
| **Per-user (authenticated)** | 120 requests | 1 minute |
| **Trade endpoints** | 10 requests | 1 minute |

Rate-limited responses include standard headers:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1700000000
Retry-After: 12
```

---

## 9. Pagination (Future)

List endpoints will support cursor-based pagination:

```
GET /api/v1/orders?cursor=<opaque>&limit=25
```

Response includes:

```json
{
  "ok": true,
  "data": {
    "items": [ ... ],
    "next_cursor": "abc123",
    "has_more": true
  }
}
```

---

## 10. Planned Endpoints (M1–M5)

> These are planned and subject to change. They will be documented in detail as each milestone is implemented.

| Method | Path | Milestone | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | M1 | Create account via Firebase |
| `POST` | `/auth/signin` | M1 | Sign in, return user profile |
| `GET` | `/wallet` | M2 | Get wallet balance |
| `GET` | `/wallet/ledger` | M2 | Transaction history |
| `GET` | `/market/stocks` | M3 | List Sensex 30 stocks |
| `GET` | `/market/stocks/:symbol` | M3 | Stock detail + price history |
| `GET` | `/market/ticker` | M3 | Current prices (SSE or poll) |
| `POST` | `/orders` | M5 | Place a paper trade |
| `GET` | `/orders` | M5 | List user's orders |
| `GET` | `/portfolio` | M5 | Current holdings |
| `GET` | `/dashboard` | M4 | Aggregated dashboard data |

---

*Last updated: 2026-11-14*
