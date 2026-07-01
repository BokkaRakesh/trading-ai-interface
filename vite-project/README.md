# TradingAI — Smart Trading & Portfolio Assistant

A full-stack personal finance dashboard for Indian retail investors. Combines a live trading chart, AI chat assistant, household expense tracker, personalised investment advisor, and a complete multi-asset-class portfolio manager — all in a dark-themed, responsive React interface.

**Stack:** React 19 · TypeScript 6 · Vite 8 · Tailwind CSS v4 · Recharts · Zustand · FastAPI · SQLAlchemy 2 · Claude AI

> Dev server: `http://localhost:5174/`

---

## Pages

| Page | Description |
|---|---|
| **Dashboard** | Trading price chart (BTC/USD) + AI assistant split-panel |
| **Charts** | Full-page resizable price chart with timeframe selector |
| **Chat** | Full-screen AI trading assistant |
| **Portfolio** | Multi-asset portfolio manager + "Invest Smarter" advisor tab |
| **Expenses** | Bank statement upload, transaction list, category analysis |
| **Settings** | App preferences |

---

## Feature Details

### Trading Dashboard
- BTC/USD area/line chart switchable between 1D / 1W / 1M / 3M / 1Y timeframes
- Live price badge with green/red % change
- Resizable split panel — chart left, AI chat right (`ResizablePanel` via drag handle)

### AI Trading Assistant
- ChatGPT-style UI with user + assistant message bubbles, timestamps, auto-scroll
- Mock AI with pattern-matched market responses; swap `mockAIService.ts` for a real LLM call

### Expense Tracker
- **PDF upload** — drag-and-drop, 10 MB limit, animated progress bar, success/error states
- **Transaction list** — sortable columns, 20-per-page pagination, inline delete, edit modal
- **Badges** — color-coded pills for 11 spend categories and 8 payment sources
- **Date filter** — Last Month / Last 3 Months / YTD presets + custom range picker
- **Category pie chart** — Recharts `PieChart` spend breakdown
- **Summary stats** — total spend, count, average, top category
- **Invest Smarter CTA** — contextual banner routes to the advisor tab

### Investment Advisor *(Portfolio → "Invest Smarter" tab)*
Analyses 3 months of spending and generates a personalised plan.

| Section | Content |
|---|---|
| Expense Health Check | Every category rated Essential / Reducible / Debt with spend bars and "could save ₹X" |
| Where You Can Cut | Debt-first warning, then tips for Food / Entertainment / Shopping / Travel with 3 action steps each |
| Where to Invest | SIP split (Nifty 50 / Flexi Cap / Mid Cap); 3 ETFs (NIFTYBEES, JUNIORBEES, GOLDBEES); 4 stocks (HDFCBANK, INFY, RELIANCE, BAJFINANCE) with risk + expected return |
| 5-Year Projection | Monthly SIP slider (₹500–₹50k) × rate presets (FD 7% / ETF 11% / SIP 12% / Mid-cap 16%) → compound table for 1/3/5/10 yr |
| Mistakes to Avoid | 5 investor pitfalls — e.g. holding BNPL debt while investing, panic-selling SIPs |

Essential categories (Family Support, Groceries, Healthcare, Utilities, Commute) are **never** flagged as reducible.

### Portfolio Manager *(Portfolio → "Holdings" tab)*

**Frontend components** (`src/components/portfolio/`):

| Component | Purpose |
|---|---|
| `PortfolioHeader` | Gradient card — total value, invested, gain/loss, ROI, allocation bar by class |
| `AllocationTable` | Sortable table by class with expandable rows showing individual holdings |
| `AssetList` | Search + type-filter + sortable + paginated (20/page) asset table with delete |
| `PerformanceChart` | Area chart — current value vs invested over time (Recharts) |
| `TopPerformers` | Top 3 gainers and losers side-by-side |
| `PortfolioTab` | Main orchestrator; wires all sub-components + "Add Asset" modal + refresh |
| `AddAssetModal` | 10-tile type selector → renders the matching form |

**10 asset entry forms** (`src/components/AssetForms/`):

| Form | Asset Type | Key Fields |
|---|---|---|
| `StockForm` | STOCK | Ticker, ISIN, exchange, sector, broker account |
| `MutualFundForm` | MF | AMFI code, ISIN, folio, SIP toggle (amount + frequency) |
| `ETFForm` | ETF | Quick-select presets, underlying index, expense ratio |
| `REITForm` | REIT | Known REIT presets, property type, dividend yield |
| `GoldForm` | GOLD | Form (physical/digital/ETF/SGB), purity karat, weight in grams |
| `SilverForm` | SILVER | Form, fineness (999/925/900/800), weight in grams |
| `RealEstateForm` | REAL_ESTATE | 4-step wizard — location → details → financials → review |
| `BondForm` | BOND | Issuer type, coupon rate, frequency, credit rating, maturity |
| `FixedDepositForm` | FD | Institution, interest rate, compounding, auto-calculates maturity amount |
| `OtherAssetForm` | OTHER | Sub-types: PPF, NSC, EPF, NPS, Crypto, Unlisted Equity, etc. |

