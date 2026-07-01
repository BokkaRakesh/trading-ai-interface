"""
statement_parser.py — Parse investment/bank statements and return Asset model instances.

Supports:
  BROKER        → StockAsset (one per holding)
  MF            → MutualFundAsset (one per scheme / SIP line)
  ETF           → ETFAsset
  REIT          → REITAsset
  BANK_FD       → FDAsset
  BOND          → BondAsset
  INSURANCE     → OtherAsset  (ULIP / endowment cash value)
  REAL_ESTATE   → RealEstateAsset (partial — flags for manual review)

Usage
─────
    from statement_parser import parse_statement, StatementType

    assets = parse_statement(
        file_path="CDSL_consolidated_2026.pdf",
        statement_type=StatementType.BROKER,
        household_id="hh-uuid",
        created_by="user-uuid",
    )
    for asset in assets:
        session.add(asset)
    session.commit()
"""

from __future__ import annotations

import json
import logging
import re
import textwrap
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from enum import Enum
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── Optional dependencies (graceful import) ───────────────────────────────────

try:
    import pdfplumber  # type: ignore
    _HAS_PDFPLUMBER = True
except ImportError:
    _HAS_PDFPLUMBER = False
    logger.warning("pdfplumber not installed — PDF text extraction will be limited.")

try:
    import pypdf  # type: ignore
    _HAS_PYPDF = True
except ImportError:
    _HAS_PYPDF = False

try:
    import anthropic  # type: ignore
    _HAS_ANTHROPIC = True
except ImportError:
    _HAS_ANTHROPIC = False
    logger.warning("anthropic package not installed — LLM extraction will be skipped.")


# ── Enums & types ─────────────────────────────────────────────────────────────

class StatementType(str, Enum):
    BROKER = "broker"
    MF = "mf"
    ETF = "etf"
    REIT = "reit"
    BANK_FD = "bank_fd"
    BOND = "bond"
    INSURANCE = "insurance"
    REAL_ESTATE = "real_estate"
    AUTO = "auto"          # let parser detect


class ParseConfidence(str, Enum):
    HIGH = "high"          # All required fields extracted cleanly
    MEDIUM = "medium"      # Most fields present; minor gaps filled with defaults
    LOW = "low"            # Significant ambiguity; asset flagged for manual review


@dataclass
class ParsedHolding:
    """Intermediate representation before mapping to an ORM model."""
    raw: dict[str, Any]
    confidence: ParseConfidence = ParseConfidence.MEDIUM
    needs_review: bool = False
    review_reason: str = ""


@dataclass
class ParseResult:
    """Container returned by parse_statement()."""
    statement_type: StatementType
    institution_name: str
    period_from: Optional[date]
    period_to: Optional[date]
    holdings: list[ParsedHolding]
    raw_text: str
    errors: list[str] = field(default_factory=list)

    @property
    def needs_review_count(self) -> int:
        return sum(1 for h in self.holdings if h.needs_review)


# ── Text extraction ───────────────────────────────────────────────────────────

def _extract_text_pdf(file_path: str | Path) -> str:
    """
    Try pdfplumber first (better table extraction), fall back to pypdf.
    """
    path = Path(file_path)
    text_parts: list[str] = []

    if _HAS_PDFPLUMBER:
        try:
            import pdfplumber
            with pdfplumber.open(str(path)) as pdf:
                for page in pdf.pages:
                    t = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
                    text_parts.append(t)
                    # Also extract tables as plain text
                    for table in page.extract_tables():
                        for row in table:
                            if row:
                                text_parts.append(
                                    " | ".join(str(c or "").strip() for c in row)
                                )
            return "\n".join(text_parts)
        except Exception as exc:
            logger.warning("pdfplumber extraction failed: %s — trying pypdf", exc)

    if _HAS_PYPDF:
        try:
            reader = pypdf.PdfReader(str(path))
            for page in reader.pages:
                t = page.extract_text() or ""
                text_parts.append(t)
            return "\n".join(text_parts)
        except Exception as exc:
            logger.error("pypdf extraction failed: %s", exc)

    raise RuntimeError(
        f"Cannot extract text from '{path}'. "
        "Install pdfplumber or pypdf: pip install pdfplumber pypdf"
    )


def _extract_text(file_path: str | Path) -> str:
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _extract_text_pdf(path)
    elif suffix in {".txt", ".csv"}:
        return path.read_text(encoding="utf-8", errors="replace")
    else:
        # Attempt PDF anyway (some files are misnamed)
        try:
            return _extract_text_pdf(path)
        except Exception:
            raise ValueError(f"Unsupported file type: {suffix}")


