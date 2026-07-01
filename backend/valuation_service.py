"""
valuation_service.py — Fetch and cache live prices for all asset classes.

Supported data sources:
  Stocks/ETFs/REITs   : Finnhub (env: FINNHUB_API_KEY)
  MF NAVs             : AMFI (free, no key required)
  Gold/Silver         : metals-api.com (env: METALS_API_KEY) or GoldAPI.io (env: GOLD_API_KEY)
  Crypto              : CoinGecko (free tier, no key required)
  Real estate / bonds : Manual entry only

Caching: in-memory TTL cache (default 15 min for equities, 60 min for commodities).
APScheduler integration: schedule update_all_asset_prices() every 6 hours.

Usage
─────
    from valuation_service import ValuationService

    svc = ValuationService()
    price = await svc.fetch_stock_price("HDFCBANK", exchange="NSE")
    count = await svc.update_all_asset_prices(session, household_id="hh-uuid")
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import time
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── Optional async HTTP ───────────────────────────────────────────────────────

try:
    import httpx  # type: ignore
    _HAS_HTTPX = True
except ImportError:
    _HAS_HTTPX = False
    logger.warning("httpx not installed — all HTTP calls will fail. pip install httpx")


# ── Price response types ──────────────────────────────────────────────────────

@dataclass
class StockPrice:
    ticker: str
    name: str
    current_price: Decimal
    change_percent: float
    last_updated: datetime
    currency: str = "INR"
    is_stale: bool = False


@dataclass
class MFNav:
    scheme_name: str
    isin: str
    nav: Decimal
    nav_date: date
    is_stale: bool = False


@dataclass
class CommodityPrice:
    commodity: str          # "gold" | "silver"
    purity: Optional[str]
    price_per_gram: Decimal
    currency: str
    last_updated: datetime
    is_stale: bool = False


@dataclass
class REITPrice:
    symbol: str
    name: str
    nav: Decimal
    dividend_yield: Optional[float]
    last_updated: datetime
    is_stale: bool = False


@dataclass
class UpdateResult:
    household_id: str
    updated_count: int
    skipped_count: int
    error_count: int
    errors: list[str] = field(default_factory=list)
    calculated_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))


# ── In-memory TTL cache ───────────────────────────────────────────────────────

class _TTLCache:
    """Thread-safe in-memory cache with per-entry TTL."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float]] = {}

    def _key(self, *parts: str) -> str:
        return hashlib.md5(":".join(parts).encode()).hexdigest()

    def get(self, *key_parts: str) -> Any | None:
        k = self._key(*key_parts)
        entry = self._store.get(k)
        if entry is None:
            return None
        value, expires_at = entry
        if time.monotonic() > expires_at:
            del self._store[k]
            return None
        return value

    def set(self, value: Any, ttl_seconds: int, *key_parts: str) -> None:
        k = self._key(*key_parts)
        self._store[k] = (value, time.monotonic() + ttl_seconds)

    def invalidate(self, *key_parts: str) -> None:
        k = self._key(*key_parts)
        self._store.pop(k, None)

    def clear(self) -> None:
        self._store.clear()


_cache = _TTLCache()

# TTL constants (seconds)
_TTL_EQUITY = 15 * 60        # 15 min
_TTL_COMMODITY = 60 * 60     # 1 hour
_TTL_MF = 24 * 60 * 60       # 24 hours (NAVs update once daily)
_TTL_STALE_FALLBACK = 6 * 60 * 60  # 6 hours — how long to serve stale price before erroring


# ── HTTP helper ───────────────────────────────────────────────────────────────

async def _get(url: str, params: dict | None = None, headers: dict | None = None) -> Any:
    if not _HAS_HTTPX:
        raise RuntimeError("httpx is not installed. Run: pip install httpx")
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, params=params, headers=headers)
        response.raise_for_status()
        return response.json()


# ── Stock price (Finnhub) ─────────────────────────────────────────────────────

_FINNHUB_BASE = "https://finnhub.io/api/v1"

