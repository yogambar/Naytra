"""Pydantic response / request schemas."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel


# ── Success envelope ────────────────────────────────────────────────────────

class SuccessResponse(BaseModel):
    ok: bool = True
    data: Any


# ── Error detail ────────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    ok: bool = False
    error: ErrorDetail


# ── Health / Ready / Meta payloads ──────────────────────────────────────────

class HealthData(BaseModel):
    status: str = "healthy"


class ReadyData(BaseModel):
    postgres: str
    redis: str


class MetaData(BaseModel):
    version: str
    data_mode: str
    uptime_seconds: float


# ── Auth & User Schemas ─────────────────────────────────────────────────────

from datetime import date, datetime


class UserProfileData(BaseModel):
    id: str
    email: str
    name: str | None = None
    dob: str | None = None
    phone: str | None = None
    city: str | None = None
    profile_complete: bool = False
    email_verified: bool = False
    terms_accepted: bool = False
    created_at: str | None = None


class CompleteProfileRequest(BaseModel):
    name: str
    dob: date
    phone: str | None = None
    city: str | None = None
    terms_accepted: bool


class CheckPasswordRequest(BaseModel):
    password: str


class CheckPasswordData(BaseModel):
    breached: bool
    count: int
    message: str