# ── LLM extraction via Claude ─────────────────────────────────────────────────

_SYSTEM_PROMPT = textwrap.dedent("""
    You are a financial data extractor. Extract structured data from the statement text
    provided by the user.  Return ONLY valid JSON (no markdown fences, no prose).
    If a field is unknown, use null.  Dates must be ISO 8601 (YYYY-MM-DD).
    Numbers must be plain decimals without commas or currency symbols.
""").strip()

_TYPE_PROMPTS: dict[StatementType, str] = {
    StatementType.BROKER: textwrap.dedent("""
        Extract all stock/equity holdings from this broker statement.
        For each holding return a JSON object:
        {
          "asset_name": "Company name",
          "ticker": "NSE/BSE ticker symbol",
          "isin": "ISIN code",
          "exchange": "NSE or BSE",
          "quantity": <number>,
          "purchase_price": <price per share, use average if multiple lots>,
          "purchase_value": <total cost>,
          "purchase_date": "YYYY-MM-DD or null",
          "current_price": <latest price if shown>,
          "current_value": <latest value if shown>,
          "sector": "sector name or null",
          "broker_account": "demat/broker account number or null"
        }
        Return a JSON array of all holdings.
    """).strip(),

    StatementType.MF: textwrap.dedent("""
        Extract all mutual fund holdings/transactions from this statement.
        For each scheme return:
        {
          "scheme_name": "Full scheme name",
          "scheme_code": "AMFI code if shown",
          "isin": "ISIN",
          "fund_house": "AMC name",
          "folio_number": "folio",
          "scheme_type": "EQUITY|DEBT|HYBRID|ELSS|INDEX|LIQUID|GOLD|other",
          "units": <total units held>,
          "nav_at_purchase": <purchase NAV>,
          "purchase_value": <invested amount>,
          "purchase_date": "YYYY-MM-DD",
          "current_nav": <latest NAV if shown>,
          "current_value": <latest value if shown>,
          "is_sip": true or false,
          "sip_amount": <monthly SIP amount or null>,
          "sip_frequency": "MONTHLY|QUARTERLY|null",
          "sip_start_date": "YYYY-MM-DD or null"
        }
        Return a JSON array.
    """).strip(),

    StatementType.ETF: textwrap.dedent("""
        Extract all ETF holdings from this statement.
        For each ETF return:
        {
          "asset_name": "ETF name",
          "ticker": "NSE/BSE ticker",
          "isin": "ISIN",
          "exchange": "NSE or BSE",
          "etf_type": "EQUITY|GOLD|SILVER|DEBT|INTERNATIONAL|REIT|other",
          "underlying_index": "index tracked or null",
          "fund_house": "AMC name",
          "units": <number>,
          "purchase_price": <price per unit>,
          "purchase_value": <total invested>,
          "purchase_date": "YYYY-MM-DD",
          "current_price": <latest price if shown>,
          "current_value": <latest value if shown>
        }
        Return a JSON array.
    """).strip(),

    StatementType.REIT: textwrap.dedent("""
        Extract all REIT holdings from this statement.
        For each REIT return:
        {
          "reit_name": "REIT name",
          "ticker": "NSE/BSE ticker",
          "isin": "ISIN",
          "exchange": "NSE or BSE",
          "units": <number>,
          "nav_at_purchase": <NAV>,
          "purchase_value": <total invested>,
          "purchase_date": "YYYY-MM-DD",
          "current_value": <if shown>,
          "dividend_yield": <annual yield % if shown>,
          "property_type": "OFFICE|RETAIL|WAREHOUSE|MIXED|null"
        }
        Return a JSON array.
    """).strip(),

    StatementType.BANK_FD: textwrap.dedent("""
        Extract all Fixed Deposit details from this bank statement.
        For each FD return:
        {
          "institution_name": "Bank name",
          "fd_account_number": "FD reference number",
          "principal_amount": <principal>,
          "interest_rate": <annual interest rate %>,
          "compounding_frequency": "QUARTERLY|MONTHLY|ANNUAL|SEMI_ANNUAL",
          "deposit_date": "YYYY-MM-DD",
          "maturity_date": "YYYY-MM-DD",
          "maturity_amount": <maturity value if shown>,
          "is_tax_saver": true or false,
          "tds_applicable": true or false,
          "institution_type": "BANK|POST_OFFICE|COMPANY|NBFC"
        }
        Return a JSON array of all FDs found.
    """).strip(),

    StatementType.BOND: textwrap.dedent("""
        Extract all bond holdings from this statement.
        For each bond return:
        {
          "bond_name": "Bond name",
          "isin": "ISIN or null",
          "issuer_name": "Issuer",
          "issuer_type": "GOVERNMENT|PSU|CORPORATE|MUNICIPAL",
          "face_value": <face value per unit>,
          "coupon_rate": <annual coupon %>,
          "coupon_frequency": "ANNUAL|SEMI_ANNUAL|QUARTERLY|MONTHLY|ZERO_COUPON",
          "units": <number of bonds>,
          "purchase_price": <price per bond>,
          "purchase_value": <total invested>,
          "purchase_date": "YYYY-MM-DD",
          "maturity_date": "YYYY-MM-DD",
          "credit_rating": "e.g. AAA, AA+ or null",
          "is_taxfree": true or false,
          "is_listed": true or false
        }
        Return a JSON array.
    """).strip(),

    StatementType.INSURANCE: textwrap.dedent("""
        Extract insurance policy details relevant as an asset (ULIP or endowment plan).
        For each policy return:
        {
          "policy_name": "Policy / plan name",
          "insurer": "Insurance company",
          "policy_number": "policy number",
          "annual_premium": <premium amount>,
          "sum_assured": <sum assured>,
          "fund_value": <current fund value for ULIPs, or surrender value>,
          "maturity_date": "YYYY-MM-DD or null",
          "sub_type": "ULIP|ENDOWMENT|TERM|MONEYBACK",
          "commencement_date": "YYYY-MM-DD"
        }
        Return a JSON array.
    """).strip(),

    StatementType.REAL_ESTATE: textwrap.dedent("""
        Extract property details from this document.
        Return:
        {
          "property_type": "RESIDENTIAL|COMMERCIAL|LAND|INDUSTRIAL|AGRICULTURAL",
          "address_line1": "flat/house/plot details",
          "city": "city",
          "state": "state",
          "country": "India",
          "total_area_sqft": <area in sqft or null>,
          "purchase_price": <sale deed value>,
          "purchase_date": "YYYY-MM-DD",
          "registration_number": "registration number or null",
          "is_under_loan": true or false,
          "loan_outstanding": <outstanding loan if shown>,
          "notes": "any other relevant notes"
        }
        Return a single JSON object (not an array — one document = one property).
    """).strip(),
}


