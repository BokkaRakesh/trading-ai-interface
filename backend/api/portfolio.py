"""
FastAPI portfolio API — /api/portfolio/...

Endpoints:
  POST   /assets                         Create asset
  GET    /assets                         List assets
  GET    /assets/{asset_id}              Get single asset + price history
  PUT    /assets/{asset_id}              Update asset
  DELETE /assets/{asset_id}             Soft-delete asset
  POST   /assets/{asset_id}/update-price Manual price update
  GET    /summary                        Portfolio aggregate metrics
  GET    /performance                    Historical value trend
  POST   /statements/upload             Upload + parse statement file
  GET    /statements                     List statements

Run with:
    uvicorn api.portfolio:app --reload --port 8000
"""

from __future__ import annotations

import logging
import os
import shutil
import tempfile
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Optional
from uuid import uuid4

from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Portfolio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB dependency (SQLAlchemy async session) ──────────────────────────────────

try:
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.orm import sessionmaker

    DATABASE_URL = os.getenv(
        "DATABASE_URL", "sqlite+aiosqlite:///./portfolio_dev.db"
    )
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def get_db() -> AsyncSession:
        async with AsyncSessionLocal() as session:
            yield session

except ImportError:
    logger.warning("SQLAlchemy async deps not installed — DB endpoints will fail.")

    async def get_db():  # type: ignore[misc]
        raise HTTPException(503, "Database unavailable: install sqlalchemy[asyncio]")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class AssetBase(BaseModel):
    asset_type: str
    asset_name: str
    quantity: Decimal
    purchase_price: Decimal
    purchase_date: date
    purchase_value: Optional[Decimal] = None
    broad_category: Optional[str] = None
    currency: str = "INR"
    notes: Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("quantity must be > 0")
        return v

    @field_validator("purchase_price")
    @classmethod
    def price_non_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("purchase_price must be >= 0")
        return v

    @field_validator("purchase_date")
    @classmethod
    def date_not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Purchase date cannot be in the future.")
        return v


class AssetDetails(BaseModel):
    """Type-specific extra fields — all optional, validated per asset_type."""
    # Stock
    ticker: Optional[str] = None
    isin: Optional[str] = None
    exchange: Optional[str] = None
    sector: Optional[str] = None
    broker_account: Optional[str] = None
    company_name: Optional[str] = None
    # MF
    scheme_name: Optional[str] = None
    scheme_code: Optional[str] = None
    fund_house: Optional[str] = None
    folio_number: Optional[str] = None
    scheme_type: Optional[str] = None
    nav_at_purchase: Optional[Decimal] = None
    sip_status: Optional[str] = None
    sip_amount: Optional[Decimal] = None
    sip_frequency: Optional[str] = None
    sip_start_date: Optional[date] = None
    sip_end_date: Optional[date] = None
    sip_mandate_ref: Optional[str] = None
    # ETF
    etf_type: Optional[str] = None
    underlying_index: Optional[str] = None
    expense_ratio: Optional[Decimal] = None
    # REIT
    reit_name: Optional[str] = None
    dividend_yield: Optional[Decimal] = None
    property_type: Optional[str] = None  # For REIT
    # Gold
    gold_form: Optional[str] = None
    weight_grams: Optional[Decimal] = None
    purity_karat: Optional[int] = None
    purity_percent: Optional[Decimal] = None
    hallmarked: Optional[bool] = None
    sgb_series: Optional[str] = None
    sgb_isin: Optional[str] = None
    sgb_coupon_rate: Optional[Decimal] = None
    sgb_maturity_date: Optional[date] = None
    # Silver
    silver_form: Optional[str] = None
    fineness: Optional[Decimal] = None
    # Real estate
    re_property_type: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    pincode: Optional[str] = None
    total_area_sqft: Optional[Decimal] = None
    built_up_area_sqft: Optional[Decimal] = None
    registration_number: Optional[str] = None
    is_under_loan: Optional[bool] = None
    loan_outstanding: Optional[Decimal] = None
    loan_emi: Optional[Decimal] = None
    loan_interest_rate: Optional[Decimal] = None
    loan_maturity_date: Optional[date] = None
    lender_name: Optional[str] = None
    is_rented: Optional[bool] = None
    monthly_rent: Optional[Decimal] = None
    # Bond
    bond_name: Optional[str] = None
    issuer_name: Optional[str] = None
    issuer_type: Optional[str] = None
    face_value: Optional[Decimal] = None
    coupon_rate: Optional[Decimal] = None
    coupon_frequency: Optional[str] = None
    maturity_date: Optional[date] = None
    credit_rating: Optional[str] = None
    is_taxfree: Optional[bool] = None
    is_listed: Optional[bool] = None
    demat_account: Optional[str] = None
    # FD
    institution_name: Optional[str] = None
    institution_type: Optional[str] = None
    fd_account_number: Optional[str] = None
    interest_rate: Optional[Decimal] = None
    compounding_frequency: Optional[str] = None
    deposit_date: Optional[date] = None
    fd_maturity_date: Optional[date] = None
    maturity_amount: Optional[Decimal] = None
    is_auto_renew: Optional[bool] = None
    is_tax_saver: Optional[bool] = None
    tds_applicable: Optional[bool] = None
    form_15g_submitted: Optional[bool] = None
    nominee_name: Optional[str] = None
    # Other
    sub_type: Optional[str] = None
    account_number: Optional[str] = None
    lock_in_years: Optional[int] = None
    token_symbol: Optional[str] = None
    wallet_or_exchange: Optional[str] = None