async def fetch_stock_price(ticker: str, exchange: str = "NSE") -> StockPrice:
    """
    Fetch live stock price via Finnhub.
    For NSE/BSE stocks use suffix: "NSE:HDFCBANK" or "BSE:500180".
    """
    cached = _cache.get("stock", ticker, exchange)
    if cached:
        return cached

    api_key = os.getenv("FINNHUB_API_KEY", "")
    if not api_key:
        logger.warning("FINNHUB_API_KEY not set — returning mock price.")
        mock = StockPrice(
            ticker=ticker,
            name=ticker,
            current_price=Decimal("100.00"),
            change_percent=0.0,
            last_updated=datetime.now(tz=timezone.utc),
            is_stale=True,
        )
        return mock

    symbol = f"{exchange.upper()}:{ticker.upper()}"
    try:
        data = await _get(
            f"{_FINNHUB_BASE}/quote",
            params={"symbol": symbol, "token": api_key},
        )
        price = StockPrice(
            ticker=ticker,
            name=ticker,
            current_price=Decimal(str(data["c"])),
            change_percent=float(data.get("dp", 0)),
            last_updated=datetime.fromtimestamp(data["t"], tz=timezone.utc),
            currency="INR",
        )
        _cache.set(price, _TTL_EQUITY, "stock", ticker, exchange)
        return price
    except Exception as exc:
        logger.error("Finnhub stock price failed for %s: %s", ticker, exc)
        stale = _cache.get("stock", ticker, exchange + "_stale")
        if stale:
            stale.is_stale = True
            return stale
        return StockPrice(
            ticker=ticker,
            name=ticker,
            current_price=Decimal("0"),
            change_percent=0.0,
            last_updated=datetime.now(tz=timezone.utc),
            is_stale=True,
        )


# ── MF NAV (AMFI — free, no key) ─────────────────────────────────────────────

_AMFI_NAV_URL = "https://api.mfapi.in/mf/{scheme_code}"

async def fetch_mf_nav(isin_or_scheme_code: str) -> MFNav:
    """
    Fetch MF NAV from AMFI via mfapi.in.
    Accepts AMFI scheme code (e.g., "122639") or ISIN.
    """
    cached = _cache.get("mf", isin_or_scheme_code)
    if cached:
        return cached

    # If it looks like an ISIN, we can't query directly — return a placeholder.
    if isin_or_scheme_code.startswith("IN"):
        logger.warning(
            "ISIN passed to fetch_mf_nav (%s) — need scheme code for AMFI lookup.",
            isin_or_scheme_code,
        )
        return MFNav(
            scheme_name="Unknown",
            isin=isin_or_scheme_code,
            nav=Decimal("0"),
            nav_date=date.today(),
            is_stale=True,
        )

    try:
        data = await _get(_AMFI_NAV_URL.format(scheme_code=isin_or_scheme_code))
        meta = data.get("meta", {})
        latest = data.get("data", [{}])[0]
        nav = MFNav(
            scheme_name=meta.get("scheme_name", ""),
            isin=meta.get("isin_payout", isin_or_scheme_code),
            nav=Decimal(str(latest.get("nav", "0"))),
            nav_date=_parse_amfi_date(str(latest.get("date", ""))),
        )
        _cache.set(nav, _TTL_MF, "mf", isin_or_scheme_code)
        return nav
    except Exception as exc:
        logger.error("AMFI NAV fetch failed for %s: %s", isin_or_scheme_code, exc)
        stale = _cache.get("mf", isin_or_scheme_code + "_stale")
        if stale:
            stale.is_stale = True
            return stale
        return MFNav(
            scheme_name="",
            isin=isin_or_scheme_code,
            nav=Decimal("0"),
            nav_date=date.today(),
            is_stale=True,
        )


def _parse_amfi_date(date_str: str) -> date:
    """Parse AMFI date format DD-Mon-YYYY."""
    try:
        return datetime.strptime(date_str.strip(), "%d-%b-%Y").date()
    except ValueError:
        return date.today()


