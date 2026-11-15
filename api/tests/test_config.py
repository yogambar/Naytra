"""Tests for app.config – Settings validation."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.config import Settings, get_settings


def test_defaults():
    """Settings with no env vars should use sensible defaults."""
    s = Settings(
        DATABASE_URL="sqlite+aiosqlite://",
        REDIS_URL="redis://localhost:6379/0",
    )
    assert s.DEBUG is True
    assert s.DATA_MODE == "REPLAY"
    assert s.SIGNUP_BONUS_ENABLED is True


def test_custom_values():
    s = Settings(
        DATABASE_URL="postgresql+asyncpg://u:p@host/db",
        REDIS_URL="redis://other:6380/1",
        DEBUG=False,
        DATA_MODE="LIVE",
        SIGNUP_BONUS_MIN_INR=500,
        SIGNUP_BONUS_MAX_INR=5000,
        SIGNUP_BONUS_ENABLED=False,
        APP_VERSION="1.2.3",
    )
    assert s.DATABASE_URL == "postgresql+asyncpg://u:p@host/db"
    assert s.DATA_MODE == "LIVE"
    assert s.SIGNUP_BONUS_MIN_INR == 500
    assert s.APP_VERSION == "1.2.3"


def test_negative_signup_bonus_min_rejected():
    with pytest.raises(ValidationError):
        Settings(
            DATABASE_URL="sqlite+aiosqlite://",
            REDIS_URL="redis://localhost:6379/0",
            SIGNUP_BONUS_MIN_INR=-1,
        )


def test_negative_signup_bonus_max_rejected():
    with pytest.raises(ValidationError):
        Settings(
            DATABASE_URL="sqlite+aiosqlite://",
            REDIS_URL="redis://localhost:6379/0",
            SIGNUP_BONUS_MAX_INR=-100,
        )


def test_get_settings_returns_instance():
    s = get_settings()
    assert isinstance(s, Settings)


def test_extra_fields_ignored():
    """Extra env vars must not crash Settings."""
    s = Settings(
        DATABASE_URL="sqlite+aiosqlite://",
        REDIS_URL="redis://localhost:6379/0",
        TOTALLY_UNKNOWN_VAR="hi",
    )
    assert s.DATABASE_URL == "sqlite+aiosqlite://"


def test_debug_false_string():
    """Pydantic should parse the string 'false' into bool."""
    s = Settings(
        DATABASE_URL="sqlite+aiosqlite://",
        REDIS_URL="redis://localhost:6379/0",
        DEBUG="false",
    )
    assert s.DEBUG is False
