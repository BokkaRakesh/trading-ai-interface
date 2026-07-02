// ============================================
// MockProvider — full app functionality with zero backend.
// Seeds in-memory state; simulates latency + streaming so the
// generative-UI chat and intake flows work in demo mode.
// ============================================

import type {
  AssetSummary, CopilotApi, CopilotStreamEvent, DataProvider, IntakeApi,
  IntakeState, MarketApi, PerformancePoint, PortfolioApi, PortfolioSummary,
} from './types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);

// ── Seed data (extend from src/data as features migrate) ──────────

const seedAssets: AssetSummary[] = [
  { id: 'a1', assetType: 'STOCK', name: 'HDFC Bank', symbol: 'HDFCBANK', exchange: 'NSE', quantity: 200, investedValue: 340000, currentValue: 382200, gainLossPct: 12.4 },
  { id: 'a2', assetType: 'MF', name: 'Parag Parikh Flexi Cap', quantity: 1240, investedValue: 194000, currentValue: 209900, gainLossPct: 8.2 },
  { id: 'a3', assetType: 'ETF', name: 'Nippon Gold BeES', symbol: 'GOLDBEES', exchange: 'NSE', quantity: 500, investedValue: 27500, currentValue: 31200, gainLossPct: 13.5 },
  { id: 'a4', assetType: 'FD', name: 'SBI Fixed Deposit', investedValue: 200000, currentValue: 214500, gainLossPct: 7.25 },
];

const instruments = [
  { symbol: 'HDFCBANK', exchange: 'NSE', name: 'HDFC Bank Ltd', isin: 'INE040A01034', type: 'STOCK' as const, aliases: ['hdfc bank', 'hdfc'] },
  { symbol: 'INFY', exchange: 'NSE', name: 'Infosys Ltd', isin: 'INE009A01021', type: 'STOCK' as const, aliases: ['infosys', 'infy'] },
  { symbol: 'RELIANCE', exchange: 'NSE', name: 'Reliance Industries', isin: 'INE002A01018', type: 'STOCK' as const, aliases: ['reliance', 'ril'] },
  { symbol: 'TCS', exchange: 'NSE', name: 'Tata Consultancy Services', isin: 'INE467B01029', type: 'STOCK' as const, aliases: ['tcs', 'tata consultancy'] },
  { symbol: 'SBIN', exchange: 'NSE', name: 'State Bank of India', isin: 'INE062A01020', type: 'STOCK' as const, aliases: ['sbi', 'state bank'] },
  { symbol: 'ITC', exchange: 'NSE', name: 'ITC Ltd', isin: 'INE154A01025', type: 'STOCK' as const, aliases: ['itc'] },
  { symbol: 'BAJFINANCE', exchange: 'NSE', name: 'Bajaj Finance Ltd', isin: 'INE296A01024', type: 'STOCK' as const, aliases: ['bajaj finance'] },
  { symbol: 'GOLDBEES', exchange: 'NSE', name: 'Nippon India Gold BeES', isin: 'INF204KB17I5', type: 'ETF' as const, aliases: ['gold bees', 'goldbees'] },
  { symbol: 'NIFTYBEES', exchange: 'NSE', name: 'Nippon India Nifty BeES', isin: 'INF204KB14I2', type: 'ETF' as const, aliases: ['nifty bees', 'niftybees'] },
  { symbol: 'PPFCF', exchange: 'AMFI', name: 'Parag Parikh Flexi Cap Fund', isin: 'INF879O01027', type: 'MF' as const, aliases: ['parag parikh', 'flexi cap'] },
  { symbol: 'UTINIFTY', exchange: 'AMFI', name: 'UTI Nifty 50 Index Fund', isin: 'INF789F01XA0', type: 'MF' as const, aliases: ['uti nifty', 'nifty index fund'] },
];

class MockState {
  assets = [...seedAssets];
  intakeSessions = new Map<string, IntakeState>();
}

// ── Portfolio ─────────────────────────────────────────────────────