def _llm_extract(
    raw_text: str,
    statement_type: StatementType,
    *,
    max_chars: int = 40_000,
) -> list[dict]:
    """
    Call Claude to extract structured holdings from raw_text.
    Falls back to empty list if anthropic is not installed or API errors out.
    """
    if not _HAS_ANTHROPIC:
        logger.warning(
            "anthropic package not available — returning empty extraction. "
            "Install with: pip install anthropic"
        )
        return []

    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env

    user_prompt = _TYPE_PROMPTS.get(statement_type, "Extract all financial holdings as JSON.")
    truncated = raw_text[:max_chars]
    if len(raw_text) > max_chars:
        logger.info(
            "Statement text truncated from %d to %d chars for LLM.", len(raw_text), max_chars
        )

    full_prompt = f"{user_prompt}\n\nStatement text:\n---\n{truncated}\n---"

    try:
        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=4096,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": full_prompt}],
        )
        raw_json = message.content[0].text.strip()
        result = json.loads(raw_json)
        if isinstance(result, dict):
            result = [result]  # REAL_ESTATE returns single object
        return result
    except json.JSONDecodeError as exc:
        logger.error("LLM returned invalid JSON: %s", exc)
        return []
    except Exception as exc:
        logger.error("LLM extraction failed: %s", exc)
        return []


# ── Auto-detection ────────────────────────────────────────────────────────────

_DETECTION_KEYWORDS: list[tuple[list[str], StatementType]] = [
    (["nsdl", "cdsl", "demat", "equity holding", "stock", "nsebse", "broker"], StatementType.BROKER),
    (["mutual fund", "folio", "scheme name", "nav", "units allotted", "amfi"], StatementType.MF),
    (["etf", "exchange traded fund", "niftybees", "goldbees"], StatementType.ETF),
    (["reit", "real estate investment trust", "distribution per unit"], StatementType.REIT),
    (["fixed deposit", "fd receipt", "maturity amount", "tds deducted"], StatementType.BANK_FD),
    (["government securities", "coupon rate", "face value", "g-sec", "bond"], StatementType.BOND),
    (["policy number", "sum assured", "insurance", "ulip", "premium"], StatementType.INSURANCE),
    (["sale deed", "registration", "built-up area", "property", "sqft"], StatementType.REAL_ESTATE),
]


