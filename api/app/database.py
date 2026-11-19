"""SQLAlchemy 2 async engine & session factory."""
from __future__ import annotations

from typing import AsyncGenerator
from fastapi import Request
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


def build_engine(database_url: str, **kwargs) -> AsyncEngine:
    """Create an async engine from a URL."""
    return create_async_engine(database_url, **kwargs)


def build_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Return a session factory bound to *engine*."""
    return async_sessionmaker(engine, expire_on_commit=False)


async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency to yield an async database session."""
    session_factory = request.app.state.session_factory
    async with session_factory() as session:
        yield session