function makePortfolioApi(state: MockState): PortfolioApi {
  return {
    async getSummary(): Promise<PortfolioSummary> {
      await delay(250);
      const totalValue = state.assets.reduce((s, a) => s + a.currentValue, 0);
      const totalInvested = state.assets.reduce((s, a) => s + a.investedValue, 0);
      const byCat = new Map<string, number>();
      for (const a of state.assets) {
        const cat = a.assetType === 'FD' ? 'DEBT' : a.assetType === 'ETF' && a.symbol === 'GOLDBEES' ? 'COMMODITY' : 'EQUITY';
        byCat.set(cat, (byCat.get(cat) ?? 0) + a.currentValue);
      }
      return {
        totalValue,
        totalInvested,
        gainLoss: totalValue - totalInvested,
        roiPct: ((totalValue - totalInvested) / totalInvested) * 100,
        healthScore: 78,
        allocation: [...byCat.entries()].map(([category, value]) => ({
          category, value, pct: (value / totalValue) * 100,
        })),
      };
    },

    async getPerformance(range): Promise<PerformancePoint[]> {
      await delay(200);
      const points = range === '1M' ? 30 : range === '3M' ? 90 : 365;
      const now = Date.now();
      const out: PerformancePoint[] = [];
      for (let i = points; i >= 0; i -= Math.max(1, Math.floor(points / 60))) {
        const t = 1 - i / points;
        out.push({
          date: new Date(now - i * 86_400_000).toISOString().slice(0, 10),
          invested: 700000 + t * 61500,
          value: 700000 + t * 137800 + Math.sin(i / 5) * 8000,
        });
      }
      return out;
    },

    async listAssets(filter): Promise<AssetSummary[]> {
      await delay(150);
      let list = state.assets;
      if (filter?.type) list = list.filter((a) => a.assetType === filter.type);
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        list = list.filter((a) => a.name.toLowerCase().includes(q) || a.symbol?.toLowerCase().includes(q));
      }
      return list;
    },

    async createAsset(payload): Promise<AssetSummary> {
      await delay(300);
      const invested = Number(payload.quantity ?? 1) * Number(payload.purchasePrice ?? payload.investedValue ?? 0);
      const asset: AssetSummary = {
        id: uid(),
        assetType: (payload.assetType as AssetSummary['assetType']) ?? 'OTHER',
        name: String(payload.name ?? 'New asset'),
        symbol: payload.symbol as string | undefined,
        exchange: payload.exchange as string | undefined,
        quantity: payload.quantity as number | undefined,
        investedValue: invested,
        currentValue: invested,
        gainLossPct: 0,
      };
      state.assets.push(asset);
      return asset;
    },

    async deleteAsset(id): Promise<void> {
      await delay(150);
      state.assets = state.assets.filter((a) => a.id !== id);
    },
  };
}

// ── Copilot: scripted streaming demos ─────────────────────────────

