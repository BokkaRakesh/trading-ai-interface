"""
StatementSource — tracks every PDF/CSV statement file that has been uploaded.

Assets created from a statement have a FK pointing back here, giving full
audit trail: which statement originated which asset record.
"""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from .enums import ParseStatus, StatementSourceType

if TYPE_CHECKING:
    from .asset import Asset
    from .user import Household


class StatementSource(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """
    Represents one uploaded financial statement file.

    Each asset that was parsed from this file will carry a FK to this row,
    so you can always trace where a holding came from and re-parse if needed.
    """

    __tablename__ = "statement_sources"

    # ── Ownership ─────────────────────────────────────────────────────────────

    household_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("households.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    uploaded_by: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        doc="User who performed the upload.",
    )

    # ── File metadata ─────────────────────────────────────────────────────────

    file_name: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        doc="Original filename as received from the browser.",
    )
    file_path: Mapped[Optional[str]] = mapped_column(
        String(1024),
        nullable=True,
        doc="Storage path or object-store key (S3/GCS/local).  NULL until stored.",
    )
    file_size_bytes: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    mime_type: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
        doc="e.g. application/pdf, text/csv.",
    )
    checksum_sha256: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        index=True,
        doc="SHA-256 hex digest.  Allows deduplication of identical uploads.",
    )

    # ── Classification ────────────────────────────────────────────────────────

    source_type: Mapped[StatementSourceType] = mapped_column(
        Enum(StatementSourceType, name="statement_source_type"),
        nullable=False,
        doc="Category of this statement (broker, MF, bank FD, etc.).",
    )
    institution_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="Name of the issuing bank / broker / fund house.",
    )

    # ── Period covered by this statement ─────────────────────────────────────

    period_from: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        doc="First date of transactions covered by this statement.",
    )
    period_to: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        doc="Last date of transactions covered by this statement.",
    )

    # ── Parse state ───────────────────────────────────────────────────────────

    parse_status: Mapped[ParseStatus] = mapped_column(
        Enum(ParseStatus, name="parse_status"),
        nullable=False,
        default=ParseStatus.PENDING,
        index=True,
    )
    parsed_at: Mapped[Optional[str]] = mapped_column(
        String(36),     # stored as ISO-8601 string; DateTime variant also fine
        nullable=True,
    )
    transaction_count: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of transactions extracted from this statement.",
    )
    needs_review_count: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of extracted records with low-confidence categorisation.",
    )
    parse_error: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Error message when parse_status = FAILED.",
    )

    # ── Relationships ─────────────────────────────────────────────────────────

    household: Mapped[Household] = relationship(
        "Household",
        back_populates="statements",
    )
    assets: Mapped[List[Asset]] = relationship(
        "Asset",
        back_populates="statement_source",
        doc="All asset records that originated from this statement.",
    )

    def __repr__(self) -> str:
        return (
            f"<StatementSource id={self.id!r} "
            f"file={self.file_name!r} status={self.parse_status.value!r}>"
        )
