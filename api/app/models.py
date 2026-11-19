"""SQLAlchemy ORM models."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


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