class CreateAssetRequest(BaseModel):
    household_id: str
    asset_type: str
    asset_name: str
    quantity: Decimal
    purchase_price: Decimal
    purchase_date: date
    purchase_value: Optional[Decimal] = None
    currency: str = "INR"
    notes: Optional[str] = None
    asset_details: AssetDetails = Field(default_factory=AssetDetails)

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("quantity must be > 0")
        return v

    @field_validator("purchase_date")
    @classmethod
    def date_not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Purchase date cannot be in the future.")
        return v


class UpdateAssetRequest(BaseModel):
    quantity: Optional[Decimal] = None
    purchase_price: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    notes: Optional[str] = None
    asset_details: Optional[AssetDetails] = None


class UpdatePriceRequest(BaseModel):
    current_price: Decimal
    price_date: date
    source: str = "manual"
    notes: Optional[str] = None

    @field_validator("current_price")
    @classmethod
    def price_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Price must be > 0")
        return v

    @field_validator("price_date")
    @classmethod
    def date_not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Price date cannot be in the future.")
        return v


class AssetResponse(BaseModel):
    asset_id: str
    asset_type: str
    asset_name: str
    quantity: float
    purchase_price: float
    purchase_value: float
    purchase_date: Optional[str]
    current_price: Optional[float]
    current_value: Optional[float]
    gain_loss: Optional[float]
    roi_percent: Optional[float]
    last_price_updated_at: Optional[str]
    needs_review: bool = False


class PortfolioSummaryResponse(BaseModel):
    total_invested: float
    total_current_value: float
    total_gain_loss: float
    roi_percent: float
    allocation_by_asset_class: dict
    asset_class_breakdown: list
    top_gainers: list
    top_losers: list
    last_updated: Optional[str]


# ── Helpers ───────────────────────────────────────────────────────────────────

VALID_ASSET_TYPES = {
    "STOCK", "MF", "ETF", "REIT", "GOLD", "SILVER",
    "REAL_ESTATE", "BOND", "FD", "OTHER"
}

ASSET_CLASS_DISPLAY = {
    "STOCK": "Stocks",
    "MF": "Mutual Funds",
    "ETF": "ETFs",
    "REIT": "REITs",
    "GOLD": "Gold",
    "SILVER": "Silver",
    "REAL_ESTATE": "Real Estate",
    "BOND": "Bonds",
    "FD": "Fixed Deposits",
    "OTHER": "Other",
}


def _to_asset_response(asset: Any) -> AssetResponse:
    current = float(asset.current_value or asset.purchase_value or 0)
    invested = float(asset.purchase_value or 0)
    gain_loss = current - invested
    roi = (gain_loss / invested * 100) if invested > 0 else 0
    return AssetResponse(
        asset_id=asset.id,
        asset_type=asset.asset_type.value,
        asset_name=asset.asset_name,
        quantity=float(asset.quantity),
        purchase_price=float(asset.purchase_price or 0),
        purchase_value=invested,
        purchase_date=str(asset.purchase_date) if asset.purchase_date else None,
        current_price=float(asset.current_price) if asset.current_price else None,
        current_value=current,
        gain_loss=round(gain_loss, 2),
        roi_percent=round(roi, 2),
        last_price_updated_at=(
            asset.last_price_updated_at.isoformat()
            if asset.last_price_updated_at
            else None
        ),
    )