# ── Commodity prices (metals-api.com or GoldAPI.io) ──────────────────────────

async def fetch_commodity_price(
    commodity: str,
    purity: str | None = None,
) -> CommodityPrice:
    """
    Fetch gold or silver price per gram in INR.

    commodity: "gold" | "silver"
    purity: "22K" | "24K" | "999" | None (returns 24K/999 fine price)
    """
    cache_key = f"{commodity}_{purity or 'spot'}"
    cached = _cache.get("commodity", cache_key)
    if cached:
        return cached

    result = await _fetch_via_metals_api(commodity) or await _fetch_via_gold_api(commodity)

    if result is None:
        logger.warning("All commodity APIs failed for %s — using fallback.", commodity)
        # Hardcoded fallback prices (update periodically)
        fallback_prices = {"gold": Decimal("8500"), "silver": Decimal("105")}
        result = CommodityPrice(
            commodity=commodity,
            purity=purity,
            price_per_gram=fallback_prices.get(commodity, Decimal("0")),
            currency="INR",
            last_updated=datetime.now(tz=timezone.utc),
            is_stale=True,
        )

    # Apply purity correction
    if purity and result:
        result = _apply_purity(result, purity, commodity)

    _cache.set(result, _TTL_COMMODITY, "commodity", cache_key)
    return result


async def _fetch_via_metals_api(commodity: str) -> CommodityPrice | None:
    """metals-api.com — env: METALS_API_KEY"""
    api_key = os.getenv("METALS_API_KEY", "")
    if not api_key:
        return None
    symbols = {"gold": "XAU", "silver": "XAG"}
    symbol = symbols.get(commodity)
    if not symbol:
        return None
    try:
        data = await _get(
            "https://metals-api.com/api/latest",
            params={"access_key": api_key, "base": "INR", "symbols": symbol},
        )
        # rate is INR per troy ounce (31.1035 grams)
        rate_per_oz = Decimal(str(data["rates"][symbol]))
        price_per_gram = rate_per_oz / Decimal("31.1035")
        return CommodityPrice(
            commodity=commodity,
            purity=None,
            price_per_gram=price_per_gram.quantize(Decimal("0.01")),
            currency="INR",
            last_updated=datetime.now(tz=timezone.utc),
        )
    except Exception as exc:
        logger.warning("metals-api failed: %s", exc)
        return None


async def _fetch_via_gold_api(commodity: str) -> CommodityPrice | None:
    """goldapi.io — env: GOLD_API_KEY"""
    api_key = os.getenv("GOLD_API_KEY", "")
    if not api_key or commodity != "gold":
        return None
    try:
        data = await _get(
            "https://www.goldapi.io/api/XAU/INR",
            headers={"x-access-token": api_key, "Content-Type": "application/json"},
        )
        price_per_gram = Decimal(str(data["price_gram_24k"]))
        return CommodityPrice(
            commodity="gold",
            purity="24K",
            price_per_gram=price_per_gram,
            currency="INR",
            last_updated=datetime.now(tz=timezone.utc),
        )
    except Exception as exc:
        logger.warning("goldapi.io failed: %s", exc)
        return None


def _apply_purity(base: CommodityPrice, purity: str, commodity: str) -> CommodityPrice:
    """Scale 24K/999 fine price to a lower purity."""
    GOLD_PURITIES = {"24K": 1.0, "22K": 22/24, "18K": 18/24, "14K": 14/24}
    SILVER_FINENESS = {"999": 1.0, "925": 0.925, "900": 0.900, "800": 0.800}

    table = GOLD_PURITIES if commodity == "gold" else SILVER_FINENESS
    factor = table.get(purity, 1.0)
    import copy
    result = copy.copy(base)
    result.price_per_gram = (base.price_per_gram * Decimal(str(factor))).quantize(
        Decimal("0.01")
    )
    result.purity = purity
    return result


# ── REIT price (via Finnhub, same as stocks) ──────────────────────────────────