function makeCopilotApi(state: MockState): CopilotApi {
  async function streamText(onEvent: (e: CopilotStreamEvent) => void, text: string) {
    const blockId = uid();
    for (const word of text.split(' ')) {
      onEvent({ event: 'delta', blockId, text: word + ' ' });
      await delay(18);
    }
  }

  return {
    async chat(conversationId, message, onEvent) {
      const convId = conversationId ?? uid();
      const q = message.toLowerCase();
      await delay(400);

      if (q.includes('diversif') || q.includes('allocat')) {
        await streamText(onEvent, 'Your diversification score is 6.8/10. You are equity-heavy relative to a balanced profile:');
        const summary = await makePortfolioApi(state).getSummary();
        onEvent({
          event: 'block',
          block: {
            type: 'chart', id: uid(),
            spec: {
              kind: 'donut', title: 'Current allocation',
              series: [{ name: 'Allocation', data: summary.allocation.map((a) => ({ x: a.category, y: Math.round(a.pct) })) }],
            },
          },
        });
        onEvent({ event: 'block', block: { type: 'suggestions', id: uid(), prompts: ['Rebalance ideas', 'Show sector exposure', 'What is a healthy allocation?'] } });
      } else if (q.includes('10,000') || q.includes('10000') || q.includes('sip')) {
        await streamText(onEvent, 'Investing ₹10,000 monthly for 10 years at 12% annual returns grows to about ₹23.2L on ₹12L invested:');
        const data: Array<{ x: number; y: number }> = [];
        let v = 0;
        for (let m = 1; m <= 120; m++) { v = (v + 10000) * (1 + 0.12 / 12); if (m % 12 === 0) data.push({ x: m / 12, y: Math.round(v) }); }
        onEvent({ event: 'block', block: { type: 'chart', id: uid(), spec: { kind: 'area', title: 'SIP projection', series: [{ name: 'Value', data }] } } });
        onEvent({ event: 'block', block: { type: 'suggestions', id: uid(), prompts: ['Try 15 years', 'Add 10% annual step-up', 'Compare with lumpsum'] } });
      } else if (q.includes('retire')) {
        await streamText(onEvent, 'Assuming ₹25,000/month invested at 12% until age 50, then a 4% safe withdrawal rate: your projected corpus is ₹2.5Cr, supporting roughly ₹83,000/month. Here is the accumulation path:');
        const data: Array<{ x: number; y: number }> = [];
        let v = 1023750;
        for (let yr = 1; yr <= 20; yr++) { for (let m = 0; m < 12; m++) v = (v + 25000) * (1 + 0.12 / 12); data.push({ x: yr, y: Math.round(v) }); }
        onEvent({ event: 'block', block: { type: 'chart', id: uid(), spec: { kind: 'area', title: 'Retirement corpus projection', series: [{ name: 'Corpus', data }] } } });
        onEvent({ event: 'block', block: { type: 'suggestions', id: uid(), prompts: ['What if I retire at 45?', 'Increase SIP to ₹40,000', 'How much do I need monthly after retirement?'] } });
      } else if (q.includes('sector') || q.includes('overexposed') || q.includes('exposure')) {
        await streamText(onEvent, 'Your equity is concentrated: Financials are 38% of stock holdings (HDFC Bank + Bajaj Finance). A single-sector weight above 30% is worth trimming:');
        onEvent({
          event: 'block',
          block: {
            type: 'chart', id: uid(),
            spec: { kind: 'bar', title: 'Sector exposure (% of equity)', series: [{ name: 'Exposure', data: [
              { x: 'Financials', y: 38 }, { x: 'IT', y: 24 }, { x: 'Energy', y: 15 }, { x: 'FMCG', y: 12 }, { x: 'Other', y: 11 },
            ] }] },
          },
        });
        onEvent({ event: 'block', block: { type: 'suggestions', id: uid(), prompts: ['Rebalance ideas', 'Which sectors am I missing?', 'Compare with Nifty 50 weights'] } });
      } else if (q.includes('worst')) {
        await streamText(onEvent, 'Here are your holdings ranked by return — nothing is in the red right now:');
        const rows = [...state.assets].sort((a, b) => a.gainLossPct - b.gainLossPct)
          .map((a) => [a.name, a.assetType, `₹${a.currentValue.toLocaleString('en-IN')}`, `${a.gainLossPct.toFixed(1)}%`]);
        onEvent({ event: 'block', block: { type: 'table', id: uid(), columns: ['Asset', 'Type', 'Value', 'Return'], rows } });
      } else {
        await streamText(onEvent, 'I can analyze your portfolio, run SIP or retirement simulations, review expenses, and add assets conversationally. (Demo mode — connect the backend for live AI.)');
        onEvent({ event: 'block', block: { type: 'suggestions', id: uid(), prompts: ['How diversified am I?', 'If I invest ₹10,000 monthly for 10 years?', 'What are my worst performing assets?'] } });
      }

      onEvent({ event: 'done', conversationId: convId });
      return { conversationId: convId };
    },

    async confirm() { await delay(200); return { ok: true }; },
    async suggestions() {
      return ['How diversified am I?', 'Can I retire at 50?', 'Show sectors where I am overexposed'];
    },
  };
}

// ── Intake: slot-filling engine (deterministic demo of the live
//    Claude-backed engine — same states, same contract) ────────────

type IntakeAssetType = NonNullable<IntakeState['assetType']>;

const REQUIRED_BY_TYPE: Record<string, string[]> = {
  STOCK: ['quantity', 'purchase_price', 'purchase_date', 'broker'],
  ETF: ['quantity', 'purchase_price', 'purchase_date', 'broker'],
  MF: ['quantity', 'purchase_price', 'purchase_date'],
  GOLD: ['quantity', 'purchase_price', 'purchase_date'],
  FD: ['name', 'purchase_price', 'interest_rate', 'purchase_date'],
  OTHER: ['name', 'purchase_price', 'purchase_date'],
};

