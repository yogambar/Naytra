"""Tests for Virtual Wallet & Double-Entry Ledger."""
from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_wallet_unauthenticated_rejected(client):
    """GET /api/v1/wallet without Authorization header should return 401."""
    resp = await client.get("/api/v1/wallet")
    assert resp.status_code == 401
    json_data = resp.json()
    assert json_data["ok"] is False
    assert json_data["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_wallet_get_creates_with_signup_bonus(client):
    """GET /api/v1/wallet should initialize the wallet and credit signup bonus in paise."""
    headers = {"Authorization": "Bearer mock-token:user_wallet_1:wallet1@example.com:true"}
    resp = await client.get("/api/v1/wallet", headers=headers)
    assert resp.status_code == 200
    json_data = resp.json()
    assert json_data["ok"] is True
    data = json_data["data"]

    # Verify integer paise values
    assert data["user_id"] == "user_wallet_1"
    assert data["balance_paise"] == 1_000_000  # ₹10,000
    assert data["balance_inr"] == 10_000.0
    assert data["locked_paise"] == 0
    assert data["total_cash_paise"] == 1_000_000
    assert data["currency"] == "INR"
    assert data["is_virtual"] is True


@pytest.mark.asyncio
async def test_wallet_idempotent_no_duplicate_bonus(client):
    """Subsequent requests should return existing balance without duplicate crediting."""
    headers = {"Authorization": "Bearer mock-token:user_wallet_2:wallet2@example.com:true"}
    resp1 = await client.get("/api/v1/wallet", headers=headers)
    assert resp1.status_code == 200
    bal1 = resp1.json()["data"]["balance_paise"]

    resp2 = await client.get("/api/v1/wallet", headers=headers)
    assert resp2.status_code == 200
    bal2 = resp2.json()["data"]["balance_paise"]
    assert bal1 == bal2 == 1_000_000


@pytest.mark.asyncio
async def test_wallet_ledger_history(client):
    """GET /api/v1/wallet/ledger should list user transactions with double-entry details."""
    headers = {"Authorization": "Bearer mock-token:user_wallet_3:wallet3@example.com:true"}
    # Call wallet first to trigger bonus
    await client.get("/api/v1/wallet", headers=headers)

    resp = await client.get("/api/v1/wallet/ledger", headers=headers)
    assert resp.status_code == 200
    json_data = resp.json()
    assert json_data["ok"] is True
    data = json_data["data"]

    assert data["total"] >= 1
    assert len(data["items"]) >= 1
    item = data["items"][0]
    assert item["type"] == "SIGNUP_BONUS"
    assert item["amount_paise"] == 1_000_000
    assert item["amount_inr"] == 10_000.0
    assert item["is_credit"] is True
    assert item["balance_after_paise"] == 1_000_000
    assert "Signup Bonus" in item["description"]


@pytest.mark.asyncio
async def test_wallet_double_entry_zero_sum_audit(client):
    """Audit endpoint should verify global double-entry zero-sum invariant."""
    headers = {"Authorization": "Bearer mock-token:user_wallet_4:wallet4@example.com:true"}
    await client.get("/api/v1/wallet", headers=headers)

    resp = await client.get("/api/v1/wallet/audit", headers=headers)
    assert resp.status_code == 200
    json_data = resp.json()
    assert json_data["ok"] is True
    audit = json_data["data"]

    assert audit["is_balanced"] is True
    assert audit["system_sum_paise"] == 0
    assert audit["total_entries"] >= 2  # System debit + user credit
