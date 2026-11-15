"""Health / readiness / meta endpoints."""
from __future__ import annotations

import time

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.schemas import SuccessResponse, ErrorResponse, ErrorDetail

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    """Liveness probe – always 200 if the process is running."""
    return SuccessResponse(data={"status": "healthy"}).model_dump()


@router.get("/ready")
async def ready(request: Request) -> JSONResponse:
    """Readiness probe – checks Postgres and Redis connectivity."""
    results: dict[str, str] = {}

    # ── Postgres ────────────────────────────────────────────────────────
    try:
        session_factory = request.app.state.session_factory
        async with session_factory() as session:
            await session.execute(text("SELECT 1"))
        results["postgres"] = "ok"
    except Exception:
        results["postgres"] = "unavailable"

    # ── Redis ───────────────────────────────────────────────────────────
    try:
        redis_client = request.app.state.redis
        await redis_client.ping()
        results["redis"] = "ok"
    except Exception:
        results["redis"] = "unavailable"

    all_ok = all(v == "ok" for v in results.values())
    if all_ok:
        return JSONResponse(
            status_code=200,
            content=SuccessResponse(data=results).model_dump(),
        )

    return JSONResponse(
        status_code=503,
        content=ErrorResponse(
            error=ErrorDetail(
                code="SERVICE_UNAVAILABLE",
                message="One or more dependencies are unavailable",
            )
        ).model_dump(),
    )


@router.get("/meta")
async def meta(request: Request) -> dict:
    """App metadata – version, data mode, uptime."""
    settings = request.app.state.settings
    uptime = time.time() - request.app.state.start_time
    return SuccessResponse(
        data={
            "version": settings.APP_VERSION,
            "data_mode": settings.DATA_MODE,
            "uptime_seconds": round(uptime, 2),
        }
    ).model_dump()