def _detect_statement_type(raw_text: str) -> StatementType:
    lower = raw_text.lower()
    scores: dict[StatementType, int] = {}
    for keywords, stype in _DETECTION_KEYWORDS:
        score = sum(1 for kw in keywords if kw in lower)
        if score > 0:
            scores[stype] = score
    if not scores:
        logger.warning("Could not auto-detect statement type; defaulting to BROKER.")
        return StatementType.BROKER
    best = max(scores, key=lambda t: scores[t])
    logger.info("Auto-detected statement type: %s (score=%d)", best, scores[best])
    return best


# ── Safe type coercion helpers ────────────────────────────────────────────────

def _to_decimal(value: Any, default: str = "0") -> Decimal:
    if value is None:
        return Decimal(default)
    try:
        cleaned = re.sub(r"[^\d.\-]", "", str(value))
        return Decimal(cleaned) if cleaned else Decimal(default)
    except InvalidOperation:
        return Decimal(default)


def _to_date(value: Any) -> Optional[date]:
    if not value:
        return None
    try:
        return datetime.strptime(str(value).strip(), "%Y-%m-%d").date()
    except ValueError:
        for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d %b %Y", "%b %d, %Y"):
            try:
                return datetime.strptime(str(value).strip(), fmt).date()
            except ValueError:
                continue
    return None


# ── Model mapping ─────────────────────────────────────────────────────────────

def _validate_required(raw: dict, required_fields: list[str]) -> tuple[bool, str]:
    missing = [f for f in required_fields if not raw.get(f)]
    if missing:
        return False, f"Missing required fields: {', '.join(missing)}"
    return True, ""


def _map_broker(raw: dict, household_id: str, created_by: str, statement_source_id: str) -> ParsedHolding:
    """Map a dict from LLM extraction to a StockAsset-ready payload."""
    from models.enums import AssetType, BroadCategory, EntryMode, Exchange

    ok, reason = _validate_required(raw, ["asset_name", "quantity"])
    confidence = ParseConfidence.HIGH if ok and raw.get("isin") else ParseConfidence.MEDIUM

    # Normalise exchange
    exch_str = str(raw.get("exchange", "NSE")).upper().strip()
    try:
        exchange = Exchange[exch_str]
    except KeyError:
        exchange = Exchange.NSE

    return ParsedHolding(
        raw={
            "asset_type": AssetType.STOCK,
            "household_id": household_id,
            "created_by": created_by,
            "statement_source_id": statement_source_id,
            "entry_mode": EntryMode.STATEMENT,
            "broad_category": BroadCategory.EQUITY,
            "asset_name": raw.get("asset_name", "Unknown Stock"),
            "ticker": raw.get("ticker"),
            "isin": raw.get("isin"),
            "company_name": raw.get("asset_name"),
            "exchange": exchange,
            "sector": raw.get("sector"),
            "broker_account": raw.get("broker_account"),
            "quantity": _to_decimal(raw.get("quantity"), "0"),
            "purchase_price": _to_decimal(raw.get("purchase_price"), "0"),
            "purchase_value": _to_decimal(
                raw.get("purchase_value") or (
                    float(_to_decimal(raw.get("quantity"), "0")) *
                    float(_to_decimal(raw.get("purchase_price"), "0"))
                )
            ),
            "purchase_date": _to_date(raw.get("purchase_date")),
            "current_price": _to_decimal(raw.get("current_price"), "0") or None,
            "current_value": _to_decimal(raw.get("current_value"), "0") or None,
        },
        confidence=confidence,
        needs_review=not ok,
        review_reason=reason,
    )


