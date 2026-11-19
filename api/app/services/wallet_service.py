"""Virtual Wallet & Double-Entry Ledger Service.

All monetary values are tracked in integer paise (1 INR = 100 paise).
Every financial event generates paired double-entry ledger rows that sum to 0.
"""
from __future__ import annotations

import logging
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import LedgerEntry, Wallet
from app.schemas import (
    LedgerHistoryData,
    LedgerItemData,
    WalletAuditData,
    WalletData,
)

logger = logging.getLogger(__name__)

# Default virtual signup bonus: ₹10,000 = 1,000,000 paise
DEFAULT_SIGNUP_BONUS_PAISE = 10_000 * 100


async def get_or_create_wallet(
    session: AsyncSession,
    user_id: str,
    bonus_paise: int | None = None,
) -> Wallet:
    """Retrieve an existing wallet or create one with double-entry signup bonus."""
    result = await session.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = result.scalar_one_or_none()

    if wallet is not None:
        return wallet

    settings = get_settings()
    grant_paise = bonus_paise if bonus_paise is not None else (settings.SIGNUP_BONUS_MAX_INR * 100)
    if not settings.SIGNUP_BONUS_ENABLED:
        grant_paise = 0

    wallet = Wallet(
        user_id=user_id,
        balance_paise=grant_paise,
        locked_paise=0,
    )
    session.add(wallet)

    # Double-entry ledger accounting:
    # 1. System Reserve: DEBIT grant_paise (amount_paise = -grant_paise)
    # 2. User Cash: CREDIT grant_paise (amount_paise = +grant_paise)
    # Total transaction sum = 0
    if grant_paise > 0:
        tx_id = f"tx_{uuid4().hex[:12]}"
        system_entry = LedgerEntry(
            id=f"ledg_{uuid4().hex[:12]}",
            tx_id=tx_id,
            user_id=None,
            account_type="SYSTEM_RESERVE",
            type="SIGNUP_BONUS",
            debit_paise=grant_paise,
            credit_paise=0,
            amount_paise=-grant_paise,
            balance_after_paise=0,
            ref_id=None,
            description=f"Virtual signup grant issued to user {user_id}",
        )
        user_entry = LedgerEntry(
            id=f"ledg_{uuid4().hex[:12]}",
            tx_id=tx_id,
            user_id=user_id,
            account_type="USER_CASH",
            type="SIGNUP_BONUS",
            debit_paise=0,
            credit_paise=grant_paise,
            amount_paise=grant_paise,
            balance_after_paise=grant_paise,
            ref_id=None,
            description="Initial Virtual Signup Bonus",
        )
        session.add(system_entry)
        session.add(user_entry)

    await session.commit()
    await session.refresh(wallet)
    logger.info("Initialized virtual wallet for user %s with balance %d paise", user_id, grant_paise)
    return wallet


async def get_wallet_data(session: AsyncSession, user_id: str) -> WalletData:
    """Format and return current wallet balance in integer paise and decimal INR."""
    wallet = await get_or_create_wallet(session, user_id)
    total_cash_paise = wallet.balance_paise + wallet.locked_paise

    settings = get_settings()
    initial_grant_paise = settings.SIGNUP_BONUS_MAX_INR * 100

    return WalletData(
        user_id=wallet.user_id,
        balance_paise=wallet.balance_paise,
        balance_inr=wallet.balance_paise / 100.0,
        locked_paise=wallet.locked_paise,
        locked_inr=wallet.locked_paise / 100.0,
        total_cash_paise=total_cash_paise,
        total_cash_inr=total_cash_paise / 100.0,
        initial_grant_paise=initial_grant_paise,
        initial_grant_inr=initial_grant_paise / 100.0,
        currency="INR",
        is_virtual=True,
    )


async def get_ledger_history(
    session: AsyncSession,
    user_id: str,
    limit: int = 20,
    offset: int = 0,
) -> LedgerHistoryData:
    """Retrieve paginated ledger transactions for a specific user."""
    # Ensure wallet and initial grant exist
    await get_or_create_wallet(session, user_id)

    # Count total
    count_stmt = select(func.count(LedgerEntry.id)).where(LedgerEntry.user_id == user_id)
    total_result = await session.execute(count_stmt)
    total = total_result.scalar() or 0

    # Fetch rows
    stmt = (
        select(LedgerEntry)
        .where(LedgerEntry.user_id == user_id)
        .order_by(LedgerEntry.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    rows = result.scalars().all()

    items = [
        LedgerItemData(
            id=entry.id,
            tx_id=entry.tx_id,
            type=entry.type,
            description=entry.description,
            debit_paise=entry.debit_paise,
            credit_paise=entry.credit_paise,
            amount_paise=entry.amount_paise,
            amount_inr=entry.amount_paise / 100.0,
            balance_after_paise=entry.balance_after_paise,
            balance_after_inr=entry.balance_after_paise / 100.0,
            is_credit=entry.credit_paise > 0,
            ref_id=entry.ref_id,
            created_at=entry.created_at.isoformat() if entry.created_at else "",
        )
        for entry in rows
    ]

    return LedgerHistoryData(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


async def audit_ledger_integrity(session: AsyncSession) -> WalletAuditData:
    """Verify that all double-entry ledger rows globally sum to zero."""
    stmt = select(
        func.coalesce(func.sum(LedgerEntry.amount_paise), 0),
        func.count(LedgerEntry.id),
    )
    res = await session.execute(stmt)
    sum_paise, total_count = res.one()

    is_balanced = sum_paise == 0
    return WalletAuditData(
        is_balanced=is_balanced,
        system_sum_paise=sum_paise,
        total_entries=total_count,
        message="Double-entry ledger is perfectly balanced (zero-sum invariant holds)."
        if is_balanced
        else f"Double-entry ledger discrepancy detected: sum is {sum_paise} paise",
    )
