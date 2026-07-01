"""
Quick-start: create all tables and insert example records.

    python backend/example_usage.py
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models import (
    Base,
    AssetType,
    BondAsset,
    BroadCategory,
    EntryMode,
    Exchange,
    FDAsset,
    GoldAsset,
    GoldForm,
    Household,
    HouseholdMember,
    HouseholdRole,
    InstitutionType,
    CompoundingFrequency,
    IssuerType,
    CouponFrequency,
    MutualFundAsset,
    PriceHistory,
    PriceSource,
    SIPFrequency,
    SIPStatus,
    SchemeType,
    StockAsset,
    User,
)

# ── Engine (SQLite for local dev; swap for PostgreSQL in prod) ────────────────

engine = create_engine("sqlite:///portfolio_dev.db", echo=False)
Base.metadata.create_all(engine)

# ── Seed data ─────────────────────────────────────────────────────────────────

with Session(engine) as session:

    # 1. User
    rakesh = User(
        email="rakesh@example.com",
        full_name="Bokka Rakesh",
        phone="+919876543210",
    )
    session.add(rakesh)
    session.flush()  # get rakesh.id

    # 2. Household
    hh = Household(
        name="Bokka Rakesh — Personal",
        owner_id=rakesh.id,
        base_currency="INR",
    )
    session.add(hh)
    session.flush()

    # Household member (owner)
    session.add(HouseholdMember(
        household_id=hh.id,
        user_id=rakesh.id,
        role=HouseholdRole.OWNER,
    ))

    # 3. Stock — HDFCBANK
    hdfc = StockAsset(
        household_id=hh.id,
        created_by=rakesh.id,
        asset_name="HDFCBANK — Lot 1",
        broad_category=BroadCategory.EQUITY,
        entry_mode=EntryMode.MANUAL,
        purchase_date=date(2024, 6, 15),
        quantity=Decimal("50"),
        purchase_price=Decimal("1580.00"),
        purchase_value=Decimal("79000.00"),  # incl. brokerage
        ticker="HDFCBANK",
        company_name="HDFC Bank Ltd",
        exchange=Exchange.NSE,
        isin="INE040A01034",
        sector="Banking",
        face_value=Decimal("1.00"),
    )
    session.add(hdfc)
    session.flush()

    # Price history for HDFCBANK
    session.add(PriceHistory(
        asset_id=hdfc.id,
        price_date=date(2026, 7, 1),
        price=Decimal("1740.50"),
        source=PriceSource.MARKET_API,
    ))

    # 4. Mutual Fund — Parag Parikh Flexi Cap (SIP)
    ppfas = MutualFundAsset(
        household_id=hh.id,
        created_by=rakesh.id,
        asset_name="Parag Parikh Flexi Cap — SIP May 2026",
        broad_category=BroadCategory.EQUITY,
        entry_mode=EntryMode.MANUAL,
        purchase_date=date(2026, 5, 10),
        quantity=Decimal("32.456"),       # units allotted
        purchase_price=Decimal("92.43"),  # NAV on allotment date
        purchase_value=Decimal("3000.00"),
        scheme_name="Parag Parikh Flexi Cap Fund — Direct Growth",
        scheme_code="122639",
        isin="INF879O01027",
        fund_house="PPFAS Mutual Fund",
        scheme_type=SchemeType.EQUITY,
        folio_number="4567890",
        nav_at_purchase=Decimal("92.43"),
        sip_status=SIPStatus.ACTIVE,
        sip_amount=Decimal("3000"),
        sip_frequency=SIPFrequency.MONTHLY,
        sip_start_date=date(2024, 1, 10),
    )
    session.add(ppfas)

    # 5. Gold — Physical (22K hallmarked)
    gold = GoldAsset(
        household_id=hh.id,
        created_by=rakesh.id,
        asset_name="Gold Chain (22K, 10g)",
        broad_category=BroadCategory.COMMODITY,
        entry_mode=EntryMode.MANUAL,
        purchase_date=date(2022, 11, 5),
        quantity=Decimal("10"),          # 10 grams
        purchase_price=Decimal("5250"),  # ₹5,250 per gram
        purchase_value=Decimal("52500"),
        form=GoldForm.PHYSICAL,
        weight_grams=Decimal("10"),
        purity_karat=22,
        purity_percent=Decimal("91.67"),
        hallmarked=True,
    )
    session.add(gold)

    # 6. Fixed Deposit — SBI
    fd = FDAsset(
        household_id=hh.id,
        created_by=rakesh.id,
        asset_name="SBI FD — 1 Year",
        broad_category=BroadCategory.DEBT,
        entry_mode=EntryMode.MANUAL,
        purchase_date=date(2026, 1, 15),
        quantity=Decimal("1"),            # single FD
        purchase_price=Decimal("100000"),
        purchase_value=Decimal("100000"),
        institution_name="State Bank of India",
        institution_type=InstitutionType.BANK,
        fd_account_number="FD2026011500123",
        interest_rate=Decimal("6.80"),
        compounding_frequency=CompoundingFrequency.QUARTERLY,
        deposit_date=date(2026, 1, 15),
        maturity_date=date(2027, 1, 15),
        maturity_amount=Decimal("107026.00"),
        is_auto_renew=False,
        tds_applicable=True,
    )
    session.add(fd)

    # 7. Bond — 7.26% GOI 2033
    bond = BondAsset(
        household_id=hh.id,
        created_by=rakesh.id,
        asset_name="GOI 7.26% 2033 — 5 units",
        broad_category=BroadCategory.DEBT,
        entry_mode=EntryMode.MANUAL,
        purchase_date=date(2025, 3, 20),
        quantity=Decimal("5"),
        purchase_price=Decimal("10000"),
        purchase_value=Decimal("50000"),
        bond_name="Government of India 7.26% 2033",
        isin="IN0020210027",
        issuer_name="Government of India",
        issuer_type=IssuerType.GOVERNMENT,
        face_value=Decimal("10000"),
        coupon_rate=Decimal("7.26"),
        coupon_frequency=CouponFrequency.SEMI_ANNUAL,
        maturity_date=date(2033, 8, 22),
        is_taxfree=False,
        is_listed=True,
    )
    session.add(bond)

    session.commit()
    print("✓ All tables created and seed records inserted.")
    print(f"  User:       {rakesh.id}")
    print(f"  Household:  {hh.id}")
    print(f"  Stock:      {hdfc.id}")
    print(f"  MF:         {ppfas.id}")
    print(f"  Gold:       {gold.id}")
    print(f"  FD:         {fd.id}")
    print(f"  Bond:       {bond.id}")
