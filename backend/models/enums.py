"""
All domain-level enumerations used by the portfolio models.
Import from here rather than defining inline in model files.
"""

import enum


# ── Asset classification ──────────────────────────────────────────────────────

class AssetType(str, enum.Enum):
    """Top-level asset class.  Maps to the ``asset_type`` discriminator column."""
    STOCK        = "STOCK"
    MF           = "MF"           # Mutual Fund
    ETF          = "ETF"
    REIT         = "REIT"
    GOLD         = "GOLD"
    SILVER       = "SILVER"
    REAL_ESTATE  = "REAL_ESTATE"
    BOND         = "BOND"
    FD           = "FD"           # Fixed Deposit
    OTHER        = "OTHER"        # PPF, NSC, EPF, crypto, savings a/c, etc.


class BroadCategory(str, enum.Enum):
    """High-level grouping used for allocation pie charts."""
    EQUITY       = "EQUITY"       # Stocks, Equity MF, Equity ETF, REITs
    DEBT         = "DEBT"         # Bonds, Debt MF, FD, PPF, NSC
    COMMODITY    = "COMMODITY"    # Gold, Silver (physical/ETF/digital)
    REAL_ASSETS  = "REAL_ASSETS"  # Real estate, physical precious metals
    CASH         = "CASH"         # Savings accounts, liquid funds
    OTHER        = "OTHER"


# ── Entry mode ────────────────────────────────────────────────────────────────

class EntryMode(str, enum.Enum):
    """How the asset record was created."""
    STATEMENT = "STATEMENT"   # Parsed from an uploaded PDF/CSV statement
    MANUAL    = "MANUAL"      # User typed in the values


# ── Statement source ──────────────────────────────────────────────────────────

class StatementSourceType(str, enum.Enum):
    """Category of statement file uploaded."""
    BROKER          = "BROKER"          # Zerodha, Groww, ICICI Direct, etc.
    MUTUAL_FUND     = "MUTUAL_FUND"     # CAMS / KFintech consolidated statement
    BANK_STATEMENT  = "BANK_STATEMENT"  # Current/savings account statement
    BANK_FD         = "BANK_FD"         # FD advice or passbook
    CREDIT_CARD     = "CREDIT_CARD"
    POST_OFFICE     = "POST_OFFICE"     # Post office savings / NSC / PPF
    COMPANY_FD      = "COMPANY_FD"
    REIT_STATEMENT  = "REIT_STATEMENT"
    OTHER           = "OTHER"


class ParseStatus(str, enum.Enum):
    PENDING  = "PENDING"
    PARSING  = "PARSING"
    PARSED   = "PARSED"
    FAILED   = "FAILED"
    SKIPPED  = "SKIPPED"


# ── Exchange ──────────────────────────────────────────────────────────────────

class Exchange(str, enum.Enum):
    NSE     = "NSE"
    BSE     = "BSE"
    NASDAQ  = "NASDAQ"
    NYSE    = "NYSE"
    LSE     = "LSE"
    OTHER   = "OTHER"


# ── Mutual Fund specifics ─────────────────────────────────────────────────────

class SIPStatus(str, enum.Enum):
    ACTIVE   = "ACTIVE"
    INACTIVE = "INACTIVE"
    PAUSED   = "PAUSED"
    NONE     = "NONE"     # One-time lump-sum, no SIP


class SIPFrequency(str, enum.Enum):
    WEEKLY     = "WEEKLY"
    MONTHLY    = "MONTHLY"
    QUARTERLY  = "QUARTERLY"


class SchemeType(str, enum.Enum):
    EQUITY        = "EQUITY"
    DEBT          = "DEBT"
    HYBRID        = "HYBRID"
    LIQUID        = "LIQUID"
    ELSS          = "ELSS"          # Tax-saving equity
    INDEX         = "INDEX"
    INTERNATIONAL = "INTERNATIONAL"
    GOLD          = "GOLD"
    FOF           = "FOF"           # Fund of funds
    OTHER         = "OTHER"


# ── ETF specifics ─────────────────────────────────────────────────────────────

