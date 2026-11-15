"""Tests for the error envelope."""
from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_404_envelope(client):
    resp = await client.get("/this-does-not-exist")
    assert resp.status_code == 404
    body = resp.json()
    assert body["ok"] is False
    assert body["error"]["code"] == "NOT_FOUND"
    assert isinstance(body["error"]["message"], str)


@pytest.mark.asyncio
async def test_405_envelope(client):
    resp = await client.delete("/health")
    assert resp.status_code == 405
    body = resp.json()
    assert body["ok"] is False
    assert body["error"]["code"] == "METHOD_NOT_ALLOWED"


@pytest.mark.asyncio
async def test_error_has_no_internals(client):
    """The error payload must only contain code + message."""
    body = (await client.get("/nope")).json()
    assert set(body["error"].keys()) == {"code", "message"}


@pytest.mark.asyncio
async def test_error_envelope_keys(client):
    body = (await client.get("/nope")).json()
    assert set(body.keys()) == {"ok", "error"}