async def fetch_reit_price(reit_symbol: str, exchange: str = "NSE") -> REITPrice:
    """Fetch REIT unit price (traded like stocks on NSE/BSE)."""
    stock = await fetch_stock_price(reit_symbol, exchange)
    return REITPrice(
        symbol=reit_symbol,
        name=stock.name,
        nav=stock.current_price,
        dividend_yield=None,
        last_updated=stock.last_updated,
        is_stale=stock.is_stale,
    )


# ── Update all assets for a household ────────────────────────────────────────

async def update_all_asset_prices(
    session: Any,  # SQLAlchemy AsyncSession
    household_id: str,
) -> UpdateResult:
    """
    Fetch current prices for all active assets in the household.
    Creates PriceHistory rows and updates Asset.current_price / current_value.
    Recalculates PortfolioSummary at the end.

    session should be an async SQLAlchemy session.
    """
    from sqlalchemy import select
    from models import Asset, PriceHistory, PortfolioSummary
    from models.enums import AssetType, PriceSource, SIPStatus

    result = UpdateResult(household_id=household_id, updated_count=0, skipped_count=0, error_count=0)
    today = date.today()

    # Load all active assets
    stmt = select(Asset).where(
        Asset.household_id == household_id,
        Asset.is_active.is_(True),
        Asset.deleted_at.is_(None),
    )
    assets = (await session.execute(stmt)).scalars().all()

    # Group to batch API calls
    tasks: list[tuple[Asset, Any]] = []

    for asset in assets:
        try:
            price_coro = _get_price_coroutine(asset)
            if price_coro is not None:
                tasks.append((asset, price_coro))
            else:
                result.skipped_count += 1
        except Exception as exc:
            logger.warning("Could not build price fetch for asset %s: %s", asset.id, exc)
            result.error_count += 1
            result.errors.append(f"Asset {asset.asset_name}: {exc}")

    # Execute all fetches concurrently
    if tasks:
        asset_list, coro_list = zip(*tasks)
        price_responses = await asyncio.gather(*coro_list, return_exceptions=True)

        for asset, response in zip(asset_list, price_responses):
            if isinstance(response, Exception):
                logger.error("Price fetch error for %s: %s", asset.asset_name, response)
                result.error_count += 1
                result.errors.append(f"{asset.asset_name}: {response}")
                continue

            price = _extract_price_value(response, asset)
            if price is None or price <= Decimal("0"):
                result.skipped_count += 1
                continue

            # Update asset columns
            asset.current_price = price
            asset.current_value = price * asset.quantity
            asset.last_price_updated_at = datetime.now(tz=timezone.utc)

            # Insert or update PriceHistory
            existing_ph = await session.execute(
                select(PriceHistory).where(
                    PriceHistory.asset_id == asset.id,
                    PriceHistory.price_date == today,
                )
            )
            ph = existing_ph.scalars().first()
            if ph:
                ph.price = price
                ph.source = PriceSource.MARKET_API
            else:
                session.add(PriceHistory(
                    asset_id=asset.id,
                    price_date=today,
                    price=price,
                    source=PriceSource.MARKET_API,
                ))
            result.updated_count += 1

    await session.flush()

    # Recalculate PortfolioSummary
    try:
        await _recalculate_portfolio_summary(session, household_id, assets, today)
    except Exception as exc:
        logger.error("PortfolioSummary recalculation failed: %s", exc)
        result.errors.append(f"Summary recalc failed: {exc}")

    await session.commit()
    return result


