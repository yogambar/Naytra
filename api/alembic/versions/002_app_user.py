"""Migration 002: Create app_user table.

Revision ID: 002_app_user
Revises: 001_baseline
Create Date: 2026-11-15 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "002_app_user"
down_revision: str | None = "001_baseline"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "app_user",
        sa.Column("id", sa.String(length=128), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("dob", sa.Date(), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("city", sa.String(length=128), nullable=True),
        sa.Column("profile_complete", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("email_verified", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("terms_accepted", sa.Boolean(), server_default=sa.false(), nullable=False),
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
    op.create_index("ix_app_user_email", "app_user", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_app_user_email", table_name="app_user")
    op.drop_table("app_user")
