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
