"""Pydantic Settings – validated app configuration."""
from __future__ import annotations

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """All configuration is read from environment variables (or a .env file)."""

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://naytra:naytra_dev@localhost:5432/naytra",
        description="Async SQLAlchemy database URL",
    )

    # Redis
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL",
    )

    # Debug / dev mode
    DEBUG: bool = Field(default=True)

    # Data source mode
    DATA_MODE: str = Field(
        default="REPLAY",
        description="REPLAY for historical data playback, LIVE for real-time",
    )

    # Signup bonus
    SIGNUP_BONUS_MIN_INR: int = Field(default=1000, ge=0)
    SIGNUP_BONUS_MAX_INR: int = Field(default=10000, ge=0)
    SIGNUP_BONUS_ENABLED: bool = Field(default=True)

    # App version
    APP_VERSION: str = Field(default="0.1.0")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


def get_settings() -> Settings:
    """Return a Settings instance (reads env vars on each call)."""
    return Settings()
