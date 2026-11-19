"""FastAPI application factory for Naytra."""
from __future__ import annotations

import time
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import Settings, get_settings
from app.database import build_engine, build_session_factory
from app.errors import register_error_handlers
from app.models import Base
from app.routes.auth import router as auth_router, get_me
from app.routes.health import router as health_router
from app.routes.wallet import router as wallet_router
from app.security import SecurityHeadersMiddleware
from app.services.firebase_auth import init_firebase_admin

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle."""
    settings: Settings = app.state.settings
    app.state.start_time = time.time()

    # ── Engine + session factory ────────────────────────────────────────
    try:
        engine = build_engine(settings.DATABASE_URL, echo=False)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        app.state.engine = engine
        app.state.session_factory = build_session_factory(engine)
    except Exception as exc:
        if settings.DEBUG:
            logger.info("Primary database %s offline (%s). Using Firestore-first mode.", settings.DATABASE_URL, exc)
            app.state.engine = None
            app.state.session_factory = None
        else:
            raise

    # ── Redis ───────────────────────────────────────────────────────────
    app.state.redis = aioredis.from_url(
        settings.REDIS_URL, decode_responses=True
    )

    yield

    # ── Teardown ────────────────────────────────────────────────────────
    await app.state.redis.aclose()
    if getattr(app.state, "engine", None):
        await app.state.engine.dispose()


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
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(wallet_router, prefix="/api/v1")
    app.add_api_route("/api/v1/me", get_me, methods=["GET"], tags=["auth"])

    return app


app = create_app()
