# 01 — System Architecture

## High-Level Architecture

```mermaid
flowchart TB
    subgraph Client["Client — Vercel Edge"]
        SPA["React 19 SPA<br/>Vite · Tailwind v4 · Zustand"]
        DP["DataProvider Layer"]
        MOCK["MockProvider<br/>(demo / offline mode)"]
        API["ApiProvider<br/>(REST + SSE)"]
        SPA --> DP
        DP --> MOCK
        DP --> API
    end

    subgraph Edge["API Gateway"]
        GW["FastAPI · /api/v1<br/>Auth middleware · Rate limit · CORS"]
    end

    subgraph Services["Backend Services (modular monolith)"]
        PORT["Portfolio Service"]
        ASSET["Asset Service"]
        PRICE["Pricing Service"]
        EXP["Expense Service"]
        AI["AI Service<br/>(Copilot orchestrator)"]
        STMT["Statement Parsing Service"]
        REC["Recommendation Service"]
        MKT["Market Intelligence Service"]
    end

    subgraph Async["Async Layer"]
        REDIS[("Redis<br/>cache · pub/sub · queues")]
        ARQ["arq workers<br/>price refresh · parsing · alerts"]
        EVT["Event Bus (Redis Streams)"]
    end

    subgraph Data["Data"]
        PG[("PostgreSQL 16<br/>Neon / Supabase")]
        S3[("Object storage<br/>statements, uploads")]
    end

    subgraph External["External"]
        CLAUDE["Claude API<br/>(tool use + streaming)"]
        FINN["Finnhub / mfapi.in / metals APIs"]
    end

    API -->|HTTPS| GW
    GW --> Services
    Services --> PG
    Services --> REDIS
    STMT --> S3
    AI --> CLAUDE
    PRICE --> FINN
    ARQ --> PG
    ARQ --> REDIS
    Services -.->|domain events| EVT
    EVT -.-> ARQ
```

**Key decision — modular monolith, not microservices.** At this stage (and even at 100k users), one FastAPI deployable with strictly bounded internal modules beats microservices on every axis: latency, cost, operational load, migration coordination. Service boundaries are enforced at the *package* level (no cross-module ORM imports; communication via service interfaces and domain events) so extraction to separate deployables later is mechanical. See 09 for the extraction triggers.

## Detailed Component Diagram

```mermaid
flowchart LR
    subgraph FE["Frontend"]
        direction TB
        PAGES["Pages<br/>Dashboard · Portfolio · Chat · Expenses · Markets · Settings"]
        FEAT["Feature modules<br/>copilot · intake · portfolio · expenses · markets"]
        UIKIT["Design system<br/>ui/ primitives + generative-UI blocks"]
        STORES["Zustand stores<br/>session · portfolio · copilot · market · ui"]
        PROV["DataProvider (Mock | Api)"]
        PAGES --> FEAT --> UIKIT
        FEAT --> STORES --> PROV
    end

    subgraph BE["Backend (app/)"]
        direction TB
        ROUTERS["api/v1 routers"]
        SVC["services/*"]
        DOM["domain models + schemas"]
        REPO["repositories (async SQLAlchemy)"]
        ROUTERS --> SVC --> REPO --> DB[(Postgres)]
        SVC --> DOM
    end

    subgraph AIL["AI Layer"]
        direction TB
        ORCH["Copilot Orchestrator"]
        TOOLS["Tool Registry<br/>get_portfolio · run_simulation · add_asset ..."]
        INTAKE["Intake Engine (slot-filling)"]
        PARSE["Statement Parser v2"]
        ORCH --> TOOLS
        INTAKE --> TOOLS
    end

    PROV -->|REST + SSE| ROUTERS
    SVC <--> ORCH
    TOOLS --> SVC
```

## Enterprise Architecture Principles

1. **AI as an orchestration layer, not a feature.** The AI Service holds no business logic; it translates natural language into typed tool calls against the same services the REST API uses. One source of truth for every calculation.
2. **Contract-first.** Pydantic schemas generate the OpenAPI spec; frontend types are generated from it (`openapi-typescript`). The `DataProvider` interface is the frontend's single contract — Mock and Api implement it identically.
3. **Event-driven where it pays.** Domain events (`asset.created`, `statement.parsed`, `price.updated`, `alert.triggered`) go to Redis Streams; workers consume for enrichment, valuation snapshots, and notifications. Synchronous request path stays simple.
4. **Everything async.** asyncpg + SQLAlchemy async sessions, httpx, SSE streaming. No sync I/O on the request path.
5. **Degrade gracefully.** Pricing provider down → serve last cached price with `stale: true`. Backend down → frontend flips to MockProvider with a visible "demo data" banner. Claude down → copilot returns tool-only deterministic answers where possible.

## Request Flows

**Copilot question** ("How diversified am I?"):
`SPA → POST /api/v1/copilot/chat (SSE) → Orchestrator → Claude (tool use) → tool: get_allocation → Portfolio Service → Postgres → Claude composes answer + chart block spec → SSE tokens + UI blocks → chat renders chart in-message`

**Conversational asset add**:
`SPA → POST /copilot/intake (SSE) → Intake Engine slot-filling loop (entity extraction → symbol/ISIN lookup → missing-field question) → user confirms card → tool: create_asset → Asset Service → event asset.created → worker enriches (sector, ISIN, live price) → portfolio recalc`

**Statement upload**:
`SPA → POST /statements (multipart, multi-file) → S3 → job queued (arq) → detect type → extract (pdfplumber/pandas/vision) → Claude normalize → dedupe/match vs holdings → confidence-scored review set → user confirms low-confidence rows → bulk create → event`