def _apply_asset_details(asset_obj: Any, details: AssetDetails, asset_type: str) -> None:
    """Populate type-specific fields onto a sub-table ORM object."""
    from models.enums import (
        CompoundingFrequency, CouponFrequency, ETFType, Exchange, GoldForm,
        InstitutionType, IssuerType, OtherAssetSubType, PropertyType,
        REITPropertyType, SchemeType, SIPFrequency, SIPStatus, SilverForm,
    )

    def _enum(cls: Any, val: Any, default: Any = None) -> Any:
        if not val:
            return default
        try:
            return cls[str(val).upper()]
        except KeyError:
            return default

    t = asset_type.upper()
    if t == "STOCK":
        asset_obj.ticker = details.ticker
        asset_obj.isin = details.isin
        asset_obj.company_name = details.company_name
        asset_obj.exchange = _enum(Exchange, details.exchange, Exchange.NSE)
        asset_obj.sector = details.sector
        asset_obj.broker_account = details.broker_account
    elif t == "MF":
        asset_obj.scheme_name = details.scheme_name
        asset_obj.scheme_code = details.scheme_code
        asset_obj.isin = details.isin
        asset_obj.fund_house = details.fund_house
        asset_obj.folio_number = details.folio_number
        asset_obj.scheme_type = _enum(SchemeType, details.scheme_type, SchemeType.EQUITY)
        asset_obj.nav_at_purchase = details.nav_at_purchase
        asset_obj.sip_status = _enum(SIPStatus, details.sip_status, SIPStatus.NONE)
        asset_obj.sip_amount = details.sip_amount
        asset_obj.sip_frequency = _enum(SIPFrequency, details.sip_frequency)
        asset_obj.sip_start_date = details.sip_start_date
        asset_obj.sip_end_date = details.sip_end_date
    elif t == "ETF":
        asset_obj.ticker = details.ticker
        asset_obj.isin = details.isin
        asset_obj.exchange = _enum(Exchange, details.exchange, Exchange.NSE)
        asset_obj.etf_type = _enum(ETFType, details.etf_type, ETFType.EQUITY)
        asset_obj.underlying_index = details.underlying_index
        asset_obj.fund_house = details.fund_house
        asset_obj.expense_ratio = details.expense_ratio
    elif t == "REIT":
        asset_obj.reit_name = details.reit_name or asset_obj.asset_name
        asset_obj.ticker = details.ticker
        asset_obj.isin = details.isin
        asset_obj.exchange = _enum(Exchange, details.exchange, Exchange.NSE)
        asset_obj.nav_at_purchase = details.nav_at_purchase
        asset_obj.dividend_yield = details.dividend_yield
        asset_obj.property_type = _enum(REITPropertyType, details.property_type, REITPropertyType.MIXED)
    elif t == "GOLD":
        asset_obj.form = _enum(GoldForm, details.gold_form, GoldForm.PHYSICAL)
        asset_obj.weight_grams = details.weight_grams or asset_obj.quantity
        asset_obj.purity_karat = details.purity_karat or 22
        asset_obj.purity_percent = details.purity_percent
        asset_obj.hallmarked = bool(details.hallmarked)
        asset_obj.sgb_series = details.sgb_series
        asset_obj.sgb_isin = details.sgb_isin
        asset_obj.sgb_coupon_rate = details.sgb_coupon_rate
        asset_obj.sgb_maturity_date = details.sgb_maturity_date
    elif t == "SILVER":
        asset_obj.form = _enum(SilverForm, details.silver_form, SilverForm.PHYSICAL)
        asset_obj.weight_grams = details.weight_grams or asset_obj.quantity
        asset_obj.fineness = details.fineness
    elif t == "REAL_ESTATE":
        asset_obj.property_type = _enum(PropertyType, details.re_property_type, PropertyType.RESIDENTIAL)
        asset_obj.address_line1 = details.address_line1
        asset_obj.address_line2 = details.address_line2
        asset_obj.city = details.city
        asset_obj.state = details.state
        asset_obj.country = details.country or "India"
        asset_obj.pincode = details.pincode
        asset_obj.total_area_sqft = details.total_area_sqft
        asset_obj.built_up_area_sqft = details.built_up_area_sqft
        asset_obj.registration_number = details.registration_number
        asset_obj.is_under_loan = bool(details.is_under_loan)
        asset_obj.loan_outstanding = details.loan_outstanding
        asset_obj.loan_emi = details.loan_emi
        asset_obj.loan_interest_rate = details.loan_interest_rate
        asset_obj.loan_maturity_date = details.loan_maturity_date
        asset_obj.lender_name = details.lender_name
        asset_obj.is_rented = bool(details.is_rented)
        asset_obj.monthly_rent = details.monthly_rent
    elif t == "BOND":
        asset_obj.bond_name = details.bond_name or asset_obj.asset_name
        asset_obj.isin = details.isin
        asset_obj.issuer_name = details.issuer_name
        asset_obj.issuer_type = _enum(IssuerType, details.issuer_type, IssuerType.CORPORATE)
        asset_obj.face_value = details.face_value
        asset_obj.coupon_rate = details.coupon_rate
        asset_obj.coupon_frequency = _enum(CouponFrequency, details.coupon_frequency, CouponFrequency.SEMI_ANNUAL)
        asset_obj.maturity_date = details.maturity_date
        asset_obj.credit_rating = details.credit_rating
        asset_obj.is_taxfree = bool(details.is_taxfree)
        asset_obj.is_listed = bool(details.is_listed)
        asset_obj.demat_account = details.demat_account
    elif t == "FD":
        asset_obj.institution_name = details.institution_name
        asset_obj.institution_type = _enum(InstitutionType, details.institution_type, InstitutionType.BANK)
        asset_obj.fd_account_number = details.fd_account_number
        asset_obj.interest_rate = details.interest_rate
        asset_obj.compounding_frequency = _enum(CompoundingFrequency, details.compounding_frequency, CompoundingFrequency.QUARTERLY)
        asset_obj.deposit_date = details.deposit_date
        asset_obj.maturity_date = details.fd_maturity_date
        asset_obj.maturity_amount = details.maturity_amount
        asset_obj.is_auto_renew = bool(details.is_auto_renew)
        asset_obj.is_tax_saver = bool(details.is_tax_saver)
        asset_obj.tds_applicable = bool(details.tds_applicable)
        asset_obj.form_15g_submitted = bool(details.form_15g_submitted)
        asset_obj.nominee_name = details.nominee_name
    elif t == "OTHER":
        from models.enums import OtherAssetSubType
        asset_obj.sub_type = _enum(OtherAssetSubType, details.sub_type, OtherAssetSubType.OTHER)
        asset_obj.institution_name = details.institution_name
        asset_obj.account_number = details.account_number
        asset_obj.interest_rate = details.interest_rate
        asset_obj.maturity_date = details.maturity_date
        asset_obj.lock_in_years = details.lock_in_years
        asset_obj.token_symbol = details.token_symbol
        asset_obj.wallet_or_exchange = details.wallet_or_exchange