def _map_mf(raw: dict, household_id: str, created_by: str, statement_source_id: str) -> ParsedHolding:
    from models.enums import AssetType, BroadCategory, EntryMode, SchemeType, SIPFrequency, SIPStatus

    ok, reason = _validate_required(raw, ["scheme_name", "units"])
    confidence = ParseConfidence.HIGH if ok and raw.get("isin") else ParseConfidence.MEDIUM

    scheme_type_str = str(raw.get("scheme_type", "EQUITY")).upper()
    try:
        scheme_type = SchemeType[scheme_type_str]
    except KeyError:
        scheme_type = SchemeType.EQUITY

    sip_freq_str = str(raw.get("sip_frequency") or "").upper()
    try:
        sip_freq = SIPFrequency[sip_freq_str] if sip_freq_str else None
    except KeyError:
        sip_freq = None

    is_sip = bool(raw.get("is_sip"))
    sip_amount = _to_decimal(raw.get("sip_amount"), "0") if is_sip else None

    return ParsedHolding(
        raw={
            "asset_type": AssetType.MF,
            "household_id": household_id,
            "created_by": created_by,
            "statement_source_id": statement_source_id,
            "entry_mode": EntryMode.STATEMENT,
            "broad_category": BroadCategory.EQUITY,
            "asset_name": raw.get("scheme_name", "Unknown Fund"),
            "scheme_name": raw.get("scheme_name"),
            "scheme_code": raw.get("scheme_code"),
            "isin": raw.get("isin"),
            "fund_house": raw.get("fund_house"),
            "folio_number": raw.get("folio_number"),
            "scheme_type": scheme_type,
            "quantity": _to_decimal(raw.get("units"), "0"),
            "nav_at_purchase": _to_decimal(raw.get("nav_at_purchase"), "0"),
            "purchase_value": _to_decimal(raw.get("purchase_value"), "0"),
            "purchase_price": _to_decimal(raw.get("nav_at_purchase"), "0"),
            "purchase_date": _to_date(raw.get("purchase_date")),
            "current_price": _to_decimal(raw.get("current_nav"), "0") or None,
            "current_value": _to_decimal(raw.get("current_value"), "0") or None,
            "sip_status": SIPStatus.ACTIVE if is_sip else SIPStatus.NONE,
            "sip_amount": sip_amount,
            "sip_frequency": sip_freq,
            "sip_start_date": _to_date(raw.get("sip_start_date")),
        },
        confidence=confidence,
        needs_review=not ok,
        review_reason=reason,
    )


def _map_etf(raw: dict, household_id: str, created_by: str, statement_source_id: str) -> ParsedHolding:
    from models.enums import AssetType, BroadCategory, EntryMode, ETFType, Exchange

    ok, reason = _validate_required(raw, ["asset_name", "units"])

    etf_type_str = str(raw.get("etf_type", "EQUITY")).upper()
    try:
        etf_type = ETFType[etf_type_str]
    except KeyError:
        etf_type = ETFType.EQUITY

    exch_str = str(raw.get("exchange", "NSE")).upper()
    try:
        exchange = Exchange[exch_str]
    except KeyError:
        exchange = Exchange.NSE

    return ParsedHolding(
        raw={
            "asset_type": AssetType.ETF,
            "household_id": household_id,
            "created_by": created_by,
            "statement_source_id": statement_source_id,
            "entry_mode": EntryMode.STATEMENT,
            "broad_category": BroadCategory.EQUITY,
            "asset_name": raw.get("asset_name", "Unknown ETF"),
            "ticker": raw.get("ticker"),
            "isin": raw.get("isin"),
            "exchange": exchange,
            "etf_type": etf_type,
            "underlying_index": raw.get("underlying_index"),
            "fund_house": raw.get("fund_house"),
            "quantity": _to_decimal(raw.get("units"), "0"),
            "purchase_price": _to_decimal(raw.get("purchase_price"), "0"),
            "purchase_value": _to_decimal(raw.get("purchase_value"), "0"),
            "purchase_date": _to_date(raw.get("purchase_date")),
            "current_price": _to_decimal(raw.get("current_price"), "0") or None,
            "current_value": _to_decimal(raw.get("current_value"), "0") or None,
        },
        confidence=ParseConfidence.HIGH if ok else ParseConfidence.MEDIUM,
        needs_review=not ok,
        review_reason=reason,
    )


def _map_reit(raw: dict, household_id: str, created_by: str, statement_source_id: str) -> ParsedHolding:
    from models.enums import AssetType, BroadCategory, EntryMode, Exchange, REITPropertyType

    ok, reason = _validate_required(raw, ["reit_name", "units"])

    pt_str = str(raw.get("property_type") or "MIXED").upper()
    try:
        property_type = REITPropertyType[pt_str]
    except KeyError:
        property_type = REITPropertyType.MIXED

    exch_str = str(raw.get("exchange", "NSE")).upper()
    try:
        exchange = Exchange[exch_str]
    except KeyError:
        exchange = Exchange.NSE

    return ParsedHolding(
        raw={
            "asset_type": AssetType.REIT,
            "household_id": household_id,
            "created_by": created_by,
            "statement_source_id": statement_source_id,
            "entry_mode": EntryMode.STATEMENT,
            "broad_category": BroadCategory.REAL_ASSETS,
            "asset_name": raw.get("reit_name", "Unknown REIT"),
            "reit_name": raw.get("reit_name"),
            "ticker": raw.get("ticker"),
            "isin": raw.get("isin"),
            "exchange": exchange,
            "property_type": property_type,
            "quantity": _to_decimal(raw.get("units"), "0"),
            "nav_at_purchase": _to_decimal(raw.get("nav_at_purchase"), "0"),
            "purchase_price": _to_decimal(raw.get("nav_at_purchase"), "0"),
            "purchase_value": _to_decimal(raw.get("purchase_value"), "0"),
            "purchase_date": _to_date(raw.get("purchase_date")),
            "current_value": _to_decimal(raw.get("current_value"), "0") or None,
            "dividend_yield": _to_decimal(raw.get("dividend_yield"), "0") or None,
        },
        confidence=ParseConfidence.HIGH if ok else ParseConfidence.MEDIUM,
        needs_review=not ok,
        review_reason=reason,
    )


