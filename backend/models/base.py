"""
Base declarative class, reusable mixins, and UUID primary key helper.
All models import from here.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _utcnow() -> datetime:
    """Return current UTC time (timezone-aware)."""
    return datetime.now(tz=timezone.utc)


def new_uuid() -> str:
    """Generate a fresh UUID4 string."""
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    """Root declarative base for all ORM models."""
    pass


# ── Mixins ────────────────────────────────────────────────────────────────────

class UUIDPrimaryKeyMixin:
    """Adds a string-encoded UUID primary key named ``id``."""

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_uuid,
        doc="UUID primary key (stored as VARCHAR(36)).",
    )


class TimestampMixin:
    """Adds ``created_at`` and ``updated_at`` columns with automatic population."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Row creation timestamp (UTC).",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Row last-update timestamp (UTC, auto-refreshed on UPDATE).",
    )


class SoftDeleteMixin:
    """Adds a ``deleted_at`` column for soft-delete semantics.

    A non-NULL value indicates the row is logically deleted.
    All queries should filter ``WHERE deleted_at IS NULL`` unless intentionally
    including deleted records.
    """

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        index=True,
        doc="Soft-delete timestamp.  NULL means the row is active.",
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        self.deleted_at = _utcnow()

    def restore(self) -> None:
        self.deleted_at = None