const QUESTIONS: Record<string, (t?: IntakeAssetType) => NonNullable<IntakeState['question']>> = {
  asset_type: () => ({
    field: 'asset_type',
    prompt: 'What kind of asset is this?',
    options: ['Stock', 'Mutual Fund', 'ETF', 'Gold', 'Fixed Deposit', 'Other'],
  }),
  name: (t) => ({
    field: 'name',
    prompt: t === 'FD' ? 'Which bank or institution is the FD with?' : 'What is the asset called?',
  }),
  quantity: (t) => ({
    field: 'quantity',
    prompt: t === 'GOLD' ? 'How many grams?' : t === 'MF' ? 'How many units do you hold?' : 'How many shares/units?',
    inputHint: 'number',
  }),
  purchase_price: (t) => ({
    field: 'purchase_price',
    prompt:
      t === 'FD' ? 'What is the deposit amount (₹)?'
      : t === 'MF' ? 'At what NAV did you buy (₹)?'
      : t === 'GOLD' ? 'What price per gram did you pay (₹)?'
      : 'What price did you buy at (₹)?',
    inputHint: 'number',
  }),
  purchase_date: () => ({ field: 'purchase_date', prompt: 'What was the purchase date?', inputHint: 'date' }),
  broker: () => ({ field: 'broker', prompt: 'Are these held in Zerodha or Groww?', options: ['Zerodha', 'Groww', 'Other'] }),
  interest_rate: () => ({ field: 'interest_rate', prompt: 'What is the interest rate (% p.a.)?', inputHint: 'number' }),
};

const TYPE_LABEL_TO_TYPE: Record<string, IntakeAssetType> = {
  'stock': 'STOCK', 'mutual fund': 'MF', 'etf': 'ETF',
  'gold': 'GOLD', 'fixed deposit': 'FD', 'other': 'OTHER',
};

function inferAssetType(text: string): IntakeAssetType | undefined {
  const t = text.toLowerCase();
  if (/mutual fund|\bmf\b|\bsip\b|\bnav\b|flexi cap|index fund/.test(t)) return 'MF';
  if (/\bfd\b|fixed deposit/.test(t)) return 'FD';
  if (/gram|\bgold\b|\bsgb\b|silver/.test(t) && !/bees/.test(t)) return 'GOLD';
  if (/\betf\b|bees\b/.test(t)) return 'ETF';
  if (/share|stock|equity/.test(t)) return 'STOCK';
  return undefined;
}

/** Extracts quantity, price and date from free text (Claude does this in live mode). */
function extractSlots(message: string): IntakeState['slots'] {
  const slots: IntakeState['slots'] = {};
  // Interest rate: "at 7.1%", "7.1% p.a." — extract first so it isn't mistaken for price.
  const rateM = /(\d+(?:\.\d+)?)\s*%/.exec(message);
  if (rateM) {
    slots.interest_rate = { value: Number(rateM[1]), source: 'user', confidence: 0.9 };
    message = message.replace(rateM[0], ' ').replace(/\bat\s+$/i, ' ');
  }
  // Price: "at ₹1700", "@1,700", "for ₹1.5 lakh", "of ₹2 lakh", "at NAV ₹86.4"
  const priceM = /(?:at|@|for|of)\s*(?:nav\s*)?₹\s*([\d,]+(?:\.\d+)?)\s*(lakh|lac|l\b|k\b|cr)?/i.exec(message)
    ?? /(?:at|@)\s*(?:nav\s*)?([\d,]+(?:\.\d+)?)\s*(lakh|lac|l\b|k\b|cr)?/i.exec(message);
  if (priceM) {
    let price = Number(priceM[1].replace(/,/g, ''));
    const unit = priceM[2]?.toLowerCase();
    if (unit === 'k') price *= 1_000;
    else if (unit && ['lakh', 'lac', 'l'].includes(unit)) price *= 100_000;
    else if (unit === 'cr') price *= 10_000_000;
    if (Number.isFinite(price) && price > 0) slots.purchase_price = { value: price, source: 'user', confidence: 0.9 };
  }
  // Quantity: first standalone number NOT part of the price expression.
  const withoutPrice = priceM ? message.replace(priceM[0], ' ') : message;
  const qtyM = /(\d+(?:\.\d+)?)\s*(?:shares?|units?|grams?|gms?|qty|of|\b)/i.exec(withoutPrice);
  if (qtyM && Number(qtyM[1]) > 0) slots.quantity = { value: Number(qtyM[1]), source: 'user', confidence: 0.9 };
  // Date: ISO or "March 2025" style
  const isoM = /(\d{4}-\d{2}-\d{2})/.exec(message);
  const monthM = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i.exec(message);
  if (isoM) slots.purchase_date = { value: isoM[1], source: 'user', confidence: 0.95 };
  else if (monthM) {
    const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(monthM[1].toLowerCase()) + 1;
    slots.purchase_date = { value: `${monthM[2]}-${String(month).padStart(2, '0')}-01`, source: 'inferred', confidence: 0.7 };
  }
  // Broker mentioned inline
  const brokerM = /(zerodha|groww|upstox|icici direct|hdfc securities)/i.exec(message);
  if (brokerM) slots.broker = { value: brokerM[1], source: 'user', confidence: 0.95 };
  return slots;
}

