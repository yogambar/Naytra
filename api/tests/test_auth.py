"""Tests for Firebase Authentication, user synchronization, and profile completion."""
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(client: AsyncClient):
    """GET /api/v1/me without token returns 401."""
    resp = await client.get("/api/v1/me")
    assert resp.status_code == 401
    data = resp.json()
    assert data["ok"] is False
    assert "Missing Authorization header" in data["error"]["message"]


@pytest.mark.asyncio
async def test_invalid_bearer_format(client: AsyncClient):
    """Authorization header with wrong format returns 401."""
    resp = await client.get("/api/v1/me", headers={"Authorization": "Basic 12345"})
    assert resp.status_code == 401
    data = resp.json()
    assert data["ok"] is False


@pytest.mark.asyncio
async def test_mock_token_creates_and_returns_user(client: AsyncClient):
    """A valid token automatically creates the user record if it doesn't exist."""
    token = "mock-token:uid_test_1:trader1@example.com:true"
    resp = await client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    data = body["data"]
    assert data["id"] == "uid_test_1"
    assert data["email"] == "trader1@example.com"
    assert data["email_verified"] is True
    assert data["profile_complete"] is False


@pytest.mark.asyncio
async def test_complete_profile_success(client: AsyncClient):
    """Complete profile with valid 18+ birthdate sets profile_complete=True."""
    token = "mock-token:uid_adult_1:adult@example.com:true"
    # First access creates record
    await client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})

    payload = {
        "name": "Jane Trader",
        "dob": "1998-05-15",  # Over 18
        "phone": "+919876543210",
        "city": "Mumbai",
        "terms_accepted": True,
    }
    resp = await client.post(
        "/api/v1/auth/complete-profile",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["profile_complete"] is True
    assert data["name"] == "Jane Trader"
    assert data["city"] == "Mumbai"
    assert data["dob"] == "1998-05-15"
    assert data["terms_accepted"] is True
    assert data["bonus_claimed"] is False

    # Now claim bonus
    claim_resp = await client.post(
        "/api/v1/auth/claim-bonus",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert claim_resp.status_code == 200
    assert claim_resp.json()["data"]["bonus_claimed"] is True


@pytest.mark.asyncio
async def test_complete_profile_rejects_under_18(client: AsyncClient):
    """Minors (< 18) cannot trade: rejected with 400 Bad Request."""
    token = "mock-token:uid_minor_1:minor@example.com:true"
    payload = {
        "name": "Young Trader",
        "dob": "2015-01-01",  # 11 years old
        "terms_accepted": True,
    }
    resp = await client.post(
        "/api/v1/auth/complete-profile",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400
    data = resp.json()
    assert data["ok"] is False
    assert "at least 18 years old" in data["error"]["message"]


@pytest.mark.asyncio
async def test_complete_profile_rejects_terms_not_accepted(client: AsyncClient):
    """Must accept terms and paper trading disclaimer."""
    token = "mock-token:uid_no_terms:noterms@example.com:true"
    payload = {
        "name": "No Terms",
        "dob": "1995-01-01",
        "terms_accepted": False,
    }
    resp = await client.post(
        "/api/v1/auth/complete-profile",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400
    assert "terms" in resp.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_duplicate_email_conflict(client: AsyncClient):
    """A new UID trying to register with an existing user's email is rejected."""
    token1 = "mock-token:uid_orig:unique@example.com:true"
    await client.get("/api/v1/me", headers={"Authorization": f"Bearer {token1}"})

    # Second user with different UID but same email
    token2 = "mock-token:uid_imposter:unique@example.com:true"
    resp = await client.get("/api/v1/me", headers={"Authorization": f"Bearer {token2}"})
    assert resp.status_code == 409
    assert "already exists" in resp.json()["error"]["message"]


@pytest.mark.asyncio
async def test_complete_profile_rejects_invalid_phone(client: AsyncClient):
    """Rejects phone numbers that do not match standard Indian mobile allocation."""
    token = "mock-token:uid_bad_phone:badphone@example.com:true"
    payload = {
        "name": "Bad Phone",
        "dob": "1995-01-01",
        "phone": "1234567890",  # Starts with 1 (invalid in India)
        "terms_accepted": True,
    }
    resp = await client.post(
        "/api/v1/auth/complete-profile",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400
    assert "valid 10-digit Indian mobile number" in resp.json()["error"]["message"]


@pytest.mark.asyncio
async def test_complete_profile_normalizes_raw_indian_phone(client: AsyncClient):
    """Raw 10-digit Indian phone (e.g. 9876543210) is normalized to +919876543210."""
    token = "mock-token:uid_norm_phone:normphone@example.com:true"
    payload = {
        "name": "Normal Phone",
        "dob": "1995-01-01",
        "phone": "9876543210",
        "city": "Dehradun",
        "terms_accepted": True,
    }
    resp = await client.post(
        "/api/v1/auth/complete-profile",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["phone"] == "+919876543210"
    assert data["city"] == "Dehradun"


@pytest.mark.asyncio
async def test_logout_revokes_tokens(client: AsyncClient):
    """POST /api/v1/auth/logout succeeds."""
    token = "mock-token:uid_logout:logout@example.com:true"
    resp = await client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
