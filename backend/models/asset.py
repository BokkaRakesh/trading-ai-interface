"""
Asset base table + all 10 asset-specific sub-tables.

Architecture: SQLAlchemy JOINED TABLE INHERITANCE.
─────────────────────────────────────────────────────────────────────────────
  assets                        ← single base row per holding
    └── stock_assets            ← extra columns for stocks
    └── mutual_fund_assets      ← extra columns for MFs / SIPs
    └── etf_assets              ← extra columns for ETFs
    └── reit_assets             ← extra columns for REITs
    └── gold_assets             ← extra columns for gold
    └── silver_assets           ← extra columns for silver
    └── real_estate_assets      ← extra columns for property
    └── bond_assets             ← extra columns for bonds
    └── fd_assets               ← extra columns for fixed deposits
    └── other_assets            ← catch-all (PPF, NSC, crypto, etc.)

Each sub-table PK is also a FK to assets.id.
Querying `Asset` always returns the concrete subtype through polymorphism.
─────────────────────────────────────────────────────────────────────────────

Gain / loss and ROI are NOT stored columns — they are computed at query time
or in application code:
    current_value   = quantity * current_price
    gain_loss       = current_value - purchase_value
    roi_pct         = gain_loss / purchase_value * 100
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from .enums import (
    AssetType,
    BroadCategory,
    CompoundingFrequency,
    CouponFrequency,
    EntryMode,
    ETFType,
    Exchange,
    GoldForm,
    InstitutionType,
    IssuerType,
    OtherAssetSubType,
    PropertyType,
    REITPropertyType,
    SchemeType,
    SIPFrequency,
    SIPStatus,
    SilverForm,
)

if TYPE_CHECKING:
    from .history import PriceHistory
    from .statements import StatementSource
    from .user import Household

# Convenient shorthand for INR-precision decimal columns.
# 18 digits total, 4 decimal places — enough for sub-paisa SIP NAVs.
_MONEY = Numeric(18, 4)


# ── Base Asset ────────────────────────────────────────────────────────────────

class Asset(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """
    One row = one holding (one purchase lot).

    Multiple purchases of the same security are stored as separate rows so
    that cost-basis per lot is preserved for capital-gains calculations.
    """

    __tablename__ = "assets"

    __mapper_args__ = {
        "polymorphic_on": "asset_type",
        "polymorphic_identity": None,
    }

    # ── Discriminator ─────────────────────────────────────────────────────────

    asset_type: Mapped[AssetType] = mapped_column(
        Enum(AssetType, name="asset_type"),
        nullable=False,
        index=True,
    )

    # ── Ownership ─────────────────────────────────────────────────────────────

    household_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("households.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    created_by: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        doc="User who created this record.",
    )

    # ── Entry provenance ──────────────────────────────────────────────────────

    entry_mode: Mapped[EntryMode] = mapped_column(
        Enum(EntryMode, name="entry_mode"),
        nullable=False,
        default=EntryMode.MANUAL,
        doc="STATEMENT = parsed from uploaded file; MANUAL = user typed it in.",
    )
    statement_source_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("statement_sources.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Non-NULL when entry_mode = STATEMENT.",
    )

    # ── Display ───────────────────────────────────────────────────────────────

    asset_name: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        doc="Human-readable name shown in the UI, e.g. 'HDFC Bank — lot 1'.",
    )
    broad_category: Mapped[BroadCategory] = mapped_column(
        Enum(BroadCategory, name="broad_category"),
        nullable=False,
        doc="Used for the Equity / Debt / Commodity / Real Assets pie chart.",
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
        doc="Comma-separated free-form tags for filtering, e.g. 'retirement,tax-saving'.",
    )

    # ── Purchase details ──────────────────────────────────────────────────────

    purchase_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
        doc="Date the asset was acquired / SIP instalment date.",
    )
    quantity: Mapped[Decimal] = mapped_column(
        _MONEY,
        nullable=False,
        doc=(
            "Units / shares / grams / sq-ft depending on asset type.  "
            "Always stored as a positive number."
        ),
    )
    purchase_price: Mapped[Decimal] = mapped_column(
        _MONEY,
        nullable=False,
        doc="Cost per unit at time of purchase (in base_currency).",
    )
    purchase_value: Mapped[Decimal] = mapped_column(
        _MONEY,
        nullable=False,
        doc=(
            "Total acquisition cost including brokerage, stamp duty, etc.  "
            "May differ from quantity × purchase_price."
        ),
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        server_default="INR",
    )

    # ── Current valuation (updated by background jobs or manual entry) ────────

    current_price: Mapped[Optional[Decimal]] = mapped_column(
        _MONEY,
        nullable=True,
        doc="Latest known price per unit.  NULL until first price fetch.",
    )
    current_value: Mapped[Optional[Decimal]] = mapped_column(
        _MONEY,
        nullable=True,
        doc="Cached result of quantity × current_price.  Recomputed on price update.",
    )
    last_price_updated_at: Mapped[Optional[DateTime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="When current_price was last refreshed.",
    )

    # ── Soft-delete alias ─────────────────────────────────────────────────────

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
        doc="False after a holding is fully sold/redeemed but before hard-delete.",
    )

    # ── Relationships ─────────────────────────────────────────────────────────

    household: Mapped[Household] = relationship(
        "Household",
        back_populates="assets",
    )
    statement_source: Mapped[Optional[StatementSource]] = relationship(
        "StatementSource",
        back_populates="assets",
    )
    price_history: Mapped[List[PriceHistory]] = relationship(
        "PriceHistory",
        back_populates="asset",
        cascade="all, delete-orphan",
        order_by="PriceHistory.price_date.desc()",
    )

    # ── Table-level indexes ───────────────────────────────────────────────────

    __table_args__ = (
        Index("ix_assets_household_type", "household_id", "asset_type"),
        Index("ix_assets_household_date", "household_id", "purchase_date"),
    )

    def __repr__(self) -> str:
        return (
            f"<Asset id={self.id!r} type={self.asset_type.value!r} "
            f"name={self.asset_name!r}>"
        )

    # ── Computed properties ───────────────────────────────────────────────────

    @property
    def gain_loss(self) -> Optional[Decimal]:
        """current_value − purchase_value.  None if current_value not set."""
        if self.current_value is None:
            return None
        return self.current_value - self.purchase_value

    @property
    def roi_percent(self) -> Optional[Decimal]:
        """Gain/loss as a percentage of purchase_value."""
        gl = self.gain_loss
        if gl is None or self.purchase_value == 0:
            return None
        return (gl / self.purchase_value) * Decimal("100")


# ── 1 — Stocks ────────────────────────────────────────────────────────────────

class StockAsset(Asset):
    """
    Individual equity share on a recognised exchange.

    Examples: HDFCBANK on NSE, INFY on BSE, MSFT on NASDAQ.
    """

    __tablename__ = "stock_assets"

    __mapper_args__ = {"polymorphic_identity": AssetType.STOCK}

    asset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assets.id", ondelete="CASCADE"),
        primary_key=True,
    )

    isin: Mapped[Optional[str]] = mapped_column(
        String(12),
        nullable=True,
        index=True,
        doc="International Securities Identification Number (12-char alphanumeric).",
    )
    ticker: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        doc="Exchange ticker symbol, e.g. HDFCBANK, INFY.",
    )
    company_name: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )
    exchange: Mapped[Exchange] = mapped_column(
        Enum(Exchange, name="exchange"),
        nullable=False,
        default=Exchange.NSE,
    )
    sector: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
        doc="GICS or custom sector, e.g. 'Banking', 'IT', 'Pharma'.",
    )
    face_value: Mapped[Optional[Decimal]] = mapped_column(
        _MONEY,
        nullable=True,
        doc="Par / face value per share (₹1, ₹2, ₹5, ₹10, etc.).",
    )
    broker_account: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
        doc="Demat account or broker name where this lot is held.",
    )


# ── 2 — Mutual Funds ──────────────────────────────────────────────────────────

class MutualFundAsset(Asset):
    """
    Mutual fund units, including SIP instalments.

    Each SIP instalment on a different NAV date is a separate Asset row so
    that exact purchase NAV per lot is preserved.
    """

    __tablename__ = "mutual_fund_assets"

    __mapper_args__ = {"polymorphic_identity": AssetType.MF}

    asset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assets.id", ondelete="CASCADE"),
        primary_key=True,
    )

    scheme_name: Mapped[str] = mapped_column(String(512), nullable=False)
    scheme_code: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        index=True,
        doc="AMFI scheme code, e.g. '120503'.",
    )
    isin: Mapped[Optional[str]] = mapped_column(
        String(12), nullable=True, index=True,
    )
    fund_house: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True,
        doc="AMC name, e.g. 'HDFC AMC', 'Mirae Asset'.",
    )
    scheme_type: Mapped[SchemeType] = mapped_column(
        Enum(SchemeType, name="scheme_type"),
        nullable=False,
        default=SchemeType.EQUITY,
    )
    folio_number: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True,
        doc="Folio number as printed on the CAMS/KFintech statement.",
    )
    nav_at_purchase: Mapped[Optional[Decimal]] = mapped_column(
        _MONEY, nullable=True,
        doc="NAV on the purchase date (used for cost-basis verification).",
    )

    # SIP details — NULL when this is a lump-sum investment
    sip_status: Mapped[SIPStatus] = mapped_column(
        Enum(SIPStatus, name="sip_status"),
        nullable=False,
        default=SIPStatus.NONE,
    )
    sip_amount: Mapped[Optional[Decimal]] = mapped_column(
        _MONEY, nullable=True,
        doc="Monthly/quarterly instalment amount in INR.",
    )
    sip_frequency: Mapped[Optional[SIPFrequency]] = mapped_column(
        Enum(SIPFrequency, name="sip_frequency"),
        nullable=True,
    )
    sip_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    sip_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    sip_mandate_ref: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True,
        doc="Bank mandate/ECS reference for auto-debit.",
    )


# ── 3 — ETFs ──────────────────────────────────────────────────────────────────

class ETFAsset(Asset):
    """Exchange-traded funds: equity index, gold, silver, debt, international."""

    __tablename__ = "etf_assets"

    __mapper_args__ = {"polymorphic_identity": AssetType.ETF}

    asset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assets.id", ondelete="CASCADE"),
        primary_key=True,
    )

    isin: Mapped[Optional[str]] = mapped_column(String(12), nullable=True, index=True)
    ticker: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True,
        doc="e.g. NIFTYBEES, GOLDBEES, JUNIORBEES, SILVERBEES.",
    )
    exchange: Mapped[Exchange] = mapped_column(
        Enum(Exchange, name="etf_exchange"),
        nullable=False,
        default=Exchange.NSE,
    )
    etf_type: Mapped[ETFType] = mapped_column(
        Enum(ETFType, name="etf_type"),
        nullable=False,
    )
    underlying_index: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True,
        doc="e.g. 'Nifty 50', 'Nifty Next 50', 'Gold Spot Price'.",
    )
    expense_ratio: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True,
        doc="Annual expense ratio as a percentage, e.g. 0.05 = 0.05%.",
    )
    fund_house: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


# ── 4 — REITs ─────────────────────────────────────────────────────────────────

class REITAsset(Asset):
    """Real Estate Investment Trusts listed on NSE/BSE."""

    __tablename__ = "reit_assets"

    __mapper_args__ = {"polymorphic_identity": AssetType.REIT}

    asset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assets.id", ondelete="CASCADE"),
        primary_key=True,
    )

    reit_name: Mapped[str] = mapped_column(String(255), nullable=False)
    isin: Mapped[Optional[str]] = mapped_column(String(12), nullable=True, index=True)
    ticker: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    exchange: Mapped[Exchange] = mapped_column(
        Enum(Exchange, name="reit_exchange"),
        nullable=False,
        default=Exchange.NSE,
    )
    nav_at_purchase: Mapped[Optional[Decimal]] = mapped_column(_MONEY, nullable=True)
    dividend_yield: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True,
        doc="Trailing annual dividend yield as a percentage.",
    )
    property_type: Mapped[REITPropertyType] = mapped_column(
        Enum(REITPropertyType, name="reit_property_type"),
        nullable=False,
        default=REITPropertyType.OFFICE,
    )


# ── 5 — Gold ──────────────────────────────────────────────────────────────────

class GoldAsset(Asset):
    """
    Any gold holding: physical jewellery/bars/coins, digital gold,
    Sovereign Gold Bonds, or gold ETFs.
    """

    __tablename__ = "gold_assets"

    __mapper_args__ = {"polymorphic_identity": AssetType.GOLD}

    asset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assets.id", ondelete="CASCADE"),
        primary_key=True,
    )

    form: Mapped[GoldForm] = mapped_column(
        Enum(GoldForm, name="gold_form"),
        nullable=False,
    )
    # Physical / digital gold fields
    weight_grams: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 4), nullable=True,
        doc="Weight in grams.  Required for PHYSICAL and DIGITAL forms.",
    )
    purity_karat: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True,
        doc="Karat value: 24, 22, 18, 14.  NULL for ETF/SGB.",
    )
    purity_percent: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True,
        doc="Purity as percentage fine gold, e.g. 91.67 for 22K.",
    )
    hallmarked: Mapped[Optional[bool]] = mapped_column(
        Boolean, nullable=True,
        doc="True if BIS-hallmarked.  Relevant only for PHYSICAL.",
    )
    # Digital gold
    custodian: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True,
        doc="Custodian for digital gold: MMTC-PAMP, Augmont, SafeGold.",
    )
    # SGB-specific
    sgb_series: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True,
        doc="Issue series, e.g. 'SGB 2023-24 Series I'.",
    )
    sgb_isin: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    sgb_coupon_rate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True,
        doc="Semi-annual interest rate (currently 2.5% p.a.).",
    )
    sgb_maturity_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True,
        doc="Redemption date (8 years from issue date).",
    )
    # ETF ticker (if form = ETF)
    etf_ticker: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)


# ── 6 — Silver ────────────────────────────────────────────────────────────────

class SilverAsset(Asset):
    """Physical silver, silver ETFs, or digital silver."""

    __tablename__ = "silver_assets"

    __mapper_args__ = {"polymorphic_identity": AssetType.SILVER}

    asset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assets.id", ondelete="CASCADE"),
        primary_key=True,
    )

    form: Mapped[SilverForm] = mapped_column(
        Enum(SilverForm, name="silver_form"),
        nullable=False,
    )
    weight_grams: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(14, 4), nullable=True,
        doc="Weight in grams (may be several kg for bullion bars).",
    )
    fineness: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 3), nullable=True,
        doc="Purity expressed as parts per thousand, e.g. 999 = .999 fine silver.",
    )
    form_description: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True,
        doc="Bullion / coins / bars / ETF.",
    )
    # ETF details if form = ETF
    etf_ticker: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    etf_isin: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    custodian: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)


# ── 7 — Real Estate ───────────────────────────────────────────────────────────

class RealEstateAsset(Asset):
    """
    Physical property: residential, commercial, land.

    purchase_price = price per sq-ft (or total, with quantity = 1).
    purchase_value = total acquisition cost including registration/stamp duty.
    """

    __tablename__ = "real_estate_assets"

    __mapper_args__ = {"polymorphic_identity": AssetType.REAL_ESTATE}

    asset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assets.id", ondelete="CASCADE"),
        primary_key=True,
    )

    property_type: Mapped[PropertyType] = mapped_column(
        Enum(PropertyType, name="property_type"),
        nullable=False,
    )

    # Location
    address_line1: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    address_line2: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    city: Mapped[str] = mapped_column(String(128), nullable=False)
    state: Mapped[str] = mapped_column(String(128), nullable=False)
    country: Mapped[str] = mapped_column(
        String(64), nullable=False, default="India", server_default="India",
    )
    pincode: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)

    # Area
    total_area_sqft: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(14, 2), nullable=True,
        doc="Total area (plot area for land, built-up+common for apartments).",
    )
    built_up_area_sqft: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(14, 2), nullable=True,
        doc="Exclusive built-up area.  NULL for land.",
    )
    carpet_area_sqft: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(14, 2), nullable=True,
    )

    # Registration
    registration_number: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True,
        doc="SRO document registration number.",
    )

    # Loan
    is_under_loan: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False,
    )
    loan_outstanding: Mapped[Optional[Decimal]] = mapped_column(
        _MONEY, nullable=True,
        doc="Current outstanding principal.",
    )
    loan_emi: Mapped[Optional[Decimal]] = mapped_column(_MONEY, nullable=True)
    loan_interest_rate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True,
        doc="Annual interest rate on the home loan, e.g. 8.5.",
    )
    loan_maturity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    lender_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Rental income
    is_rented: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False,
    )
    monthly_rent: Mapped[Optional[Decimal]] = mapped_column(_MONEY, nullable=True)
    annual_rental_yield: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True,
        doc="Computed: annual_rent / current_value × 100.",
    )

    # Free-text notes for appreciation rationale, renovation costs, etc.
    appreciation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


# ── 8 — Bonds ─────────────────────────────────────────────────────────────────

class BondAsset(Asset):
    """
    Government securities, corporate bonds, tax-free bonds.
    quantity = face units held (each unit is typically ₹1,000 or ₹10,000).
    """

    __tablename__ = "bond_assets"

    __mapper_args__ = {"polymorphic_identity": AssetType.BOND}

    asset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assets.id", ondelete="CASCADE"),
        primary_key=True,
    )

    bond_name: Mapped[str] = mapped_column(String(512), nullable=False)
    isin: Mapped[Optional[str]] = mapped_column(
        String(12), nullable=True, index=True,
        doc="ISIN for listed bonds.  NULL for private/unlisted.",
    )
    issuer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    issuer_type: Mapped[IssuerType] = mapped_column(
        Enum(IssuerType, name="issuer_type"),
        nullable=False,
    )

    face_value: Mapped[Decimal] = mapped_column(
        _MONEY, nullable=False,
        doc="Face / par value per unit, e.g. ₹1,000.",
    )
    coupon_rate: Mapped[Decimal] = mapped_column(
        Numeric(6, 4), nullable=False,
        doc="Annual coupon as a percentage of face value, e.g. 7.25.",
    )
    coupon_frequency: Mapped[CouponFrequency] = mapped_column(
        Enum(CouponFrequency, name="coupon_frequency"),
        nullable=False,
        default=CouponFrequency.ANNUAL,
    )

    issue_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    maturity_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True,
    )

    credit_rating: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True,
        doc="e.g. AAA, AA+, AA, A1+.  NULL for G-secs (sovereign, so unrated).",
    )
    credit_agency: Mapped[Optional[str]] = mapped_column(
        String(32), nullable=True,
        doc="CRISIL, ICRA, CARE, India Ratings.",
    )
    is_taxfree: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False,
        doc="True for NHAI, REC, PFC tax-free bonds.",
    )
    is_listed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    demat_account: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)


# ── 9 — Fixed Deposits ────────────────────────────────────────────────────────

class FDAsset(Asset):
    """
    Bank FD, Company FD, Post Office TD/RD.
    quantity = 1 (single FD), purchase_value = principal amount.
    """

    __tablename__ = "fd_assets"

    __mapper_args__ = {"polymorphic_identity": AssetType.FD}

    asset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assets.id", ondelete="CASCADE"),
        primary_key=True,
    )

    institution_name: Mapped[str] = mapped_column(String(255), nullable=False)
    institution_type: Mapped[InstitutionType] = mapped_column(
        Enum(InstitutionType, name="institution_type"),
        nullable=False,
    )
    fd_account_number: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True, index=True,
        doc="FD account / certificate number as printed on the advice.",
    )

    interest_rate: Mapped[Decimal] = mapped_column(
        Numeric(6, 4), nullable=False,
        doc="Annual interest rate as a percentage, e.g. 7.10.",
    )
    compounding_frequency: Mapped[CompoundingFrequency] = mapped_column(
        Enum(CompoundingFrequency, name="compounding_frequency"),
        nullable=False,
        default=CompoundingFrequency.QUARTERLY,
    )

    deposit_date: Mapped[date] = mapped_column(Date, nullable=False)
    maturity_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True,
    )
    maturity_amount: Mapped[Optional[Decimal]] = mapped_column(
        _MONEY, nullable=True,
        doc="Expected amount on maturity (pre-TDS, pre-premature-closure).",
    )

    is_auto_renew: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False,
    )
    is_tax_saver: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False,
        doc="5-year tax-saver FD with 80C benefit.",
    )
    tds_applicable: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True,
    )
    form_15g_submitted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False,
        doc="True if Form 15G/15H submitted to avoid TDS deduction.",
    )
    nominee_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


# ── 10 — Other ────────────────────────────────────────────────────────────────

class OtherAsset(Asset):
    """
    Catch-all for assets that don't fit standard categories:
    PPF, NSC, Sukanya Samriddhi, EPF, NPS, savings accounts, crypto, etc.
    """

    __tablename__ = "other_assets"

    __mapper_args__ = {"polymorphic_identity": AssetType.OTHER}

    asset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assets.id", ondelete="CASCADE"),
        primary_key=True,
    )

    sub_type: Mapped[OtherAssetSubType] = mapped_column(
        Enum(OtherAssetSubType, name="other_asset_sub_type"),
        nullable=False,
    )
    institution_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    account_number: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True,
        doc="PPF account number, NPS PRAN, EPF UAN, etc.",
    )
    interest_rate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True,
        doc="Applicable for PPF, NSC, SSY; NULL for equity-like assets.",
    )
    maturity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    lock_in_years: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True,
        doc="Lock-in period in years (PPF=15, NSC=5, ELSS=3).",
    )
    # For crypto
    token_symbol: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True,
        doc="e.g. BTC, ETH, SOL.  NULL for non-crypto.",
    )
    wallet_or_exchange: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True,
    )
