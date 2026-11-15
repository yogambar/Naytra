# Developer Setup — Naytra

---

## 1. Prerequisites

| Tool | Minimum Version | Notes |
| --- | --- | --- |
| **Node.js** | 20 LTS+ | Includes `npm`. Use `nvm` for easy version management. |
| **Python** | 3.11+ | Use `pyenv` or system Python. |
| **Docker Desktop** | Latest stable | Required for PostgreSQL and Redis containers. |
| **Git** | 2.40+ | — |
| **Android Studio** | Latest stable | *Optional* — only needed for the Capacitor Android shell. |

---

## 2. Clone the Repository

```bash
git clone <repo-url> Naytra
cd Naytra
```

---

## 3. Install Dependencies

### 3.1 Web (React SPA)

```bash
cd web
npm install
cd ..
```

### 3.2 API (FastAPI)

```bash
cd api
python -m venv .venv
source .venv/bin/activate   # macOS / Linux
# .venv\Scripts\activate    # Windows

pip install -r requirements.txt
cd ..
```

---

## 4. Infrastructure — Docker Compose

Start PostgreSQL and Redis:

```bash
docker compose up -d
```

This launches:

| Service | Port | Notes |
| --- | --- | --- |
| **PostgreSQL 16** | `5432` | Database `naytra`, user/password from `.env` |
| **Redis 7** | `6379` | No auth by default in dev |

To stop:

```bash
docker compose down        # stop containers
docker compose down -v     # stop + remove volumes (destroys data)
```

---

## 5. Environment Files

Create a `.env` file in the project root (and/or in `api/` and `web/` as needed). A `.env.example` template is provided.

> **Never commit `.env` files.** They are git-ignored.

### All Environment Variables

| Variable | Location | Description |
| --- | --- | --- |
| `DATABASE_URL` | api | PostgreSQL connection string (`postgresql+asyncpg://user:pass@localhost:5432/naytra`) |
| `REDIS_URL` | api | Redis connection string (`redis://localhost:6379/0`) |
| `FIREBASE_PROJECT_ID` | api | Firebase project ID (`naytra-53238`) |
| `FIREBASE_SERVICE_ACCOUNT` | api | Path to the Firebase service account JSON key file |
| `DATA_MODE` | api | Market data mode: `REPLAY`, `DEMO`, or `LIVE` |
| `CORS_ORIGINS` | api | Comma-separated list of allowed origins (`http://localhost:5173`) |
| `SECRET_KEY` | api | Random secret for signing (generate with `openssl rand -hex 32`) |
| `LOG_LEVEL` | api | Logging level: `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `POSTGRES_USER` | docker | PostgreSQL superuser name |
| `POSTGRES_PASSWORD` | docker | PostgreSQL superuser password |
| `POSTGRES_DB` | docker | Database name (`naytra`) |
| `VITE_API_BASE_URL` | web | API base URL for the SPA (`http://localhost:8000`) |
| `VITE_FIREBASE_API_KEY` | web | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | web | Firebase Auth domain (`naytra-53238.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | web | Firebase project ID (`naytra-53238`) |

---

## 6. Running the Dev Servers

### 6.1 API Server

```bash
cd api
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Auto-generated docs at `http://localhost:8000/docs` (Swagger UI).

### 6.2 Web Dev Server

```bash
cd web
npm run dev
```

The SPA will be available at `http://localhost:5173` (Vite default).

### 6.3 Running Both Together

You can use two terminal tabs, or add a root-level script/tool (e.g., `concurrently`) to run both in one terminal:

```bash
# Example with concurrently (if configured)
npm run dev:all
```

---

## 7. Database Migrations

We use **Alembic** for schema migrations:

```bash
cd api
source .venv/bin/activate

# Create a new migration
alembic revision --autogenerate -m "describe the change"

# Apply all pending migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

---

## 8. Running Tests

### 8.1 API Tests

```bash
cd api
source .venv/bin/activate
pytest
```

Options:

```bash
pytest -v                    # verbose
pytest --cov=app             # with coverage
pytest -k "test_health"      # run specific tests
```

### 8.2 Web Tests

```bash
cd web
npm test                     # run Vitest
npm run test:coverage        # with coverage
```

### 8.3 Linting

```bash
# Web
cd web
npm run lint

# API
cd api
ruff check .
```

---

## 9. Android Setup (Optional)

The Android project uses **Capacitor** to wrap the web SPA in a native shell.

### 9.1 google-services.json

1. Go to the [Firebase Console](https://console.firebase.google.com/) → Project `naytra-53238`.
2. Navigate to **Project Settings → General → Your apps → Android**.
3. Download `google-services.json`.
4. Place it at `android/app/google-services.json`.

> **This file is git-ignored.** Each developer must download their own copy from the Firebase Console. Never share it via chat, email, or version control.

### 9.2 Build and Run

```bash
# Sync web build to the Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

Then build/run from Android Studio onto an emulator or physical device.

---

## 10. Troubleshooting

| Problem | Solution |
| --- | --- |
| `docker compose up` fails | Make sure Docker Desktop is running. |
| Port 5432 in use | Stop any local PostgreSQL service, or change the port in `docker-compose.yml`. |
| `Module not found` in API | Activate the venv: `source .venv/bin/activate`. |
| Firebase token errors | Ensure `FIREBASE_PROJECT_ID` matches `naytra-53238` and the service account key is valid. |
| `google-services.json` missing | Download from Firebase Console (see §9.1). |

---

*Last updated: 2026-11-14*
