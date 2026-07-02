# TradingAI — 2026 Architecture Redesign

**Role:** CTO / Chief Architect blueprint. Opinionated. Every decision below says *retain*, *rewrite*, *redesign*, or *remove*.

## Document Map

| Doc | Contents |
|---|---|
| [01-system-architecture.md](01-system-architecture.md) | High-level + component diagrams, enterprise architecture |
| [02-frontend.md](02-frontend.md) | Frontend architecture, folder structure, DataProvider layer |
| [03-backend.md](03-backend.md) | FastAPI modernization, service boundaries, events, jobs |
| [04-ai-architecture.md](04-ai-architecture.md) | AI Copilot, Portfolio Intake Engine, Custom Asset Engine, Statement Parser v2 |
| [05-database.md](05-database.md) | Full PostgreSQL schema (existing + new tables) |
| [06-api-contracts.md](06-api-contracts.md) | REST + SSE API design, versioning, error model |
| [07-ux-redesign.md](07-ux-redesign.md) | Design system, wireframes (dashboard/portfolio/chat/mobile) |
| [08-deployment.md](08-deployment.md) | Vercel + Render/Fly, CI/CD, security & production checklists, cost |
| [09-roadmap-scaling.md](09-roadmap-scaling.md) | Roadmap, tech-debt reduction plan, scaling to 100k users |

## Executive Verdicts

### Retain (already good — do not rewrite)

- **`backend/models/`** — SQLAlchemy 2 joined-table inheritance across 11 asset types, lot-level cost basis, soft delete, UUID PKs. This is genuinely production-grade domain modeling. Extend, don't touch.
- **`valuation_service.py` pricing logic** — provider fan-out (Finnhub / mfapi.in / metals APIs) with TTL caches. Refactor into a `pricing` service module, keep the logic.
- **Mock data & mock workflows** — promoted to a first-class `MockProvider` behind the new `DataProvider` interface (see 02). Mock mode becomes a product feature (demo mode), not scaffolding.
- **Zustand, Recharts, Tailwind v4, Vite, React 19 + Compiler** — correct 2026 stack. No framework churn.

### Rewrite

- **`backend/api/portfolio.py` (1,047 lines)** — single-file FastAPI app with inline schemas. Rewrite into layered services + routers (see 03). Biggest single tech-debt item.
- **`mockAIService.ts` keyword matcher** — replaced by the AI Copilot architecture (tool-calling Claude agent, streaming, rich cards). The mock keeps the *interface* but returns scripted tool results.
- **Chat UI** — rebuilt around streaming, generative UI blocks (charts/tables/asset cards in-message), suggested prompts, and follow-ups (see 04 + 07).

### Redesign

- **Asset onboarding** — 10 separate forms become secondary. Primary path is the conversational **Portfolio Intake Engine** ("I have 200 HDFC Bank shares at ₹1700"). Forms survive as the "manual mode" fallback and as the review/confirm step the AI pre-fills.
- **Statement parsing** — from single-PDF+Claude to multi-format pipeline with confidence scoring, dedupe, and human-in-the-loop confirmation (see 04 §5).
- **Navigation/IA** — Dashboard becomes an AI-first command surface (⌘K omnibox, copilot dock on every page), not a BTC chart demo (see 07).

### Remove

- **BTC/USD demo chart as the Dashboard centerpiece** — it's a prototype artifact. Market charts move into asset detail pages and a Markets section. The Dashboard's hero is *your net worth and your copilot*, like Robinhood/INDmoney — not a random symbol.
- **`example_usage.py`** from the deploy artifact (keep in `/scripts` or tests).
- **`.jsx` files mixed into a TS project** (`AssetDetailPage.jsx`, `HouseholdPortfolioView.jsx`, expense components) — migrate to `.tsx` during the restructure; strict mode everywhere.
- **CORS wildcard-ish dev config in production builds** — env-driven origins only.

## North-Star Product Framing

TradingAI is not "a dashboard with a chatbot." It is a **conversational wealth OS**:

1. **Everything can be done by talking** (add assets, analyze, simulate, plan) — the GUI is the confirmation and visualization surface.
2. **Everything the AI says is grounded** in the user's own portfolio/expense data through a tool layer — no hallucinated numbers; the LLM never does arithmetic, tools do.
3. **Works offline from the backend** — MockProvider makes the entire product demoable with zero infrastructure.