_ASSET_CLS_MAP = {
    "STOCK": "StockAsset",
    "MF": "MutualFundAsset",
    "ETF": "ETFAsset",
    "REIT": "REITAsset",
    "GOLD": "GoldAsset",
    "SILVER": "SilverAsset",
    "REAL_ESTATE": "RealEstateAsset",
    "BOND": "BondAsset",
    "FD": "FDAsset",
    "OTHER": "OtherAsset",
}


def _instantiate_asset(asset_type: str) -> Any:
    from models import (
        BondAsset, ETFAsset, FDAsset, GoldAsset, MutualFundAsset,
        OtherAsset, REITAsset, RealEstateAsset, SilverAsset, StockAsset,
    )
    from models.enums import AssetType, BroadCategory, EntryMode

    cls_name = _ASSET_CLS_MAP.get(asset_type.upper())
    if not cls_name:
        raise HTTPException(400, f"Invalid asset_type: {asset_type}. Valid: {list(_ASSET_CLS_MAP)}")

    cls_map = {
        "StockAsset": StockAsset, "MutualFundAsset": MutualFundAsset,
        "ETFAsset": ETFAsset, "REITAsset": REITAsset, "GoldAsset": GoldAsset,
        "SilverAsset": SilverAsset, "RealEstateAsset": RealEstateAsset,
        "BondAsset": BondAsset, "FDAsset": FDAsset, "OtherAsset": OtherAsset,
    }
    return cls_map[cls_name]()


