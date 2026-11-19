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
    bonus_claimed: bool = False
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


# ── Virtual Wallet & Double-Entry Ledger Schemas ────────────────────────────

class WalletData(BaseModel):
    user_id: str
    balance_paise: int
    balance_inr: float
    locked_paise: int
    locked_inr: float
    total_cash_paise: int
    total_cash_inr: float
    initial_grant_paise: int
    initial_grant_inr: float
    currency: str = "INR"
    is_virtual: bool = True


class LedgerItemData(BaseModel):
    id: str
    tx_id: str
    type: str
    description: str
    debit_paise: int
    credit_paise: int
    amount_paise: int
    amount_inr: float
    balance_after_paise: int
    balance_after_inr: float
    is_credit: bool
    ref_id: str | None = None
    created_at: str


class LedgerHistoryData(BaseModel):
    items: list[LedgerItemData]
    total: int
    limit: int
    offset: int


class WalletAuditData(BaseModel):
    is_balanced: bool
    system_sum_paise: int
    total_entries: int
    message: str


