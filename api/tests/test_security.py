"""Tests for security headers middleware."""
from __future__ import annotations

import pytest

from app.security import SECURITY_HEADERS


@pytest.mark.asyncio
async def test_x_content_type_options(client):
    resp = await client.get("/health")
    assert resp.headers["X-Content-Type-Options"] == "nosniff"


@pytest.mark.asyncio
async def test_x_frame_options(client):
    resp = await client.get("/health")
    assert resp.headers["X-Frame-Options"] == "DENY"


@pytest.mark.asyncio
async def test_strict_transport_security(client):
    resp = await client.get("/health")
    assert "max-age=" in resp.headers["Strict-Transport-Security"]


@pytest.mark.asyncio
async def test_content_security_policy(client):
    resp = await client.get("/health")
    assert resp.headers["Content-Security-Policy"] == "default-src 'self'"


@pytest.mark.asyncio
async def test_referrer_policy(client):
    resp = await client.get("/health")
    assert resp.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


@pytest.mark.asyncio
async def test_permissions_policy(client):
    resp = await client.get("/health")
    assert "camera=()" in resp.headers["Permissions-Policy"]


@pytest.mark.asyncio
async def test_all_security_headers_present(client):
    """Every header in the SECURITY_HEADERS dict must appear on a normal response."""
    resp = await client.get("/health")
    for header in SECURITY_HEADERS:
        assert header in resp.headers, f"Missing header: {header}"


@pytest.mark.asyncio
async def test_security_headers_on_error_responses(client):
    """Security headers must also appear on 404 / error responses."""
    resp = await client.get("/nonexistent")
    for header in SECURITY_HEADERS:
        assert header in resp.headers, f"Missing header on 404: {header}"