BROAD_CATEGORY_MAP = {
    "STOCK": "EQUITY", "MF": "EQUITY", "ETF": "EQUITY", "REIT": "REAL_ASSETS",
    "GOLD": "COMMODITY", "SILVER": "COMMODITY", "REAL_ESTATE": "REAL_ASSETS",
    "BOND": "DEBT", "FD": "DEBT", "OTHER": "OTHER",
}


# ── Endpoint 1: Create asset ──────────────────────────────────────────────────

@app.post("/api/portfolio/assets", status_code=status.HTTP_201_CREATED)
async def create_asset(
    body: CreateAssetRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from models.enums import AssetType, BroadCategory, EntryMode

    t = body.asset_type.upper()
    if t not in VALID_ASSET_TYPES:
        raise HTTPException(400, f"Invalid asset_type '{body.asset_type}'. Valid: {sorted(VALID_ASSET_TYPES)}")

    asset = _instantiate_asset(t)
    asset.id = str(uuid4())
    asset.household_id = body.household_id
    asset.asset_type = AssetType[t]
    asset.asset_name = body.asset_name
    asset.quantity = body.quantity
    asset.purchase_price = body.purchase_price
    asset.purchase_value = body.purchase_value or (body.quantity * body.purchase_price)
    asset.purchase_date = body.purchase_date
    asset.currency = body.currency
    asset.notes = body.notes
    asset.broad_category = BroadCategory[BROAD_CATEGORY_MAP[t]]
    asset.entry_mode = EntryMode.MANUAL
    asset.is_active = True

    _apply_asset_details(asset, body.asset_details, t)

    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    resp = _to_asset_response(asset)
    return {
        "asset_id": resp.asset_id,
        "current_value": resp.current_value,
        "gain_loss": resp.gain_loss,
    }


# ── Endpoint 2: List assets ───────────────────────────────────────────────────

@app.get("/api/portfolio/assets")
async def list_assets(
    household_id: str = Query(...),
    asset_type: Optional[str] = Query(None),
    sort_by: str = Query("current_value"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from sqlalchemy import select
    from models import Asset
    from models.enums import AssetType

    stmt = select(Asset).where(
        Asset.household_id == household_id,
        Asset.deleted_at.is_(None),
        Asset.is_active.is_(True),
    )
    if asset_type:
        t = asset_type.upper()
        if t not in VALID_ASSET_TYPES:
            raise HTTPException(400, f"Invalid asset_type: {asset_type}")
        stmt = stmt.where(Asset.asset_type == AssetType[t])

    assets = (await db.execute(stmt)).scalars().all()

    def sort_key(a: Any) -> float:
        if sort_by == "current_value":
            return float(a.current_value or a.purchase_value or 0)
        if sort_by == "gain_loss":
            cv = float(a.current_value or a.purchase_value or 0)
            pv = float(a.purchase_value or 0)
            return cv - pv
        if sort_by == "roi":
            cv = float(a.current_value or a.purchase_value or 0)
            pv = float(a.purchase_value or 1)
            return (cv - pv) / pv
        return 0.0

    sorted_assets = sorted(assets, key=sort_key, reverse=True)
    total = len(sorted_assets)
    start = (page - 1) * page_size
    page_assets = sorted_assets[start: start + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "assets": [_to_asset_response(a).model_dump() for a in page_assets],
    }


# ── Endpoint 3: Get single asset ──────────────────────────────────────────────

@app.get("/api/portfolio/assets/{asset_id}")
async def get_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from sqlalchemy import select
    from models import Asset, PriceHistory

    asset = (await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.deleted_at.is_(None))
    )).scalars().first()
    if not asset:
        raise HTTPException(404, "Asset not found.")

    history = (await db.execute(
        select(PriceHistory)
        .where(PriceHistory.asset_id == asset_id)
        .order_by(PriceHistory.price_date)
    )).scalars().all()

    return {
        **_to_asset_response(asset).model_dump(),
        "price_history": [
            {
                "date": str(ph.price_date),
                "price": float(ph.price),
                "source": ph.source.value,
            }
            for ph in history
        ],
    }


# ── Endpoint 4: Update asset ──────────────────────────────────────────────────

@app.put("/api/portfolio/assets/{asset_id}")
async def update_asset(
    asset_id: str,
    body: UpdateAssetRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from sqlalchemy import select
    from models import Asset

    asset = (await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.deleted_at.is_(None))
    )).scalars().first()
    if not asset:
        raise HTTPException(404, "Asset not found.")

    if body.quantity is not None:
        if body.quantity <= 0:
            raise HTTPException(400, "quantity must be > 0")
        asset.quantity = body.quantity
    if body.purchase_price is not None:
        asset.purchase_price = body.purchase_price
    if body.current_value is not None:
        asset.current_value = body.current_value
    if body.notes is not None:
        asset.notes = body.notes
    if body.asset_details is not None:
        _apply_asset_details(asset, body.asset_details, asset.asset_type.value)

    await db.commit()
    await db.refresh(asset)
    return _to_asset_response(asset).model_dump()


