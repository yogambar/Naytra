"""SQLAlchemy ORM models."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Shared base for all models."""


class AppMetadata(Base):
    __tablename__ = "app_metadata"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    def __repr__(self) -> str:
        return f"<AppMetadata key={self.key!r} value={self.value!r}>"


class AppUser(Base):
    __tablename__ = "app_user"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)  # Firebase UID
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)  # Normalized lowercase
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)  # Date of birth
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    profile_complete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    terms_accepted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<AppUser id={self.id!r} email={self.email!r} complete={self.profile_complete}>"


class Wallet(Base):
    __tablename__ = "wallet"

    user_id: Mapped[str] = mapped_column(
        String(128), ForeignKey("app_user.id", ondelete="CASCADE"), primary_key=True
    )
    balance_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    locked_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Wallet user_id={self.user_id!r} balance_paise={self.balance_paise}>"


class LedgerEntry(Base):
    __tablename__ = "ledger_entry"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tx_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_id: Mapped[str | None] = mapped_column(
        String(128), ForeignKey("app_user.id", ondelete="CASCADE"), nullable=True, index=True
    )
    account_type: Mapped[str] = mapped_column(String(32), nullable=False)  # USER_CASH, SYSTEM_RESERVE, etc.
    type: Mapped[str] = mapped_column(String(32), nullable=False)          # SIGNUP_BONUS, BUY, SELL, etc.
    debit_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    credit_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)  # credit_paise - debit_paise
    balance_after_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    ref_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<LedgerEntry id={self.id!r} tx_id={self.tx_id!r} amount_paise={self.amount_paise}>"

