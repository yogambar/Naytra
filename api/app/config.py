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

    # Firebase Auth configuration
    FIREBASE_PROJECT_ID: str = Field(
        default="naytra-53238",
        description="Firebase project ID",
    )
    FIREBASE_AUTH_EMULATOR_HOST: str | None = Field(
        default=None,
        description="Optional host:port for Firebase Auth emulator, e.g. 127.0.0.1:9099",
    )
    GOOGLE_APPLICATION_CREDENTIALS: str | None = Field(
        default=None,
        description="Path to service account JSON key file for Firebase Admin",
    )

    # App version
    APP_VERSION: str = Field(default="0.1.0")

    # External APIs & Model Training Keys
    TWELVE_DATA_API_KEY: str | None = Field(default=None)
    MARKETAUX_API_KEY: str | None = Field(default=None)
    GEMINI_API_KEY: str | None = Field(default=None)
    HUGGING_FACE_TOKEN: str | None = Field(default=None)
    ENGINE_URL: str = Field(default="http://127.0.0.1:8001")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


def get_settings() -> Settings:
    """Return a Settings instance (reads env vars on each call)."""
    return Settings()