# ── Endpoint 5: Delete asset ──────────────────────────────────────────────────

@app.delete("/api/portfolio/assets/{asset_id}")
async def delete_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from sqlalchemy import select
    from models import Asset

    asset = (await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.deleted_at.is_(None))
    )).scalars().first()
    if not asset:
        raise HTTPException(404, "Asset not found.")

    asset.soft_delete()  # sets deleted_at via SoftDeleteMixin
    await db.commit()
    return {"success": True, "asset_id": asset_id}


# ── Endpoint 6: Manual price update ──────────────────────────────────────────

@app.post("/api/portfolio/assets/{asset_id}/update-price")
async def manual_price_update(
    asset_id: str,
    body: UpdatePriceRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from valuation_service import update_manual_price
    from models.enums import PriceSource

    # Validate asset exists
    from sqlalchemy import select
    from models import Asset
    asset = (await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.deleted_at.is_(None))
    )).scalars().first()
    if not asset:
        raise HTTPException(404, "Asset not found.")

    src_map = {"manual": PriceSource.MANUAL, "api": PriceSource.MARKET_API}
    if body.source not in src_map:
        raise HTTPException(400, f"source must be 'manual' or 'api'.")

    await update_manual_price(db, asset_id, body.current_price, body.price_date, body.notes or "")
    await db.refresh(asset)
    return _to_asset_response(asset).model_dump()


# ── Endpoint 7: Portfolio summary ─────────────────────────────────────────────