**Pages** (`src/pages/`):

- `AssetDetailPage.jsx` — key metrics grid, value history line chart, events list, inline notes, "Update Price" modal, delete confirm
- `HouseholdPortfolioView.jsx` — combined net-worth card, per-member expandable cards with mini Recharts donut, consolidated table toggle

**Validation** (`src/utils/portfolioValidation.js`):
- `validateAsset(values, assetType)` — field-level rules for all 10 types
- `warnConcentration(assets, totalValue)` — flags >50% single asset, >70% debt, >90% equity, >40% single sector
- `warnLTV(loanOutstanding, currentValue)` — flags >80% loan-to-value on real estate

### Python Backend (`backend/`)

> Run independently of the React app. Requires Python 3.11+.

| File | Purpose |
|---|---|
| `models/` | SQLAlchemy 2 ORM — `Base`, 11 asset classes (joined-table inheritance), `PriceHistory`, `PortfolioSummary`, `User`, `Household` |
| `statement_parser.py` | Parses 8 statement types (broker, MF, ETF, REIT, bank FD, bond, insurance, real estate) via pdfplumber + Claude API → list of `ParsedHolding` |
| `valuation_service.py` | Fetches live prices — Finnhub (stocks/ETFs), mfapi.in (MF NAV), metals-api/goldapi (gold/silver); TTL cache (15 min equity, 60 min commodity, 24 h MF); APScheduler every 6 h |
| `api/portfolio.py` | FastAPI app with 10 REST endpoints (create/list/get/update/delete asset, manual price update, portfolio summary, performance history, statement upload/list) |

---

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 + React Compiler (`babel-plugin-react-compiler`) |
| Language | TypeScript ~6.0 strict mode |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 — CSS-first, no `tailwind.config.js` |
| Charts | Recharts 3.8 |
| Icons | Lucide React 1.16 |
| State | Zustand 5 |
| HTTP (frontend) | `fetch` via thin API client modules |

### Backend

| Layer | Technology |
|---|---|
| API framework | FastAPI (async) |
| ORM | SQLAlchemy 2.0 — `Mapped[T]` + `mapped_column()` |
| Database | SQLite (dev) via `aiosqlite`; swap `DATABASE_URL` for Postgres |
| Migrations | Alembic |
| LLM | Anthropic Claude (`claude-opus-4-5`) — statement parsing |
| Price APIs | Finnhub, mfapi.in, metals-api.com / goldapi.io |
| Scheduler | APScheduler (6-hour price refresh) |
| PDF parsing | pdfplumber + pypdf |
| HTTP client | httpx (async) |

---

## Project Structure

```
trading-ai-interface/
├── vite-project/              ← React frontend
│   ├── index.html
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── chart/         # PriceChart, TradingDashboard, TimeframeSelector
│   │   │   ├── chat/          # ChatWindow, MessageList, ChatInput, MessageBubble
│   │   │   ├── layout/        # MainLayout, Header, Sidebar
│   │   │   ├── ui/            # Button, Card, Badge, Input, LoadingSpinner, ResizablePanel
│   │   │   ├── AssetForms/    # 10 asset forms + AddAssetModal + formHelpers
│   │   │   ├── portfolio/     # PortfolioHeader, AllocationTable, AssetList,
│   │   │   │                  # PerformanceChart, TopPerformers, PortfolioTab
│   │   │   ├── CategoryBadge.jsx
│   │   │   ├── SourceBadge.jsx
│   │   │   ├── CategoryChart.jsx
│   │   │   ├── EditModal.jsx
│   │   │   ├── ExpensesTab.jsx
│   │   │   ├── SummaryStats.jsx
│   │   │   ├── TimeFilter.jsx
│   │   │   ├── TransactionsList.jsx
│   │   │   ├── UploadCard.jsx
│   │   │   └── InvestmentAdvisor.jsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ChartsPage.tsx
│   │   │   ├── ChatPage.tsx
│   │   │   ├── PortfolioPage.tsx   ← renders PortfolioTab or InvestmentAdvisor
│   │   │   ├── PortfolioPage.tsx
│   │   │   ├── AssetDetailPage.jsx
│   │   │   ├── HouseholdPortfolioView.jsx
│   │   │   ├── ExpensesPage.tsx (or similar)
│   │   │   └── SettingsPage.tsx
│   │   ├── services/
│   │   │   ├── mockAIService.ts
│   │   │   ├── mockMarketService.ts
│   │   │   └── mockPortfolioData.js   ← useMockPortfolio() hook
│   │   ├── stores/
│   │   │   ├── uiStore.ts             ← setCurrentPage, PageType
│   │   │   ├── chatStore.ts
│   │   │   └── tradingStore.ts
│   │   ├── api/
│   │   │   ├── portfolioApi.js        ← REST client for FastAPI backend
│   │   │   └── expensesClient.js
│   │   ├── data/
│   │   │   ├── badgeStyles.js
│   │   │   ├── mockExpenses.js
│   │   │   └── expenseAnalysis.js
│   │   ├── types/index.ts
│   │   └── utils/
│   │       ├── helpers.ts
│   │       └── portfolioValidation.js
│   └── package.json
│
└── backend/                   ← Python FastAPI backend
    ├── models/
    │   ├── __init__.py        # re-exports all ORM models + enums
    │   ├── base.py            # DeclarativeBase, mixins (timestamps, soft-delete)
    │   ├── user.py            # User, Household, HouseholdMember
    │   ├── assets.py          # Asset base + 11 subclasses (joined-table inheritance)
    │   └── history.py         # PriceHistory, PortfolioSummary
    ├── api/
    │   ├── __init__.py
    │   └── portfolio.py       # FastAPI app, 10 endpoints, Pydantic schemas
    ├── statement_parser.py    # PDF/CSV → ParseResult via Claude
    ├── valuation_service.py   # Live price fetch, TTL cache, APScheduler
    ├── example_usage.py       # Runnable DB seed script
    └── requirements.txt
```