def _map_fd(raw: dict, household_id: str, created_by: str, statement_source_id: str) -> ParsedHolding:
    from models.enums import AssetType, BroadCategory, CompoundingFrequency, EntryMode, InstitutionType

    ok, reason = _validate_required(
        raw, ["institution_name", "principal_amount", "maturity_date"]
    )

    comp_str = str(raw.get("compounding_frequency", "QUARTERLY")).upper()
    try:
        comp_freq = CompoundingFrequency[comp_str]
    except KeyError:
        comp_freq = CompoundingFrequency.QUARTERLY

    inst_str = str(raw.get("institution_type", "BANK")).upper()
    try:
        inst_type = InstitutionType[inst_str]
    except KeyError:
        inst_type = InstitutionType.BANK

    principal = _to_decimal(raw.get("principal_amount"), "0")

    return ParsedHolding(
        raw={
            "asset_type": AssetType.FD,
            "household_id": household_id,
            "created_by": created_by,
            "statement_source_id": statement_source_id,
            "entry_mode": EntryMode.STATEMENT,
            "broad_category": BroadCategory.DEBT,
            "asset_name": f"{raw.get('institution_name', 'FD')} — FD",
            "institution_name": raw.get("institution_name"),
            "institution_type": inst_type,
            "fd_account_number": raw.get("fd_account_number"),
            "quantity": Decimal("1"),
            "purchase_price": principal,
            "purchase_value": principal,
            "purchase_date": _to_date(raw.get("deposit_date")),
            "current_price": principal,   # FDs don't appreciate until maturity
            "current_value": principal,
            "interest_rate": _to_decimal(raw.get("interest_rate"), "0"),
            "compounding_frequency": comp_freq,
            "deposit_date": _to_date(raw.get("deposit_date")),
            "maturity_date": _to_date(raw.get("maturity_date")),
            "maturity_amount": _to_decimal(raw.get("maturity_amount"), "0") or None,
            "is_auto_renew": bool(raw.get("is_auto_renew", False)),
            "is_tax_saver": bool(raw.get("is_tax_saver", False)),
            "tds_applicable": bool(raw.get("tds_applicable", True)),
        },
        confidence=ParseConfidence.HIGH if ok else ParseConfidence.LOW,
        needs_review=not ok,
        review_reason=reason,
    )


def _map_bond(raw: dict, household_id: str, created_by: str, statement_source_id: str) -> ParsedHolding:
    from models.enums import (
        AssetType, BroadCategory, CouponFrequency, EntryMode, IssuerType,
    )

    ok, reason = _validate_required(raw, ["bond_name", "units"])

    cf_str = str(raw.get("coupon_frequency", "SEMI_ANNUAL")).upper().replace("-", "_")
    try:
        coupon_freq = CouponFrequency[cf_str]
    except KeyError:
        coupon_freq = CouponFrequency.SEMI_ANNUAL

    it_str = str(raw.get("issuer_type", "CORPORATE")).upper()
    try:
        issuer_type = IssuerType[it_str]
    except KeyError:
        issuer_type = IssuerType.CORPORATE

    return ParsedHolding(
        raw={
            "asset_type": AssetType.BOND,
            "household_id": household_id,
            "created_by": created_by,
            "statement_source_id": statement_source_id,
            "entry_mode": EntryMode.STATEMENT,
            "broad_category": BroadCategory.DEBT,
            "asset_name": raw.get("bond_name", "Unknown Bond"),
            "bond_name": raw.get("bond_name"),
            "isin": raw.get("isin"),
            "issuer_name": raw.get("issuer_name"),
            "issuer_type": issuer_type,
            "face_value": _to_decimal(raw.get("face_value"), "1000"),
            "coupon_rate": _to_decimal(raw.get("coupon_rate"), "0"),
            "coupon_frequency": coupon_freq,
            "quantity": _to_decimal(raw.get("units"), "1"),
            "purchase_price": _to_decimal(raw.get("purchase_price"), "0"),
            "purchase_value": _to_decimal(raw.get("purchase_value"), "0"),
            "purchase_date": _to_date(raw.get("purchase_date")),
            "maturity_date": _to_date(raw.get("maturity_date")),
            "credit_rating": raw.get("credit_rating"),
            "is_taxfree": bool(raw.get("is_taxfree", False)),
            "is_listed": bool(raw.get("is_listed", True)),
        },
        confidence=ParseConfidence.HIGH if ok else ParseConfidence.MEDIUM,
        needs_review=not ok,
        review_reason=reason,
    )


