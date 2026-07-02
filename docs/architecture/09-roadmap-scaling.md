# 09 — Roadmap, Tech-Debt Plan, Scaling to 100k

## Roadmap

**Phase 1 — Foundation (weeks 1–4).** Backend restructure into `app/` layout (03); Alembic init; JWT auth; DataProvider layer in FE + TanStack Query; migrate `.jsx` → `.tsx`; deploy skeleton to Vercel+Render with CI. *Exit: current features working on the new skeleton, mock + live modes.*

**Phase 2 — AI spine (weeks 5–9).** Copilot orchestrator + tool registry + SSE streaming; generative-UI blocks (text, chart, table); portfolio Q&A + simulations; Intake Engine v1 (stocks + MFs); instruments master table + resolver. *Exit: "How diversified am I?" and "I have 200 HDFC shares…" work end-to-end, live and mocked.*

**Phase 3 — Intelligence (weeks 10–14).** Statement Parser v2 (multi-format, review flow); Custom Asset Engine; health score + risk engine; recommendation narration; watchlist + alerts + market SSE. *Exit: full AI-first portfolio experience.*

**Phase 4 — Polish & growth (weeks 15+).** Mobile UX pass, dashboard insight nudges, dividends/earnings calendar, SIP tracker, household views, tax reports (lot-level CG), onboarding tour, waitlist→beta.

**Later:** broker integrations (Zerodha Kite Connect, Groww), Account Aggregator (Sahamati) for auto-sync — this replaces most manual intake and is the real moat; multi-currency; light theme; native mobile shell.

## Tech-Debt Reduction Plan

| Debt | Action | Phase |
|---|---|---|
| `api/portfolio.py` 1,047-line monofile | Decompose into routers/services/repos; schemas out of routes | 1 |
| `.jsx` in a strict-TS project | Migrate to `.tsx`; enable `noUncheckedIndexedAccess` | 1 |
| No auth / tenancy enforcement | JWT + ownership-filtered repository base | 1 |
| Frontend fetches scattered / mock imports | All data through DataProvider; contract tests vs OpenAPI | 1–2 |
| Keyword-match mock AI | MockProvider streams scripted block sequences (keeps demo, kills pretend-AI) | 2 |
| In-process TTL caches (valuation) | Move to Redis; app becomes stateless/horizontally scalable | 2 |
| No tests | pytest + testcontainers on services; vitest on providers/blocks; Playwright smoke. Coverage floor 70% on services | 1→ ongoing |
| Duplicate validation (FE `portfolioValidation` vs BE) | Single source: Pydantic → OpenAPI → generated FE types + rules | 2 |
| BTC demo chart on dashboard | Removed; Markets section instead | 2 |

Rule: every phase deletes at least as much code as it adds until Phase 3.

## Scaling to 100,000 Users

Assume 100k registered, ~10k DAU, peak ~300 RPS reads, ~2k concurrent SSE.

**Compute.** Stateless API (state in PG/Redis) → horizontal scale: 4–8 API instances (Fly `bom` region + `fra` for NRIs), worker pool scaled by queue depth. SSE connections are cheap in async FastAPI (~10k/instance), but put a connection cap per instance and shed to polling gracefully.

**Database.** Neon autoscaling or move to dedicated PG: pgbouncer (transaction pooling), read replica for analytics/AI-context reads, partition `price_history` and `messages` by month. Snapshots table keeps dashboards O(1). At this stage, enable Postgres RLS as defense-in-depth.

**Cache & AI cost (the actual bottleneck).** Portfolio digest cached in Redis, invalidated by events — Claude context assembly does zero DB fanout on hot path. Prompt caching for system prompt + digest (≈70% input-token cut). Model routing: Haiku-class for extract/classify/route, Sonnet-class for reasoning. Per-tier AI quotas; nightly batch jobs (enrichment, embeddings) via Batch API at 50% cost. Target AI COGS < ₹8/DAU/month.

**Pricing providers.** Quote fan-in worker: one refresh per instrument per TTL regardless of user count (already the design); instrument-keyed, not user-keyed. Vendor rate limits respected via token buckets in Redis.

**Extraction triggers (monolith → services).** Split only when a signal fires: statement worker CPU starves the box → separate worker fleet (trivial, same image). AI orchestrator latency/cost isolation needed → extract `ai-service` behind internal HTTP. Market streaming fan-out > ~20k concurrent → dedicated SSE/WebSocket gateway with Redis pub/sub. Everything else stays in the monolith.

**Resilience.** Circuit breakers on all external providers (price APIs, Claude) with stale-serve fallback; outbox pattern for events (upgrade from emit-after-commit); DR: PITR + R2 versioning; chaos test the "backend down → demo mode" path — it's a product feature, keep it honest.