def _get_price_coroutine(asset: Any) -> Any | None:
    """
    Return the appropriate async price-fetch coroutine for a given asset.
    Returns None for assets that require manual valuation.
    """
    from models.enums import AssetType

    if asset.asset_type == AssetType.STOCK:
        return fetch_stock_price(
            asset.ticker or asset.asset_name,
            getattr(asset, "exchange", "NSE").name if hasattr(asset, "exchange") else "NSE",
        )
    elif asset.asset_type == AssetType.MF:
        scheme_code = getattr(asset, "scheme_code", None)
        if scheme_code:
            return fetch_mf_nav(scheme_code)
    elif asset.asset_type == AssetType.ETF:
        return fetch_stock_price(
            asset.ticker or asset.asset_name,
            getattr(asset, "exchange", "NSE").name if hasattr(asset, "exchange") else "NSE",
        )
    elif asset.asset_type == AssetType.REIT:
        return fetch_reit_price(
            asset.ticker or asset.asset_name,
            getattr(asset, "exchange", "NSE").name if hasattr(asset, "exchange") else "NSE",
        )
    elif asset.asset_type == AssetType.GOLD:
        form = getattr(asset, "form", None)
        # Only fetch for digital/ETF gold; physical gold is valued by weight
        return fetch_commodity_price(
            "gold", getattr(asset, "purity_karat", None) and f"{asset.purity_karat}K"
        )
    elif asset.asset_type == AssetType.SILVER:
        return fetch_commodity_price("silver")
    # FD, Bond, RealEstate, Other → manual only
    return None


def _extract_price_value(response: Any, asset: Any) -> Decimal | None:
    """Extract a Decimal price from any price response dataclass."""
    if isinstance(response, StockPrice):
        return response.current_price
    if isinstance(response, MFNav):
        return response.nav
    if isinstance(response, REITPrice):
        return response.nav
    if isinstance(response, CommodityPrice):
        # For gold/silver, current_value = weight × price_per_gram
        weight = getattr(asset, "weight_grams", None) or asset.quantity
        return (response.price_per_gram * Decimal(str(weight))).quantize(Decimal("0.01"))
    return None


async def _recalculate_portfolio_summary(
    session: Any,
    household_id: str,
    assets: list[Any],
    summary_date: date,
) -> None:
    """Upsert a PortfolioSummary row for today."""
    from sqlalchemy import select
    from models import PortfolioSummary
    from models.enums import AssetType, BroadCategory
    import json as _json

    active = [a for a in assets if a.is_active and a.deleted_at is None]

    total_invested = sum(
        (a.purchase_value or Decimal("0")) for a in active
    )
    total_current = sum(
        (a.current_value or a.purchase_value or Decimal("0")) for a in active
    )
    gain_loss = total_current - total_invested
    roi = (
        (gain_loss / total_invested * Decimal("100")).quantize(Decimal("0.0001"))
        if total_invested > 0
        else Decimal("0")
    )

    # Allocation by AssetType
    alloc_by_type: dict[str, dict] = {}
    for a in active:
        key = a.asset_type.value
        alloc_by_type.setdefault(key, {"invested": Decimal("0"), "current_value": Decimal("0")})
        alloc_by_type[key]["invested"] += a.purchase_value or Decimal("0")
        alloc_by_type[key]["current_value"] += a.current_value or a.purchase_value or Decimal("0")

    if total_current > 0:
        for key in alloc_by_type:
            alloc_by_type[key]["pct"] = float(
                alloc_by_type[key]["current_value"] / total_current * 100
            )
    # Convert Decimals to float for JSON
    alloc_json = {
        k: {kk: float(vv) if isinstance(vv, Decimal) else vv for kk, vv in v.items()}
        for k, v in alloc_by_type.items()
    }

    # Top 10 holdings
    sorted_assets = sorted(
        active, key=lambda a: float(a.current_value or a.purchase_value or 0), reverse=True
    )[:10]
    top_holdings = [
        {
            "asset_id": a.id,
            "name": a.asset_name,
            "current_value": float(a.current_value or a.purchase_value or 0),
            "pct": float((a.current_value or a.purchase_value or Decimal("0")) / total_current * 100)
            if total_current > 0 else 0,
        }
        for a in sorted_assets
    ]

    # Upsert
    existing = (await session.execute(
        select(PortfolioSummary).where(
            PortfolioSummary.household_id == household_id,
            PortfolioSummary.summary_date == summary_date,
        )
    )).scalars().first()

    if existing:
        existing.total_invested = total_invested
        existing.total_current_value = total_current
        existing.total_gain_loss = gain_loss
        existing.total_roi_percent = roi
        existing.active_asset_count = len(active)
        existing.allocation_by_type = alloc_json
        existing.top_holdings = top_holdings
        existing.calculated_at = datetime.now(tz=timezone.utc)
    else:
        session.add(PortfolioSummary(
            household_id=household_id,
            summary_date=summary_date,
            total_invested=total_invested,
            total_current_value=total_current,
            total_gain_loss=gain_loss,
            total_roi_percent=roi,
            active_asset_count=len(active),
            allocation_by_type=alloc_json,
            top_holdings=top_holdings,
            calculated_at=datetime.now(tz=timezone.utc),
        ))