---

## Getting Started

### Frontend

```bash
cd vite-project
npm install          # Node.js 18+ required
npm run dev          # http://localhost:5174
npm run build        # production build → dist/
npm run preview      # preview production build
```

### Backend

```bash
cd backend
pip install -r requirements.txt
# Set environment variables (see below)
uvicorn api.portfolio:app --reload --port 8000
```

The frontend uses mock data by default (`useMockPortfolio()`). Point it at the live API by setting `VITE_API_BASE=http://localhost:8000` in `.env`.

---

## Environment Variables

### Frontend (`.env` in `vite-project/`)

```
VITE_API_BASE=http://localhost:8000   # backend base URL (optional, defaults to above)
```

### Backend

```
DATABASE_URL=sqlite+aiosqlite:///./portfolio_dev.db   # or postgresql+asyncpg://...
ANTHROPIC_API_KEY=sk-ant-...          # Claude API — statement parsing
FINNHUB_API_KEY=...                   # Stock / ETF / REIT prices
METALS_API_KEY=...                    # Gold / silver prices (primary)
GOLD_API_KEY=...                      # Gold / silver prices (fallback)
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/portfolio/assets` | Create asset (type-dispatched) |
| GET | `/api/portfolio/assets` | List assets — filter by type, sort, paginate |
| GET | `/api/portfolio/assets/{id}` | Asset detail + full price history |
| PUT | `/api/portfolio/assets/{id}` | Update asset fields |
| DELETE | `/api/portfolio/assets/{id}` | Soft delete |
| POST | `/api/portfolio/assets/{id}/update-price` | Manual price entry |
| GET | `/api/portfolio/summary` | Live allocation + top gainers/losers |
| GET | `/api/portfolio/performance` | Historical trend — 3m / 1y / 5y / all |
| POST | `/api/portfolio/statements/upload` | Upload PDF statement (SHA-256 dedup) → parse |
| GET | `/api/portfolio/statements` | List uploaded statements |

CORS is open to `localhost:5174`, `localhost:5173`, `localhost:3000`.

---

## Data Models (key enums)

**Asset types:** `STOCK` `MF` `ETF` `REIT` `GOLD` `SILVER` `REAL_ESTATE` `BOND` `FD` `OTHER`

**Broad categories:** Equity · Real Assets · Debt · Other

**Price sources:** `FINNHUB` `MFAPI` `METALS_API` `GOLDAPI` `MANUAL` `ESTIMATED`

**Statement types:** `BROKER` `MF` `ETF` `REIT` `BANK_FD` `BOND` `INSURANCE` `REAL_ESTATE`

---

## Key Design Decisions

- **React Compiler** — no manual `useMemo`/`useCallback`; the compiler handles memoization automatically.
- **Tailwind v4 CSS-first** — zero config file; all theme tokens live in `src/index.css` under `@theme`.
- **Mock-first frontend** — `mockPortfolioData.js` exports `useMockPortfolio()` matching the API shape exactly; replace the hook with a real `portfolioApi.js` call to go live with zero component changes.
- **Joined-table inheritance (SQLAlchemy)** — `Asset` is the base table; each subtype (e.g. `StockAsset`) has its own table with only the extra columns, joined on `asset_id`. Avoids a wide single-table design.
- **TTL cache in valuation service** — MD5-keyed dict with per-entry expiry; equity 15 min, commodity 60 min, MF NAV 24 h. No external cache dependency.
- **Recharts height fix** — `ResponsiveContainer` is given a pixel `height` prop everywhere so `calculatedHeight` is never `−1`, preventing the "width/height must be greater than 0" console error.
- **Compound growth formula** — SIP projections: `P × ((1+r)ⁿ − 1) / r × (1+r)` where `r = annual_rate / 12` and `n = months`.
- **Statement dedup** — uploaded PDFs are SHA-256 hashed before parsing; re-uploading the same file returns the existing parse result immediately.

---

## Disclaimer

Investment Advisor output is **educational only** and does not constitute SEBI-registered financial advice. Projected returns use historical averages and are not guaranteed. Consult a qualified financial advisor before investing.

---

## Author

**Bokka Rakesh** — [github.com/BokkaRakesh](https://github.com/BokkaRakesh)
