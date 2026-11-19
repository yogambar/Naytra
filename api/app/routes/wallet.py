"""Virtual Wallet & Double-Entry Ledger API endpoints."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AppUser
from app.routes.auth import get_current_user
from app.schemas import SuccessResponse
from app.services.wallet_service import (
    audit_ledger_integrity,
    get_ledger_history,
    get_wallet_data,
)

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.get("", response_model=SuccessResponse)
async def get_wallet(
    user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SuccessResponse:
    """Get the current virtual wallet balance and details for the authenticated user."""
    data = await get_wallet_data(db, user.id)
    return SuccessResponse(data=data)


@router.get("/ledger", response_model=SuccessResponse)
async def get_wallet_ledger(
    user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
    offset: Annotated[int, Query(ge=0, description="Pagination offset")] = 0,
) -> SuccessResponse:
    """Get paginated double-entry ledger transactions for the authenticated user."""
    history = await get_ledger_history(db, user.id, limit=limit, offset=offset)
    return SuccessResponse(data=history)


@router.get("/audit", response_model=SuccessResponse)
async def audit_wallet_ledger(
    _: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SuccessResponse:
    """Audit the global double-entry ledger to verify the zero-sum invariant."""
    audit = await audit_ledger_integrity(db)
    return SuccessResponse(data=audit)