def _map_insurance(raw: dict, household_id: str, created_by: str, statement_source_id: str) -> ParsedHolding:
    from models.enums import AssetType, BroadCategory, EntryMode, OtherAssetSubType

    ok, reason = _validate_required(raw, ["policy_name", "insurer"])
    fund_value = _to_decimal(raw.get("fund_value"), "0")
    premium = _to_decimal(raw.get("annual_premium"), "0")

    return ParsedHolding(
        raw={
            "asset_type": AssetType.OTHER,
            "household_id": household_id,
            "created_by": created_by,
            "statement_source_id": statement_source_id,
            "entry_mode": EntryMode.STATEMENT,
            "broad_category": BroadCategory.OTHER,
            "asset_name": f"{raw.get('insurer', 'Insurance')} — {raw.get('policy_name', 'Policy')}",
            "sub_type": OtherAssetSubType.OTHER,
            "institution_name": raw.get("insurer"),
            "account_number": raw.get("policy_number"),
            "quantity": Decimal("1"),
            "purchase_price": premium,
            "purchase_value": fund_value or premium,
            "purchase_date": _to_date(raw.get("commencement_date")),
            "current_price": fund_value or None,
            "current_value": fund_value or None,
            "maturity_date": _to_date(raw.get("maturity_date")),
            "notes": (
                f"Sum assured: {raw.get('sum_assured', 'unknown')}. "
                f"Sub-type: {raw.get('sub_type', 'unknown')}."
            ),
        },
        confidence=ParseConfidence.MEDIUM,
        needs_review=True,
        review_reason="Insurance assets require manual review for accurate valuation.",
    )


def _map_real_estate(raw: dict, household_id: str, created_by: str, statement_source_id: str) -> ParsedHolding:
    from models.enums import AssetType, BroadCategory, EntryMode, PropertyType

    ok, reason = _validate_required(raw, ["city"])

    pt_str = str(raw.get("property_type", "RESIDENTIAL")).upper()
    try:
        prop_type = PropertyType[pt_str]
    except KeyError:
        prop_type = PropertyType.RESIDENTIAL

    purchase_price = _to_decimal(raw.get("purchase_price"), "0")

    return ParsedHolding(
        raw={
            "asset_type": AssetType.REAL_ESTATE,
            "household_id": household_id,
            "created_by": created_by,
            "statement_source_id": statement_source_id,
            "entry_mode": EntryMode.STATEMENT,
            "broad_category": BroadCategory.REAL_ASSETS,
            "asset_name": (
                f"{raw.get('property_type', 'Property')} — "
                f"{raw.get('city', 'Unknown City')}"
            ),
            "property_type": prop_type,
            "address_line1": raw.get("address_line1"),
            "city": raw.get("city"),
            "state": raw.get("state"),
            "country": raw.get("country", "India"),
            "registration_number": raw.get("registration_number"),
            "quantity": Decimal("1"),
            "purchase_price": purchase_price,
            "purchase_value": purchase_price,
            "purchase_date": _to_date(raw.get("purchase_date")),
            "current_price": None,
            "current_value": None,
            "is_under_loan": bool(raw.get("is_under_loan", False)),
            "loan_outstanding": _to_decimal(raw.get("loan_outstanding"), "0") or None,
            "notes": raw.get("notes", ""),
        },
        confidence=ParseConfidence.LOW,
        needs_review=True,
        review_reason=(
            "Real estate: LLM extraction may miss legal nuances. "
            "Verify registration number, area, and loan details."
        ),
    )


_MAPPERS = {
    StatementType.BROKER: _map_broker,
    StatementType.MF: _map_mf,
    StatementType.ETF: _map_etf,
    StatementType.REIT: _map_reit,
    StatementType.BANK_FD: _map_fd,
    StatementType.BOND: _map_bond,
    StatementType.INSURANCE: _map_insurance,
    StatementType.REAL_ESTATE: _map_real_estate,
}


# ── Duplicate detection ───────────────────────────────────────────────────────

def _check_duplicates(
    holdings: list[ParsedHolding],
    existing_isins: set[str],
) -> list[ParsedHolding]:
    """
    Flag holdings whose ISIN already exists in the caller-supplied set.
    The caller is responsible for building existing_isins from the DB.
    """
    for h in holdings:
        isin = h.raw.get("isin")
        if isin and isin in existing_isins:
            h.needs_review = True
            h.review_reason = (
                f"Duplicate: ISIN {isin} already exists in this household. "
                "Verify before inserting to avoid double-counting."
            )
            h.confidence = ParseConfidence.LOW
    return holdings


