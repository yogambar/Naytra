# Third-Party Dependencies — Naytra

> This document tracks all third-party libraries, frameworks, and services used in Naytra. Review before adding new dependencies.

---

## Web (React SPA)

| Name | URL | Version | Licence | Used for | Changes |
| --- | --- | --- | --- | --- | --- |
| React | https://react.dev | ^19.0.0 | MIT | UI component library | — |
| React DOM | https://react.dev | ^19.0.0 | MIT | DOM rendering for React | — |
| Vite | https://vite.dev | ^6.1.0 | MIT | Build tool, dev server, HMR | — |
| TypeScript | https://www.typescriptlang.org | ^5.7.3 | Apache-2.0 | Type-safe JavaScript | — |
| React Router | https://reactrouter.com | ^7.2.0 | MIT | Client-side SPA routing | — |
| TanStack Query | https://tanstack.com/query | ^5.66.0 | MIT | Server state management, caching, retries | — |
| Tailwind CSS | https://tailwindcss.com | ^4.0.6 | MIT | Utility-first CSS framework (v4 engine) | — |
| Motion | https://motion.dev | ^12.4.3 | MIT | 3D springs, layout animations, gestures | — |
| Three.js | https://threejs.org | ^0.173.0 | MIT | WebGL 3D rendering | — |
| @react-three/fiber | https://github.com/pmndrs/react-three-fiber | ^8.18.0 | MIT | React renderer for Three.js | — |
| @react-three/drei | https://github.com/pmndrs/drei | ^9.121.4 | MIT | Useful helpers for React Three Fiber | — |
| detect-gpu | https://github.com/TimvanScherpenzeel/detect-gpu | ^5.0.43 | MIT | Hardware GPU tier benchmarking for WebGL | — |
| Radix UI Dialog | https://www.radix-ui.com/primitives/docs/components/dialog | ^1.1.6 | MIT | Accessible modal & bottom sheet primitive | — |
| Radix UI Tabs | https://www.radix-ui.com/primitives/docs/components/tabs | ^1.1.3 | MIT | Accessible sliding pill tabs primitive | — |
| Lucide React | https://lucide.dev | ^0.475.0 | ISC | UI icons | — |
| Firebase JS SDK | https://firebase.google.com | ^10.x | Apache-2.0 | Firebase Auth client | Only `firebase/auth` module used |
| Bricolage Grotesque | https://github.com/nichelaboratory/Bricolage-Grotesque | — | SIL OFL 1.1 | Heading font | Self-hosted, subset to Latin |
| IBM Plex Sans | https://github.com/IBM/plex | — | SIL OFL 1.1 | Body font | Self-hosted, subset to Latin |
| IBM Plex Mono | https://github.com/IBM/plex | — | SIL OFL 1.1 | Monospace font (prices, code) | Self-hosted, subset to Latin |

### Dev Dependencies (Web)

| Name | URL | Version | Licence | Used for | Changes |
| --- | --- | --- | --- | --- | --- |
| Vitest | https://vitest.dev | ^3.0.5 | MIT | Unit / component testing | — |
| React Testing Library | https://testing-library.com/react | ^16.2.0 | MIT | React component test utilities | — |
| Playwright | https://playwright.dev | ^1.50.1 | Apache-2.0 | Visual QA & multi-viewport screenshots | — |
| Axe Core Playwright | https://github.com/dequelabs/axe-core-npm | ^4.10.1 | MPL-2.0 | Automated WCAG accessibility engine | — |
| ESLint | https://eslint.org | ^8.x | MIT | Linting | — |
| Prettier | https://prettier.io | ^3.x | MIT | Code formatting | — |
| @vitejs/plugin-react | https://github.com/vitejs/vite-plugin-react | ^4.x | MIT | Vite React plugin (JSX, Fast Refresh) | — |

---

## API (FastAPI)

| Name | URL | Version | Licence | Used for | Changes |
| --- | --- | --- | --- | --- | --- |
| FastAPI | https://fastapi.tiangolo.com | ^0.110.x | MIT | Web framework, REST API | — |
| Uvicorn | https://www.uvicorn.org | ^0.29.x | BSD-3-Clause | ASGI server | — |
| Pydantic | https://docs.pydantic.dev | ^2.x | MIT | Data validation, settings, serialization | — |
| SQLAlchemy | https://www.sqlalchemy.org | ^2.0.x | MIT | ORM, database access | Async mode via `asyncpg` |
| Alembic | https://alembic.sqlalchemy.org | ^1.13.x | MIT | Database migrations | — |
| asyncpg | https://github.com/MagicStack/asyncpg | ^0.29.x | Apache-2.0 | Async PostgreSQL driver | — |
| redis-py | https://github.com/redis/redis-py | ^5.x | MIT | Redis client | Async mode |
| firebase-admin | https://firebase.google.com/docs/admin/setup | ^6.x | Apache-2.0 | Firebase Auth token verification | — |
| python-dotenv | https://github.com/theskumar/python-dotenv | ^1.x | BSD-3-Clause | Load `.env` files | — |
| structlog | https://www.structlog.org | ^24.x | Apache-2.0 | Structured JSON logging | — |

