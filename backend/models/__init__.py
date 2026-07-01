"""
backend/models — SQLAlchemy ORM models for multi-asset portfolio tracking.

Import order matters for joined-table inheritance; this file resolves it.

Usage
─────
    from backend.models import Base, Asset, StockAsset, MutualFundAsset, ...

    engine = create_engine("sqlite:///portfolio.db")
    Base.metadata.create_all(engine)
"""

# Base must be imported first so all models register against it.
from .base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin, new_uuid

# Enums — no model deps, safe to import anytime.
from .enums import (
    AssetType,
    BroadCategory,
    CompoundingFrequency,
    CouponFrequency,
    EntryMode,
    ETFType,
    Exchange,
    GoldForm,
    HouseholdRole,
    InstitutionType,
    IssuerType,
    OtherAssetSubType,
    ParseStatus,
    PriceSource,
    PropertyType,
    REITPropertyType,
    SchemeType,
    SIPFrequency,
    SIPStatus,
    SilverForm,
    StatementSourceType,
)

# User / Household (no asset deps)
from .user import Household, HouseholdMember, User

# Statement source (depends on Household/User)
from .statements import StatementSource

# Asset hierarchy (depends on Household, StatementSource)
from .asset import (
    Asset,
    BondAsset,
    ETFAsset,
    FDAsset,
    GoldAsset,
    MutualFundAsset,
    OtherAsset,
    REITAsset,
    RealEstateAsset,
    SilverAsset,
    StockAsset,
)

# History (depends on Asset, Household)
from .history import PortfolioSummary, PriceHistory

__all__ = [
    # Base
    "Base",
    "UUIDPrimaryKeyMixin",
    "TimestampMixin",
    "SoftDeleteMixin",
    "new_uuid",
    # Enums
    "AssetType",
    "BroadCategory",
    "CompoundingFrequency",
    "CouponFrequency",
    "EntryMode",
    "ETFType",
    "Exchange",
    "GoldForm",
    "HouseholdRole",
    "InstitutionType",
    "IssuerType",
    "OtherAssetSubType",
    "ParseStatus",
    "PriceSource",
    "PropertyType",
    "REITPropertyType",
    "SchemeType",
    "SIPFrequency",
    "SIPStatus",
    "SilverForm",
    "StatementSourceType",
    # User / Household
    "User",
    "Household",
    "HouseholdMember",
    # Statement
    "StatementSource",
    # Assets
    "Asset",
    "StockAsset",
    "MutualFundAsset",
    "ETFAsset",
    "REITAsset",
    "GoldAsset",
    "SilverAsset",
    "RealEstateAsset",
    "BondAsset",
    "FDAsset",
    "OtherAsset",
    # History
    "PriceHistory",
    "PortfolioSummary",
]