# ── Public API ────────────────────────────────────────────────────────────────

def parse_statement(
    file_path: str | Path,
    statement_type: str | StatementType = StatementType.AUTO,
    *,
    household_id: str,
    created_by: str,
    statement_source_id: str = "",
    existing_isins: set[str] | None = None,
) -> ParseResult:
    """
    Parse an investment statement file and return a ParseResult.

    Args:
        file_path:            Path to PDF, TXT, or CSV file.
        statement_type:       One of StatementType values, or AUTO for detection.
        household_id:         UUID of the owning household.
        created_by:           UUID of the uploading user.
        statement_source_id:  UUID of the StatementSource row (set after DB insert).
        existing_isins:       Set of ISIN strings already in the household DB
                              (used for duplicate detection).

    Returns:
        ParseResult with .holdings (list of ParsedHolding) and .errors.
    """
    path = Path(file_path)
    errors: list[str] = []

    # 1. Extract text
    try:
        raw_text = _extract_text(path)
    except Exception as exc:
        logger.error("Text extraction failed for %s: %s", path, exc)
        return ParseResult(
            statement_type=StatementType.AUTO,
            institution_name="unknown",
            period_from=None,
            period_to=None,
            holdings=[],
            raw_text="",
            errors=[f"Text extraction failed: {exc}"],
        )

    # 2. Resolve statement type
    if isinstance(statement_type, str):
        statement_type = StatementType(statement_type)
    if statement_type == StatementType.AUTO:
        statement_type = _detect_statement_type(raw_text)

    # 3. Extract institution name & period from raw text (best-effort regex)
    institution_name = _extract_institution_name(raw_text, statement_type)
    period_from, period_to = _extract_period(raw_text)

    # 4. LLM extraction
    extracted_dicts = _llm_extract(raw_text, statement_type)
    if not extracted_dicts:
        errors.append(
            "LLM extraction returned no holdings. "
            "Check ANTHROPIC_API_KEY or use manual entry."
        )

    # 5. Map to ParsedHolding
    mapper = _MAPPERS.get(statement_type)
    if mapper is None:
        errors.append(f"No mapper registered for statement type: {statement_type}")
        return ParseResult(
            statement_type=statement_type,
            institution_name=institution_name,
            period_from=period_from,
            period_to=period_to,
            holdings=[],
            raw_text=raw_text,
            errors=errors,
        )

    holdings: list[ParsedHolding] = []
    for raw_dict in extracted_dicts:
        try:
            holding = mapper(raw_dict, household_id, created_by, statement_source_id)
            holdings.append(holding)
        except Exception as exc:
            logger.warning("Failed to map holding %s: %s", raw_dict, exc)
            errors.append(f"Mapping error for {raw_dict.get('asset_name', '?')}: {exc}")

    # 6. Duplicate check
    if existing_isins:
        holdings = _check_duplicates(holdings, existing_isins)

    logger.info(
        "Parsed %s: %d holdings, %d need review, %d errors.",
        path.name,
        len(holdings),
        sum(1 for h in holdings if h.needs_review),
        len(errors),
    )

    return ParseResult(
        statement_type=statement_type,
        institution_name=institution_name,
        period_from=period_from,
        period_to=period_to,
        holdings=holdings,
        raw_text=raw_text,
        errors=errors,
    )


# ── Best-effort metadata extraction ──────────────────────────────────────────

def _extract_institution_name(text: str, stype: StatementType) -> str:
    patterns = [
        r"(HDFC Bank|ICICI Bank|SBI|Axis Bank|Kotak|Yes Bank|Bank of Baroda)",
        r"(Zerodha|Groww|CDSL|NSDL|Angel One|Upstox|Motilal Oswal|ICICI Direct)",
        r"(PPFAS|Mirae|DSP|Nippon|SBI MF|HDFC MF|ICICI Pru MF|Axis MF|Kotak MF)",
        r"(LIC|HDFC Life|ICICI Prudential Life|SBI Life|Max Life|Bajaj Allianz)",
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(0)
    return "Unknown Institution"


def _extract_period(text: str) -> tuple[Optional[date], Optional[date]]:
    date_pattern = r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b"
    matches = re.findall(date_pattern, text)
    dates = [d for raw in matches if (d := _to_date(raw)) is not None]
    if len(dates) >= 2:
        return min(dates), max(dates)
    if len(dates) == 1:
        return dates[0], dates[0]
    return None, None