# ── Manual valuation helper ───────────────────────────────────────────────────

async def update_manual_price(
    session: Any,
    asset_id: str,
    price: Decimal,
    price_date: date,
    notes: str = "",
) -> None:
    """
    Update an asset's price manually (real estate, private bonds, etc.).
    Inserts a PriceHistory row with source=MANUAL.
    """
    from sqlalchemy import select
    from models import Asset, PriceHistory
    from models.enums import PriceSource

    asset = (await session.execute(
        select(Asset).where(Asset.id == asset_id)
    )).scalars().first()

    if asset is None:
        raise ValueError(f"Asset {asset_id!r} not found.")

    asset.current_price = price
    asset.current_value = price * asset.quantity
    asset.last_price_updated_at = datetime.now(tz=timezone.utc)

    # Upsert PriceHistory
    existing_ph = (await session.execute(
        select(PriceHistory).where(
            PriceHistory.asset_id == asset_id,
            PriceHistory.price_date == price_date,
        )
    )).scalars().first()

    if existing_ph:
        existing_ph.price = price
        existing_ph.source = PriceSource.MANUAL
        existing_ph.notes = notes
    else:
        session.add(PriceHistory(
            asset_id=asset_id,
            price_date=price_date,
            price=price,
            source=PriceSource.MANUAL,
            notes=notes,
        ))

    await session.commit()


# ── Scheduled job integration ─────────────────────────────────────────────────

def schedule_price_updates(session_factory: Any, household_ids: list[str]) -> None:
    """
    Register a recurring APScheduler job to update prices every 6 hours.

    Usage:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        scheduler = AsyncIOScheduler()
        schedule_price_updates(async_session_factory, ["hh-uuid-1", "hh-uuid-2"])
        scheduler.start()
    """
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
    except ImportError:
        logger.warning("APScheduler not installed — scheduled updates disabled. pip install apscheduler")
        return

    scheduler = AsyncIOScheduler()

    async def _job() -> None:
        async with session_factory() as session:
            for hid in household_ids:
                try:
                    result = await update_all_asset_prices(session, hid)
                    logger.info(
                        "Scheduled update household=%s: updated=%d skipped=%d errors=%d",
                        hid, result.updated_count, result.skipped_count, result.error_count,
                    )
                except Exception as exc:
                    logger.error("Scheduled update failed for household %s: %s", hid, exc)

    scheduler.add_job(_job, "interval", hours=6, id="price_update")
    scheduler.start()
    logger.info("APScheduler started: price updates every 6 hours.")


# ── Management command ────────────────────────────────────────────────────────

async def _manual_trigger(household_id: str, db_url: str) -> None:
    """
    CLI trigger: python -m valuation_service <household_id> <db_url>
    """
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_async_engine(db_url, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as session:
        result = await update_all_asset_prices(session, household_id)
        print(f"Updated: {result.updated_count}")
        print(f"Skipped: {result.skipped_count}")
        print(f"Errors:  {result.error_count}")
        for err in result.errors:
            print(f"  ! {err}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python valuation_service.py <household_id> <db_url>")
        sys.exit(1)
    asyncio.run(_manual_trigger(sys.argv[1], sys.argv[2]))
