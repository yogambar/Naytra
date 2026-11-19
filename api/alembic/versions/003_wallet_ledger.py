"""Migration 003: Create wallet and ledger_entry tables.

Revision ID: 003_wallet_ledger
Revises: 002_app_user
Create Date: 2026-11-19 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "003_wallet_ledger"
down_revision: str | None = "002_app_user"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ── 1. Create wallet table ──────────────────────────────────────────
    op.create_table(
        "wallet",
        sa.Column("user_id", sa.String(length=128), sa.ForeignKey("app_user.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("balance_paise", sa.BigInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("locked_paise", sa.BigInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # ── 2. Create double-entry ledger_entry table ───────────────────────
    op.create_table(
        "ledger_entry",
        sa.Column("id", sa.String(length=64), primary_key=True, nullable=False),
        sa.Column("tx_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=128), sa.ForeignKey("app_user.id", ondelete="CASCADE"), nullable=True),
        sa.Column("account_type", sa.String(length=32), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("debit_paise", sa.BigInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("credit_paise", sa.BigInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("amount_paise", sa.BigInteger(), nullable=False),
        sa.Column("balance_after_paise", sa.BigInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("ref_id", sa.String(length=128), nullable=True),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_ledger_entry_tx_id", "ledger_entry", ["tx_id"])
    op.create_index("ix_ledger_entry_user_id", "ledger_entry", ["user_id"])
    op.create_index("ix_ledger_entry_created_at", "ledger_entry", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_ledger_entry_created_at", table_name="ledger_entry")
    op.drop_index("ix_ledger_entry_user_id", table_name="ledger_entry")
    op.drop_index("ix_ledger_entry_tx_id", table_name="ledger_entry")
    op.drop_table("ledger_entry")
    op.drop_table("wallet")
