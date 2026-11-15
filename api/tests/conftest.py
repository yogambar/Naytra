"""Shared test fixtures."""
from __future__ import annotations

import time
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import Settings
from app.main import create_app
from app.models import Base


# ── Test settings (SQLite, no real Redis) ──────────────────────────────────

def _test_settings(**overrides) -> Settings:
    defaults = dict(
        DATABASE_URL="sqlite+aiosqlite://",
        REDIS_URL="redis://localhost:6379/0",
        DEBUG=True,
        DATA_MODE="REPLAY",
        SIGNUP_BONUS_MIN_INR=1000,
        SIGNUP_BONUS_MAX_INR=10000,
        SIGNUP_BONUS_ENABLED=True,
        APP_VERSION="0.1.0-test",
    )
    defaults.update(overrides)
    return Settings(**defaults)


@pytest.fixture()
def test_settings():
    return _test_settings()


# ── Async DB engine & session (in-memory SQLite) ──────────────────────────

@pytest.fixture()
async def async_engine():
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture()
async def async_session(async_engine):
    factory = async_sessionmaker(async_engine, expire_on_commit=False)
    async with factory() as session:
        yield session


# ── Fully wired test client ───────────────────────────────────────────────

@pytest.fixture()
async def client(async_engine):
    """HTTPX AsyncClient with mocked Redis and real SQLite."""
    settings = _test_settings()
    app = create_app(settings=settings)

    # Manually wire up state that lifespan normally handles
    app.state.start_time = time.time()
    app.state.engine = async_engine
    app.state.session_factory = async_sessionmaker(
        async_engine, expire_on_commit=False
    )

    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(return_value=True)
    mock_redis.aclose = AsyncMock()
    app.state.redis = mock_redis

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture()
async def client_redis_down(async_engine):
    """Client where Redis.ping() raises an exception."""
    settings = _test_settings()
    app = create_app(settings=settings)

    app.state.start_time = time.time()
    app.state.engine = async_engine
    app.state.session_factory = async_sessionmaker(
        async_engine, expire_on_commit=False
    )

    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(side_effect=ConnectionError("Redis down"))
    mock_redis.aclose = AsyncMock()
    app.state.redis = mock_redis

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
