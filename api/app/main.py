"""FastAPI application factory for Naytra."""
from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.database import build_engine, build_session_factory
from app.errors import register_error_handlers
from app.routes.health import router as health_router
from app.security import SecurityHeadersMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle."""
    settings: Settings = app.state.settings
    app.state.start_time = time.time()

    # ── Engine + session factory ────────────────────────────────────────
    engine = build_engine(settings.DATABASE_URL, echo=settings.DEBUG)
    app.state.engine = engine
    app.state.session_factory = build_session_factory(engine)

    # ── Redis ───────────────────────────────────────────────────────────
    app.state.redis = aioredis.from_url(
        settings.REDIS_URL, decode_responses=True
    )

    yield

    # ── Teardown ────────────────────────────────────────────────────────
    await app.state.redis.aclose()
    await engine.dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build and return the configured FastAPI application."""
    if settings is None:
        settings = get_settings()

    app = FastAPI(
        title="Naytra API",
        version=settings.APP_VERSION,
        lifespan=lifespan,
    )

    # Stash settings so lifespan + routes can access them.
    app.state.settings = settings

    # ── Middleware (order matters: last added runs first) ────────────────
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.DEBUG else [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Error handlers ──────────────────────────────────────────────────
    register_error_handlers(app)

    # ── Routes ──────────────────────────────────────────────────────────
    app.include_router(health_router)

    return app
