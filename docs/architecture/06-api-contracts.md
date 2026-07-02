# 06 — API Design (/api/v1)

Conventions: versioned prefix, plural nouns, cursor pagination (`?cursor=&limit=`), RFC 9457 problem-details errors, idempotency keys on uploads/bulk writes, JWT auth (httpOnly cookie or bearer). OpenAPI is the contract — frontend types generated from it.

## Endpoint Map

```
AUTH
POST   /auth/register | /auth/login | /auth/refresh | /auth/logout
GET    /auth/me

ASSETS
GET    /assets?type=&search=&cursor=            list (paginated, filterable)
POST   /assets                                  create (typed by asset_type discriminator)
GET    /assets/{id}                             detail + price history + events
PATCH  /assets/{id}                             partial update
DELETE /assets/{id}                             soft delete
POST   /assets/{id}/price                       manual mark
POST   /assets/bulk                             bulk create (statement confirm path)
POST   /custom-asset-types                      create template (AI-suggested or manual)
GET    /custom-asset-types

PORTFOLIO
GET    /portfolio/summary                       totals, gain/loss, ROI, health score
GET    /portfolio/allocation?by=class|sector|geo
GET    /portfolio/performance?range=1M|1Y|ALL   from snapshots
GET    /portfolio/exposure                      concentration + risk flags
GET    /portfolio/performers?order=worst|best

EXPENSES  (retain current shape, move under /api/v1)
GET/POST/PATCH/DELETE /expenses ...             + GET /expenses/analytics

COPILOT (SSE)
POST   /copilot/conversations                   create
GET    /copilot/conversations?cursor=           history
POST   /copilot/conversations/{id}/messages     → text/event-stream (blocks protocol, see 02)
POST   /copilot/confirm                         {confirm_token, edits?} → executes guarded mutation
GET    /copilot/suggestions?page_context=       context-aware prompt chips

INTAKE (SSE)
POST   /intake/sessions                         start ("I have 200 HDFC…") → stream: extraction + first question
POST   /intake/sessions/{id}/answers            answer a question → stream: next question | ReviewCard
POST   /intake/sessions/{id}/confirm            create asset from ReviewCard (with user edits)

STATEMENTS
POST   /statements                              multipart multi-file → 202 {job_ids}
GET    /statements/{id}                         status + confidence summary
GET    /statements/{id}/review                  parsed_rows needing confirmation
POST   /statements/{id}/confirm                 {accept:[row_ids], edits:{}, skip:[]}

MARKET
GET    /market/search?q=                        instrument resolver (also used by intake)
GET    /market/quotes?symbols=                  batch quotes (cached)
GET    /market/stream                           SSE quote/alert push
GET/POST/DELETE /watchlists, /watchlists/{id}/items
GET/POST/PATCH  /alerts
GET    /market/calendar?kind=earnings|dividends&range=

RECOMMENDATIONS
GET    /recommendations/plan                    advisor plan (rules + AI narration)
POST   /simulations/sip | /simulations/goal | /simulations/retirement
```

## Representative Contracts

**POST /intake/sessions** → SSE

```json
// request
{"message": "I have 200 HDFC Bank shares purchased at ₹1700"}
// stream events
{"event":"extracted","data":{"asset_type":"STOCK","confidence":0.97,
  "slots":{"quantity":200,"purchase_price":1700,"name":"HDFC Bank"}}}
{"event":"resolved","data":{"symbol":"HDFCBANK","exchange":"NSE","isin":"INE040A01034"}}
{"event":"question","data":{"field":"purchase_date","prompt":"What was the purchase date?",
  "input_hint":"date"}}
```

**POST /simulations/sip**

```json
// request
{"monthly": 10000, "years": 10, "annual_return_pct": 12, "step_up_pct": 0}
// response
{"invested": 1200000, "final_value": 2323391, "gain": 1123391,
 "series": [{"year": 1, "invested": 120000, "value": 126825}, ...],
 "assumptions": {"compounding": "monthly"}}
```

**Error model (RFC 9457)**

```json
{"type":"https://tradingai.app/errors/validation","title":"Validation failed",
 "status":422,"detail":"purchase_date cannot be in the future",
 "errors":[{"field":"purchase_date","code":"future_date"}],"request_id":"req_..."}
```

**Guarded mutation round-trip:** copilot/intake responses that would mutate return `{"event":"confirm_card","data":{"confirm_token":"ct_...","action":"create_asset","payload":{...},"expires_in":300}}`. Nothing mutates without `POST /copilot/confirm`.

## Versioning & Compatibility

Additive changes only within v1; breaking changes → `/api/v2` with 6-month overlap. `X-API-Deprecation` headers. MockProvider mirrors this contract exactly — a contract test suite runs the same assertions against MockProvider (frontend CI) and the live API (backend CI) to prevent drift.
