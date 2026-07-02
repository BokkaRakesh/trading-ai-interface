// ============================================
// DataProvider contract — the frontend's single data interface.
// MockProvider and ApiProvider implement this identically.
// See docs/architecture/02-frontend.md and 06-api-contracts.md
// ============================================

export type DataMode = 'mock' | 'api';

// ── Domain DTOs (mirror backend Pydantic schemas; replace with
//    OpenAPI-generated types once the v1 backend is live) ──────────

export type AssetType =
  | 'STOCK' | 'MF' | 'ETF' | 'REIT' | 'GOLD' | 'SILVER'
  | 'REAL_ESTATE' | 'BOND' | 'FD' | 'OTHER' | 'CUSTOM';

export interface AssetSummary {
  id: string;
  assetType: AssetType;
  name: string;
  symbol?: string;
  exchange?: string;
  quantity?: number;
  investedValue: number;
  currentValue: number;
  gainLossPct: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  gainLoss: number;
  roiPct: number;
  healthScore?: number;
  allocation: Array<{ category: string; value: number; pct: number }>;
}

export interface PerformancePoint {
  date: string; // ISO date
  value: number;
  invested: number;
}

// ── Generative-UI blocks (copilot stream payloads) ────────────────

export type CopilotBlock =
  | { type: 'text'; id: string; text: string }
  | { type: 'chart'; id: string; spec: ChartSpec }
  | { type: 'table'; id: string; columns: string[]; rows: Array<Array<string | number>> }
  | { type: 'asset_card'; id: string; asset: AssetSummary }
  | { type: 'confirm_card'; id: string; confirmToken: string; action: string; payload: Record<string, unknown> }
  | { type: 'suggestions'; id: string; prompts: string[] };

export interface ChartSpec {
  kind: 'line' | 'area' | 'bar' | 'donut';
  title?: string;
  series: Array<{ name: string; data: Array<{ x: string | number; y: number }> }>;
}

export type CopilotStreamEvent =
  | { event: 'delta'; blockId: string; text: string }
  | { event: 'block'; block: CopilotBlock }
  | { event: 'done'; conversationId: string }
  | { event: 'error'; message: string };

// ── Intake (conversational asset onboarding) ──────────────────────

export interface IntakeSlot {
  value: string | number | null;
  source: 'user' | 'inferred' | 'lookup';
  confidence: number;
}

export interface IntakeState {
  sessionId: string;
  status: 'ACTIVE' | 'CONFIRMED' | 'ABANDONED';
  assetType?: AssetType;
  slots: Record<string, IntakeSlot>;
  missing: string[];
  /** Next question to render, or null when ready to confirm. */
  question: { field: string; prompt: string; inputHint?: string; options?: string[] } | null;
}

// ── Sub-APIs ──────────────────────────────────────────────────────

export interface PortfolioApi {
  getSummary(): Promise<PortfolioSummary>;
  getPerformance(range: '1M' | '3M' | '1Y' | 'ALL'): Promise<PerformancePoint[]>;
  listAssets(filter?: { type?: AssetType; search?: string }): Promise<AssetSummary[]>;
  createAsset(payload: Record<string, unknown>): Promise<AssetSummary>;
  deleteAsset(id: string): Promise<void>;
}

export interface CopilotApi {
  /** Streams blocks; resolves when the turn completes. */
  chat(
    conversationId: string | null,
    message: string,
    onEvent: (e: CopilotStreamEvent) => void,
  ): Promise<{ conversationId: string }>;
  confirm(confirmToken: string, edits?: Record<string, unknown>): Promise<{ ok: boolean }>;
  suggestions(pageContext?: string): Promise<string[]>;
}

export interface IntakeApi {
  start(message: string): Promise<IntakeState>;
  answer(sessionId: string, field: string, value: string): Promise<IntakeState>;
  confirm(sessionId: string, edits?: Record<string, unknown>): Promise<AssetSummary>;
}

export interface MarketApi {
  search(query: string): Promise<Array<{ symbol: string; exchange: string; name: string; isin?: string }>>;
  getQuotes(symbols: string[]): Promise<Record<string, { price: number; changePct: number; stale?: boolean }>>;
}

// ── Root provider ─────────────────────────────────────────────────

export interface DataProvider {
  readonly mode: DataMode;
  healthcheck(): Promise<boolean>;
  portfolio: PortfolioApi;
  copilot: CopilotApi;
  intake: IntakeApi;
  market: MarketApi;
}