class ETFType(str, enum.Enum):
    EQUITY        = "EQUITY"
    GOLD          = "GOLD"
    SILVER        = "SILVER"
    DEBT          = "DEBT"
    INTERNATIONAL = "INTERNATIONAL"
    REIT          = "REIT"
    OTHER         = "OTHER"


# ── REIT property type ────────────────────────────────────────────────────────

class REITPropertyType(str, enum.Enum):
    OFFICE     = "OFFICE"
    RETAIL     = "RETAIL"
    WAREHOUSE  = "WAREHOUSE"
    MIXED      = "MIXED"
    INDUSTRIAL = "INDUSTRIAL"
    OTHER      = "OTHER"


# ── Gold / Silver forms ───────────────────────────────────────────────────────

class GoldForm(str, enum.Enum):
    PHYSICAL = "PHYSICAL"   # Jewellery, biscuits, bars
    DIGITAL  = "DIGITAL"    # MMTC-PAMP, Augmont, etc.
    ETF      = "ETF"        # GOLDBEES, etc.
    SGB      = "SGB"        # Sovereign Gold Bond


class SilverForm(str, enum.Enum):
    PHYSICAL = "PHYSICAL"   # Bullion, coins, bars
    ETF      = "ETF"        # SILVERBEES, etc.
    DIGITAL  = "DIGITAL"


# ── Real estate ───────────────────────────────────────────────────────────────

class PropertyType(str, enum.Enum):
    RESIDENTIAL = "RESIDENTIAL"
    COMMERCIAL  = "COMMERCIAL"
    LAND        = "LAND"
    INDUSTRIAL  = "INDUSTRIAL"
    AGRICULTURAL = "AGRICULTURAL"


# ── Bond specifics ────────────────────────────────────────────────────────────

class IssuerType(str, enum.Enum):
    GOVERNMENT  = "GOVERNMENT"   # Central / State Govt securities
    PSU         = "PSU"
    CORPORATE   = "CORPORATE"
    MUNICIPAL   = "MUNICIPAL"


class CouponFrequency(str, enum.Enum):
    ANNUAL       = "ANNUAL"
    SEMI_ANNUAL  = "SEMI_ANNUAL"
    QUARTERLY    = "QUARTERLY"
    MONTHLY      = "MONTHLY"
    ZERO_COUPON  = "ZERO_COUPON"   # Discount bond, no periodic coupon


# ── FD specifics ──────────────────────────────────────────────────────────────

class InstitutionType(str, enum.Enum):
    BANK         = "BANK"
    COMPANY      = "COMPANY"      # Corporate FD (e.g., Bajaj Finance FD)
    POST_OFFICE  = "POST_OFFICE"
    NBFC         = "NBFC"


class CompoundingFrequency(str, enum.Enum):
    SIMPLE       = "SIMPLE"       # Simple interest
    MONTHLY      = "MONTHLY"
    QUARTERLY    = "QUARTERLY"
    SEMI_ANNUAL  = "SEMI_ANNUAL"
    ANNUAL       = "ANNUAL"


# ── Other / catch-all assets ──────────────────────────────────────────────────

class OtherAssetSubType(str, enum.Enum):
    PPF                 = "PPF"
    NSC                 = "NSC"
    SUKANYA_SAMRIDDHI   = "SUKANYA_SAMRIDDHI"
    EPF                 = "EPF"
    NPS                 = "NPS"
    SAVINGS_ACCOUNT     = "SAVINGS_ACCOUNT"
    CRYPTO              = "CRYPTO"
    UNLISTED_EQUITY     = "UNLISTED_EQUITY"
    STARTUP_INVESTMENT  = "STARTUP_INVESTMENT"
    OTHER               = "OTHER"


# ── Price history source ──────────────────────────────────────────────────────

class PriceSource(str, enum.Enum):
    MARKET_API = "MARKET_API"   # Fetched from NSE / BSE / AMFI / MCX API
    MANUAL     = "MANUAL"       # User entered
    STATEMENT  = "STATEMENT"    # Extracted from uploaded statement


# ── Membership role ───────────────────────────────────────────────────────────

class HouseholdRole(str, enum.Enum):
    OWNER   = "OWNER"
    ADMIN   = "ADMIN"
    VIEWER  = "VIEWER"