@app.get("/api/portfolio/summary")
async def portfolio_summary(
    household_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> PortfolioSummaryResponse:
    from sqlalchemy import select
    from models import Asset, PortfolioSummary

    # Try cached summary first
    cached_summary = (await db.execute(
        select(PortfolioSummary)
        .where(
            PortfolioSummary.household_id == household_id,
            PortfolioSummary.summary_date == date.today(),
        )
    )).scalars().first()

    # Load all assets for live aggregation fallback
    assets = (await db.execute(
        select(Asset).where(
            Asset.household_id == household_id,
            Asset.deleted_at.is_(None),
            Asset.is_active.is_(True),
        )
    )).scalars().all()

    if not assets:
        return PortfolioSummaryResponse(
            total_invested=0, total_current_value=0, total_gain_loss=0, roi_percent=0,
            allocation_by_asset_class={}, asset_class_breakdown=[],
            top_gainers=[], top_losers=[], last_updated=None,
        )

    total_invested = sum(float(a.purchase_value or 0) for a in assets)
    total_current = sum(float(a.current_value or a.purchase_value or 0) for a in assets)
    gain_loss = total_current - total_invested
    roi = (gain_loss / total_invested * 100) if total_invested > 0 else 0

    # Allocation by class
    class_agg: dict[str, dict] = {}
    for a in assets:
        key = a.asset_type.value
        label = ASSET_CLASS_DISPLAY.get(key, key)
        class_agg.setdefault(key, {"label": label, "count": 0, "invested": 0, "current_value": 0})
        class_agg[key]["count"] += 1
        class_agg[key]["invested"] += float(a.purchase_value or 0)
        class_agg[key]["current_value"] += float(a.current_value or a.purchase_value or 0)

    allocation_by_asset_class = {}
    breakdown = []
    for key, d in class_agg.items():
        pct = (d["current_value"] / total_current * 100) if total_current > 0 else 0
        gl = d["current_value"] - d["invested"]
        roi_cls = (gl / d["invested"] * 100) if d["invested"] > 0 else 0
        allocation_by_asset_class[d["label"]] = {
            "value": round(d["current_value"], 2),
            "percent": f"{round(pct, 1)}%",
        }
        breakdown.append({
            "asset_type": key,
            "label": d["label"],
            "count": d["count"],
            "invested": round(d["invested"], 2),
            "current_value": round(d["current_value"], 2),
            "gain_loss": round(gl, 2),
            "roi_percent": round(roi_cls, 2),
        })

    breakdown.sort(key=lambda x: x["current_value"], reverse=True)

    # Top gainers / losers
    asset_rois = []
    for a in assets:
        cv = float(a.current_value or a.purchase_value or 0)
        pv = float(a.purchase_value or 1)
        r = (cv - pv) / pv * 100
        asset_rois.append({"name": a.asset_name, "roi_percent": round(r, 2), "gain_loss": round(cv - pv, 2)})

    asset_rois.sort(key=lambda x: x["roi_percent"], reverse=True)
    top_gainers = [x for x in asset_rois if x["roi_percent"] > 0][:3]
    top_losers = sorted([x for x in asset_rois if x["roi_percent"] < 0], key=lambda x: x["roi_percent"])[:3]

    last_updated = None
    if cached_summary:
        last_updated = cached_summary.calculated_at.isoformat()

    return PortfolioSummaryResponse(
        total_invested=round(total_invested, 2),
        total_current_value=round(total_current, 2),
        total_gain_loss=round(gain_loss, 2),
        roi_percent=round(roi, 2),
        allocation_by_asset_class=allocation_by_asset_class,
        asset_class_breakdown=breakdown,
        top_gainers=top_gainers,
        top_losers=top_losers,
        last_updated=last_updated,
    )


# ── Endpoint 8: Performance (historical trend) ────────────────────────────────

@app.get("/api/portfolio/performance")
async def portfolio_performance(
    household_id: str = Query(...),
    period: str = Query("1year"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from sqlalchemy import select
    from models import Asset, PriceHistory

    period_days = {
        "3months": 90, "1year": 365, "5years": 365 * 5, "all": 365 * 20,
    }
    days = period_days.get(period, 365)
    since = date.today() - timedelta(days=days)

    assets = (await db.execute(
        select(Asset).where(
            Asset.household_id == household_id,
            Asset.deleted_at.is_(None),
        )
    )).scalars().all()

    if not assets:
        return {"dates": [], "values": [], "invested_amounts": []}

    asset_ids = [a.id for a in assets]
    asset_map = {a.id: a for a in assets}

    histories = (await db.execute(
        select(PriceHistory).where(
            PriceHistory.asset_id.in_(asset_ids),
            PriceHistory.price_date >= since,
        ).order_by(PriceHistory.price_date)
    )).scalars().all()

    # Build daily totals
    daily: dict[date, Decimal] = {}
    for ph in histories:
        a = asset_map[ph.asset_id]
        val = ph.price * a.quantity
        daily[ph.price_date] = daily.get(ph.price_date, Decimal("0")) + val

    if not daily:
        return {"dates": [], "values": [], "invested_amounts": []}

    sorted_dates = sorted(daily)
    total_invested = sum(float(a.purchase_value or 0) for a in assets)

    return {
        "dates": [str(d) for d in sorted_dates],
        "values": [float(daily[d]) for d in sorted_dates],
        "invested_amounts": [total_invested] * len(sorted_dates),
    }


# ── Endpoint 9: Upload statement ──────────────────────────────────────────────

@app.post("/api/portfolio/statements/upload", status_code=status.HTTP_201_CREATED)
async def upload_statement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    statement_type: str = Form("auto"),
    household_id: str = Form(...),
    uploaded_by: str = Form(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    import hashlib
    from sqlalchemy import select
    from models import Asset, StatementSource
    from models.enums import AssetType, EntryMode, ParseStatus, StatementSourceType
    from statement_parser import StatementType as SType, parse_statement

    # 1. Save uploaded file to temp dir
    suffix = "." + (file.filename or "statement.pdf").rsplit(".", 1)[-1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    # 2. Compute checksum for dedup
    checksum = hashlib.sha256(content).hexdigest()
    existing_src = (await db.execute(
        select(StatementSource).where(
            StatementSource.checksum_sha256 == checksum,
            StatementSource.household_id == household_id,
        )
    )).scalars().first()
    if existing_src:
        return {
            "message": "Statement already uploaded.",
            "statement_id": existing_src.id,
            "assets_created": 0,
            "needs_review": 0,
            "status": "duplicate",
        }

    # 3. Create StatementSource row
    stype_map = {
        "broker": StatementSourceType.BROKER,
        "mf": StatementSourceType.MUTUAL_FUND,
        "bank_fd": StatementSourceType.BANK_FD,
        "bond": StatementSourceType.BROKER,
        "insurance": StatementSourceType.OTHER,
        "real_estate": StatementSourceType.OTHER,
        "auto": StatementSourceType.OTHER,
    }
    src = StatementSource(
        id=str(uuid4()),
        household_id=household_id,
        uploaded_by=uploaded_by,
        file_name=file.filename or "statement",
        file_path=tmp_path,
        file_size_bytes=len(content),
        mime_type=file.content_type or "application/octet-stream",
        checksum_sha256=checksum,
        source_type=stype_map.get(statement_type.lower(), StatementSourceType.OTHER),
        parse_status=ParseStatus.PARSING,
    )
    db.add(src)
    await db.flush()

    # 4. Load existing ISINs for duplicate detection
    existing_isins: set[str] = set()
    all_assets = (await db.execute(
        select(Asset).where(
            Asset.household_id == household_id,
            Asset.deleted_at.is_(None),
        )
    )).scalars().all()
    for a in all_assets:
        isin = getattr(a, "isin", None)
        if isin:
            existing_isins.add(isin)

    # 5. Parse
    try:
        result = parse_statement(
            tmp_path,
            statement_type=statement_type,
            household_id=household_id,
            created_by=uploaded_by,
            statement_source_id=src.id,
            existing_isins=existing_isins,
        )
    except Exception as exc:
        src.parse_status = ParseStatus.FAILED
        src.parse_error = str(exc)
        await db.commit()
        raise HTTPException(500, f"Parsing failed: {exc}")

    # 6. Persist holdings
    assets_created = 0
    for holding in result.holdings:
        try:
            raw = holding.raw
            t = raw.get("asset_type")
            if t is None:
                continue

            asset = _instantiate_asset(t.value if hasattr(t, "value") else str(t))
            asset.id = str(uuid4())
            for key, val in raw.items():
                if hasattr(asset, key):
                    setattr(asset, key, val)
            asset.is_active = True
            db.add(asset)
            assets_created += 1
        except Exception as exc:
            logger.warning("Could not persist holding: %s", exc)
            result.errors.append(str(exc))

    src.parse_status = ParseStatus.PARSED
    src.parsed_at = datetime.now(tz=timezone.utc)
    src.transaction_count = assets_created
    src.needs_review_count = result.needs_review_count
    src.institution_name = result.institution_name
    src.period_from = result.period_from
    src.period_to = result.period_to

    await db.commit()
    return {
        "statement_id": src.id,
        "assets_created": assets_created,
        "needs_review": result.needs_review_count,
        "errors": result.errors,
        "status": "parsed",
    }


# ── Endpoint 10: List statements ──────────────────────────────────────────────

@app.get("/api/portfolio/statements")
async def list_statements(
    household_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> list:
    from sqlalchemy import select
    from models import StatementSource

    stmts = (await db.execute(
        select(StatementSource).where(
            StatementSource.household_id == household_id,
            StatementSource.deleted_at.is_(None),
        ).order_by(StatementSource.created_at.desc())
    )).scalars().all()

    return [
        {
            "statement_id": s.id,
            "type": s.source_type.value,
            "upload_date": s.created_at.isoformat() if s.created_at else None,
            "file_name": s.file_name,
            "institution": s.institution_name,
            "assets_created": s.transaction_count or 0,
            "needs_review": s.needs_review_count or 0,
            "status": s.parse_status.value,
            "errors": s.parse_error,
        }
        for s in stmts
    ]