### Dev Dependencies (API)

| Name | URL | Version | Licence | Used for | Changes |
| --- | --- | --- | --- | --- | --- |
| pytest | https://docs.pytest.org | ^8.x | MIT | Test framework | — |
| pytest-asyncio | https://github.com/pytest-dev/pytest-asyncio | ^0.23.x | Apache-2.0 | Async test support | — |
| httpx | https://www.python-httpx.org | ^0.27.x | BSD-3-Clause | Async test client for FastAPI | — |
| ruff | https://docs.astral.sh/ruff | ^0.4.x | MIT | Linting + formatting | — |
| coverage | https://coverage.readthedocs.io | ^7.x | Apache-2.0 | Code coverage | — |

---

## Infrastructure

| Name | URL | Version | Licence | Used for | Changes |
| --- | --- | --- | --- | --- | --- |
| PostgreSQL | https://www.postgresql.org | 16.x | PostgreSQL License | Relational database | Docker image |
| Redis | https://redis.io | 7.x | RSALv2 / SSPLv1 (server); MIT (client) | Cache, rate limiting, pub-sub | Docker image |
| Docker | https://www.docker.com | Latest | Apache-2.0 (Engine) | Container runtime | — |
| Docker Compose | https://docs.docker.com/compose | v2.x | Apache-2.0 | Multi-container orchestration | — |

---

## Mobile

| Name | URL | Version | Licence | Used for | Changes |
| --- | --- | --- | --- | --- | --- |
| Capacitor | https://capacitorjs.com | ^5.x | MIT | Native Android wrapper for web SPA | — |
| @capacitor/core | https://capacitorjs.com | ^5.x | MIT | Capacitor core runtime | — |
| @capacitor/android | https://capacitorjs.com | ^5.x | MIT | Android platform plugin | — |

---

## Services

| Name | URL | Plan | Used for | Cost |
| --- | --- | --- | --- | --- |
| Firebase Auth | https://firebase.google.com/products/auth | Spark (free) | User authentication | \$0 |
| Firebase Hosting | https://firebase.google.com/products/hosting | Spark (free) | Static SPA hosting | \$0 |

---

## Licence Summary

| Licence | Count | Notes |
| --- | --- | --- |
| MIT | ~20 | Most common; permissive |
| Apache-2.0 | ~6 | Permissive; requires NOTICE preservation |
| BSD-3-Clause | ~3 | Permissive |
| SIL OFL 1.1 | 3 | Font-specific; allows free use and redistribution |
| PostgreSQL License | 1 | Permissive; BSD-like |
| RSALv2 / SSPLv1 | 1 | Redis server licence — we use the official Docker image, not modifying or distributing the server |

> ⚠️ No GPL, AGPL, or SSPL dependencies are used in the application code. The Redis server licence (RSALv2/SSPLv1) applies to the server binary, not the client library (MIT).

---

## Adding a New Dependency

Before adding a new dependency:

1. **Check the licence** — MIT, Apache-2.0, and BSD are preferred. GPL/AGPL require discussion.
2. **Check maintenance status** — last commit, open issues, bus factor.
3. **Evaluate bundle impact** (web) — use `npx vite-bundle-visualizer` to check size.
4. **Add to this table** with all fields filled in.
5. **Pin the version** in `package.json` / `requirements.txt`.

---

## Android (Capacitor Native)

| Name | URL | Version | Licence | Used for | Changes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| @capacitor/core | https://capacitorjs.com | ^8.1.2 | MIT | Capacitor cross-platform runtime | — |
| @capacitor/cli | https://capacitorjs.com | ^8.1.2 | MIT | Capacitor native CLI & tooling | — |
| @capacitor/android | https://capacitorjs.com | ^8.1.2 | MIT | Android native runtime layer | — |
| @capacitor/haptics | https://capacitorjs.com | ^8.0.2 | MIT | Native tactile feedback / haptic ticks | — |
| @capacitor/status-bar | https://capacitorjs.com | ^8.0.4 | MIT | Native status bar styling & theme sync | — |
| @capacitor/splash-screen | https://capacitorjs.com | ^8.0.2 | MIT | Native splash screen management | — |
| @capacitor/app | https://capacitorjs.com | ^8.1.2 | MIT | Hardware back button & app lifecycle | — |
| @capacitor-firebase/authentication | https://github.com/capawesome-team/capacitor-firebase | ^8.0.0 | MIT | Native Google sign-in on Android | — |

---

*Last updated: 2026-11-15*
