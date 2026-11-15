"""Tests for /health, /ready, /meta endpoints."""
from __future__ import annotations

import pytest


# ── /health ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_health_returns_200(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["data"]["status"] == "healthy"


@pytest.mark.asyncio
async def test_health_envelope_shape(client):
    body = (await client.get("/health")).json()
    assert set(body.keys()) == {"ok", "data"}
    assert isinstance(body["data"], dict)


@pytest.mark.asyncio
async def test_health_post_not_allowed(client):
    resp = await client.post("/health")
    assert resp.status_code == 405


# ── /ready ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_ready_all_ok(client):
    resp = await client.get("/ready")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["data"]["postgres"] == "ok"
    assert body["data"]["redis"] == "ok"


@pytest.mark.asyncio
async def test_ready_redis_down(client_redis_down):
    resp = await client_redis_down.get("/ready")
    assert resp.status_code == 503
    body = resp.json()
    assert body["ok"] is False
    assert body["error"]["code"] == "SERVICE_UNAVAILABLE"


@pytest.mark.asyncio
async def test_ready_envelope_on_failure(client_redis_down):
    body = (await client_redis_down.get("/ready")).json()
    assert "error" in body
    assert "message" in body["error"]


# ── /meta ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_meta_returns_200(client):
    resp = await client.get("/meta")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True


@pytest.mark.asyncio
async def test_meta_version(client):
    body = (await client.get("/meta")).json()
    assert body["data"]["version"] == "0.1.0-test"


@pytest.mark.asyncio
async def test_meta_data_mode(client):
    body = (await client.get("/meta")).json()
    assert body["data"]["data_mode"] == "REPLAY"


@pytest.mark.asyncio
async def test_meta_uptime_non_negative(client):
    body = (await client.get("/meta")).json()
    assert body["data"]["uptime_seconds"] >= 0


@pytest.mark.asyncio
async def test_meta_post_not_allowed(client):
    resp = await client.post("/meta")
    assert resp.status_code == 405
