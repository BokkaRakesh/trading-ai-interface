"""
PriceHistory — time-series of prices/valuations per asset.
PortfolioSummary — cached aggregation snapshots for fast dashboard queries.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin, new_uuid
from .enums import PriceSource

if TYPE_CHECKING:
    from .asset import Asset
    from .user import Household

_MONEY = Numeric(18, 4)


# ── Price History ─────────────────────────────────────────────────────────────

class PriceHistory(TimestampMixin, Base):
    """
    Historical price / NAV / valuation snapshot per asset per date.

    One row per (asset_id, price_date) — UNIQUE constraint prevents duplicates.
    For market instruments (stocks, ETFs, MF NAVs), rows are inserted by a
    background price-fetch job.  For illiquid assets (real estate, physical
    gold, unlisted bonds), rows are created when the user manually updates
    the current price in the UI.

    Querying the LATEST price:
        SELECT price FROM price_history
        WHERE asset_id = :id
        ORDER BY price_date DESC
        LIMIT 1

    Querying ALL prices for a chart:
        SELECT price_date, price FROM price_history
        WHERE asset_id = :id
        ORDER BY price_date
    """

    __tablename__ = "price_history"

    __table_args__ = (
        UniqueConstraint("asset_id", "price_date", name="uq_price_asset_date"),
        Index("ix_price_history_asset_date", "asset_id", "price_date"),
        Index("ix_price_history_date", "price_date"),
    )

    # ── Primary key ───────────────────────────────────────────────────────────

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_uuid,
    )

    # ── Foreign keys ──────────────────────────────────────────────────────────

    asset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ── Price data ────────────────────────────────────────────────────────────

    price_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        doc="The date this price applies to (market close date or valuation date).",
    )
    price: Mapped[Decimal] = mapped_column(
        _MONEY,
        nullable=False,
        doc=(
            "Price per unit on price_date, in the asset's currency.  "
            "For stocks: closing price per share.  "
            "For MF: NAV.  "
            "For gold: spot price per gram.  "
            "For real estate: estimated current value (total, not per sqft)."
        ),
    )
    source: Mapped[PriceSource] = mapped_column(
        Enum(PriceSource, name="price_source"),
        nullable=False,
        default=PriceSource.MANUAL,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        doc="Optional annotation, e.g. 'Valuation from property agent Apr 2026'.",
    )

    # ── Relationships ─────────────────────────────────────────────────────────

    asset: Mapped[Asset] = relationship(
        "Asset",
        back_populates="price_history",
    )

    def __repr__(self) -> str:
        return (
            f"<PriceHistory asset={self.asset_id!r} "
            f"date={self.price_date!r} price={self.price}>"
        )


# ── Portfolio Summary ─────────────────────────────────────────────────────────

class PortfolioSummary(TimestampMixin, Base):
    """
    Cached daily snapshot of a household's complete portfolio.

    Recomputed by a background job (nightly or on user request) by:
      1. Loading all active assets for the household.
      2. Fetching each asset's latest price from price_history.
      3. Summing and grouping.

    One row per (household_id, summary_date) — UNIQUE constraint ensures
    idempotent upserts.

    JSON field schemas
    ──────────────────
    allocation_by_type:
      {
        "STOCK": {"invested": 120000, "current_value": 145000, "pct": 32.5},
        "MF":    {"invested":  80000, "current_value":  96000, "pct": 21.4},
        ...
      }

    allocation_by_category:
      {
        "EQUITY":      {"invested": 200000, "current_value": 241000, "pct": 53.9},
        "DEBT":        {"invested":  80000, "current_value":  83000, "pct": 18.5},
        "COMMODITY":   {"invested":  40000, "current_value":  48000, "pct": 10.7},
        "REAL_ASSETS": {"invested": 500000, "current_value": 555000, "pct": 16.9}
      }

    top_holdings:
      [
        {"asset_id": "...", "name": "HDFCBANK", "current_value": 85000, "pct": 19.0},
        ...
      ]
    """

    __tablename__ = "portfolio_summaries"

    __table_args__ = (
        UniqueConstraint(
            "household_id", "summary_date", name="uq_portfolio_summary_date"
        ),
        Index("ix_portfolio_summary_household_date", "household_id", "summary_date"),
    )

    # ── Primary key ───────────────────────────────────────────────────────────

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_uuid,
    )

    # ── Scope ─────────────────────────────────────────────────────────────────

    household_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    summary_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        doc="The date this snapshot represents (typically today).",
    )

    # ── Top-line figures ──────────────────────────────────────────────────────

    total_invested: Mapped[Decimal] = mapped_column(
        _MONEY, nullable=False,
        doc="Sum of purchase_value across all active asset lots.",
    )
    total_current_value: Mapped[Decimal] = mapped_column(
        _MONEY, nullable=False,
        doc="Sum of current_value across all active asset lots.",
    )
    total_gain_loss: Mapped[Decimal] = mapped_column(
        _MONEY, nullable=False,
        doc="total_current_value − total_invested.",
    )
    total_roi_percent: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False,
        doc="total_gain_loss / total_invested × 100.",
    )

    # ── Asset count ───────────────────────────────────────────────────────────

    active_asset_count: Mapped[int] = mapped_column(
        Numeric(6, 0), nullable=False,
        doc="Count of active (non-deleted, non-redeemed) asset lots.",
    )

    # ── Allocation breakdowns (JSON) ──────────────────────────────────────────

    allocation_by_type: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        doc="Allocation per AssetType enum value.  See class docstring.",
    )
    allocation_by_category: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        doc="Allocation per BroadCategory (Equity/Debt/Commodity/Real Assets).",
    )
    top_holdings: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True,
        doc="Top 10 holdings by current_value descending.  See class docstring.",
    )

    # ── Metadata ──────────────────────────────────────────────────────────────

    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        doc="Timestamp when this snapshot was computed.",
    )
    price_coverage_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 2), nullable=True,
        doc=(
            "Percentage of assets whose current_price was available on summary_date.  "
            "< 100 means some values are stale."
        ),
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        doc="Any manual annotation, e.g. 'Gold price sourced from MCX at close'.",
    )

    # ── Relationships ─────────────────────────────────────────────────────────

    household: Mapped[Household] = relationship(
        "Household",
        back_populates="portfolio_summaries",
    )

    def __repr__(self) -> str:
        return (
            f"<PortfolioSummary household={self.household_id!r} "
            f"date={self.summary_date!r} "
            f"value={self.total_current_value}>"
        )