function resolveInstrument(message: string) {
  const t = message.toLowerCase();
  return instruments.find((i) => i.aliases.some((a) => t.includes(a)) || t.includes(i.symbol.toLowerCase()));
}

function recomputeMissing(s: IntakeState): void {
  if (!s.assetType) { s.missing = ['asset_type']; return; }
  const required = REQUIRED_BY_TYPE[s.assetType] ?? REQUIRED_BY_TYPE.OTHER;
  s.missing = required.filter((f) => s.slots[f] == null || s.slots[f].value === null || s.slots[f].value === '');
}

function nextQuestion(s: IntakeState): IntakeState['question'] {
  const field = s.missing[0];
  if (!field) return null;
  const make = QUESTIONS[field];
  return make ? make(s.assetType) : { field, prompt: `Please provide ${field.replace(/_/g, ' ')}.` };
}

function makeIntakeApi(state: MockState): IntakeApi {
  return {
    async start(message): Promise<IntakeState> {
      await delay(500);
      const slots = extractSlots(message);
      // Explicit type keywords (FD, gold…) take precedence over instrument
      // aliases — "FD in SBI" is a deposit, not SBIN stock.
      const inferred = inferAssetType(message);
      const match = inferred === 'FD' || inferred === 'GOLD' ? undefined : resolveInstrument(message);
      if (match) {
        slots.symbol = { value: match.symbol, source: 'lookup', confidence: 0.97 };
        slots.exchange = { value: match.exchange, source: 'lookup', confidence: 0.97 };
        slots.isin = { value: match.isin, source: 'lookup', confidence: 0.97 };
        slots.name = { value: match.name, source: 'lookup', confidence: 0.97 };
      }
      const s: IntakeState = {
        sessionId: uid(),
        status: 'ACTIVE',
        assetType: match?.type ?? inferred,
        slots,
        missing: [],
        question: null,
      };
      recomputeMissing(s);
      s.question = nextQuestion(s);
      state.intakeSessions.set(s.sessionId, s);
      return { ...s };
    },

    async answer(sessionId, field, value): Promise<IntakeState> {
      await delay(350);
      const s = state.intakeSessions.get(sessionId);
      if (!s) throw new Error('Intake session not found');
      if (field === 'asset_type') {
        s.assetType = TYPE_LABEL_TO_TYPE[value.toLowerCase()] ?? 'OTHER';
      } else {
        const numeric = ['quantity', 'purchase_price', 'interest_rate'].includes(field);
        const parsed = numeric ? Number(String(value).replace(/[₹,\s]/g, '')) : value;
        s.slots[field] = { value: numeric && Number.isFinite(parsed as number) ? parsed : value, source: 'user', confidence: 1 };
      }
      recomputeMissing(s);
      s.question = nextQuestion(s);
      return { ...s };
    },

    async confirm(sessionId, edits): Promise<AssetSummary> {
      const s = state.intakeSessions.get(sessionId);
      if (!s) throw new Error('Intake session not found');
      s.status = 'CONFIRMED';
      const val = (k: string) => edits?.[k] ?? s.slots[k]?.value ?? undefined;
      return makePortfolioApi(state).createAsset({
        assetType: s.assetType ?? 'OTHER',
        name: val('name') ?? 'New asset',
        symbol: val('symbol'),
        exchange: val('exchange'),
        quantity: Number(val('quantity') ?? 1),
        purchasePrice: Number(val('purchase_price') ?? 0),
      });
    },
  };
}

// ── Market ────────────────────────────────────────────────────────

const mockMarket: MarketApi = {
  async search(query) {
    await delay(150);
    const q = query.toLowerCase();
    return instruments
      .filter((i) => i.name.toLowerCase().includes(q) || i.symbol.toLowerCase().includes(q) || i.aliases.some((a) => a.includes(q)))
      .map(({ symbol, exchange, name, isin }) => ({ symbol, exchange, name, isin }));
  },
  async getQuotes(symbols) {
    await delay(150);
    return Object.fromEntries(symbols.map((s) => [s, { price: 1000 + Math.random() * 1000, changePct: (Math.random() - 0.45) * 4 }]));
  },
};

// ── Provider ──────────────────────────────────────────────────────

export function createMockProvider(): DataProvider {
  const state = new MockState();
  return {
    mode: 'mock',
    async healthcheck() { return true; },
    portfolio: makePortfolioApi(state),
    copilot: makeCopilotApi(state),
    intake: makeIntakeApi(state),
    market: mockMarket,
  };
}
