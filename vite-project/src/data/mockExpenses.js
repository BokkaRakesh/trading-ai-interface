/**
 * Mock expense data generator.
 * Returns realistic transactions matching Bokka Rakesh's actual spend patterns.
 *
 * Usage:
 *   import { generateMockTransactions, generateMockSummary, mockCategories } from '../data/mockExpenses';
 *
 *   const txns = generateMockTransactions(120, 'household_rakesh', '2026-04-01', '2026-06-30');
 *   const summary = generateMockSummary(txns);
 */

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Deterministic seeded pseudo-random generator (Park-Miller). */
function createRng(seed = 20260701) {
  let v = ((seed % 2147483647) + 2147483647) % 2147483647 || 1;
  return () => {
    v = (v * 48271) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Returns random float in [min, max]. */
function randFloat(rng, min, max) {
  return round2(min + rng() * (max - min));
}

/** Formats a Date to 'YYYY-MM-DD'. */
function toISO(date) {
  return date.toISOString().slice(0, 10);
}

/** Parses 'YYYY-MM-DD' to Date. */
function fromISO(s) {
  return new Date(`${s}T00:00:00`);
}

// ── Category definitions ──────────────────────────────────────────────────────

const CATEGORY_BLUEPRINTS = [
  {
    category: 'Family Support',
    weight: 38,
    min: 3000, max: 10000,
    merchants: ['BOKKA KATAIAH', 'BOKKA RAMULAMMA', 'BOKKA ANITHA', 'Family Emergency'],
    descriptions: ['Monthly family support', 'Medical support for family', 'Home expense assistance'],
    source: ['GPay', 'UPI', 'PhonePe', 'NetBanking'],
    confidence: [0.93, 0.98],
  },
  {
    category: 'BNPL & Loans',
    weight: 13,
    min: 450, max: 2200,
    merchants: ['KreditBee', 'Paytm Postpaid', 'Slice EMI', 'LazyPay', 'ZestMoney'],
    descriptions: ['EMI repayment', 'BNPL settlement', 'Loan installment'],
    source: ['NACH', 'NetBanking', 'UPI'],
    confidence: [0.90, 0.97],
  },
  {
    category: 'Investment',
    weight: 13,
    min: 1200, max: 3200,
    merchants: ['Groww', 'Zerodha', 'Mutual Fund SIP', 'NPS Contribution', 'Coin by Zerodha'],
    descriptions: ['SIP investment', 'Portfolio top-up', 'Monthly SIP', 'Long-term investment'],
    source: ['NetBanking', 'NACH', 'UPI'],
    confidence: [0.91, 0.99],
  },
  {
    category: 'Groceries',
    weight: 11,
    min: 220, max: 950,
    merchants: ['DMart', 'Reliance Fresh', 'More Hypermart', 'BigBasket', 'FreshToHome', 'Zepto'],
    descriptions: ['Weekly groceries', 'Household essentials', 'Monthly grocery run'],
    source: ['GPay', 'PhonePe', 'ICICI Credit Card', 'HDFC Credit Card'],
    confidence: [0.88, 0.96],
  },
  {
    category: 'Food & Tea',
    weight: 8,
    min: 60, max: 280,
    merchants: ['Vithu Vada Pav', 'Tea Point', 'Coffee Day', 'Chai Corner', 'Swiggy', 'Zomato', 'Barbeque Nation'],
    descriptions: ['Evening snack', 'Tea break', 'Quick food order', 'Office lunch', 'Weekend dining'],
    source: ['GPay', 'PhonePe', 'UPI'],
    confidence: [0.88, 0.97],
  },
  {
    category: 'Commute',
    weight: 7,
    min: 80, max: 620,
    merchants: ['Uber', 'Ola', 'Metro Card', 'Rapido', 'Auto Rickshaw', 'BMTC Bus'],
    descriptions: ['Daily commute', 'Office cab', 'Metro recharge', 'Late-night cab'],
    source: ['GPay', 'PhonePe', 'UPI', 'ICICI Credit Card'],
    confidence: [0.85, 0.96],
  },
  {
    category: 'Utilities',
    weight: 5,
    min: 180, max: 1450,
    merchants: ['BESCOM Electricity', 'Airtel Postpaid', 'Jio Fiber', 'Water Board', 'Gas Agency'],
    descriptions: ['Electricity bill', 'Internet recharge', 'Utility bill payment'],
    source: ['NetBanking', 'NACH', 'UPI'],
    confidence: [0.92, 0.99],
  },
  {
    category: 'Healthcare',
    weight: 3,
    min: 120, max: 1200,
    merchants: ['Apollo Pharmacy', 'MedPlus', 'Practo', 'Dr Lal PathLabs', 'Manipal Hospital OPD'],
    descriptions: ['Medicines purchase', 'Doctor consultation', 'Health checkup', 'Lab tests'],
    source: ['GPay', 'ICICI Credit Card', 'UPI'],
    confidence: [0.87, 0.96],
  },
  {
    category: 'Shopping',
    weight: 4,
    min: 150, max: 980,
    merchants: ['Amazon', 'Flipkart', 'Myntra', 'Decathlon', 'Nykaa'],
    descriptions: ['Online shopping', 'Home utility order', 'Lifestyle purchase'],
    source: ['ICICI Credit Card', 'HDFC Credit Card', 'Axis Debit Card'],
    confidence: [0.85, 0.94],
  },
  {
    category: 'Entertainment',
    weight: 3,
    min: 120, max: 760,
    merchants: ['PVR Cinemas', 'Netflix', 'Spotify', 'BookMyShow', 'YouTube Premium'],
    descriptions: ['Movie tickets', 'Streaming subscription', 'Weekend entertainment'],
    source: ['ICICI Credit Card', 'GPay', 'PhonePe'],
    confidence: [0.88, 0.96],
  },
  {
    category: 'Travel',
    weight: 2,
    min: 120, max: 2200,
    merchants: ['IRCTC', 'RedBus', 'MakeMyTrip', 'Ixigo', 'IndiGo Airlines'],
    descriptions: ['Intercity travel', 'Bus booking', 'Train ticket', 'Flight booking'],
    source: ['ICICI Credit Card', 'HDFC Credit Card', 'NetBanking'],
    confidence: [0.87, 0.96],
  },
];

const TOTAL_WEIGHT = CATEGORY_BLUEPRINTS.reduce((s, b) => s + b.weight, 0);

/**
 * Picks a category blueprint using weighted random sampling.
 * @param {() => number} rng
 */
function pickCategory(rng) {
  let r = rng() * TOTAL_WEIGHT;
  for (const bp of CATEGORY_BLUEPRINTS) {
    r -= bp.weight;
    if (r <= 0) return bp;
  }
  return CATEGORY_BLUEPRINTS[CATEGORY_BLUEPRINTS.length - 1];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Transaction
 * @property {number} id
 * @property {string} date             - 'YYYY-MM-DD'
 * @property {string} payee
 * @property {number} amount           - INR, positive = debit
 * @property {string} category
 * @property {string} source
 * @property {string} description
 * @property {number} categorizationConfidence - 0..1
 */

/**
 * Generate an array of realistic mock transactions.
 *
 * @param {number}  count       - Number of transactions to generate (default 120)
 * @param {string}  householdId - Unused but accepted for API parity
 * @param {string}  dateFrom    - ISO date 'YYYY-MM-DD' (default 90 days ago)
 * @param {string}  dateTo      - ISO date 'YYYY-MM-DD' (default today)
 * @returns {Transaction[]}
 */
export function generateMockTransactions(
  count = 120,
  householdId = 'household_rakesh',
  dateFrom,
  dateTo,
) {
  void householdId; // accepted for API parity; not used in generation

  const now = new Date();
  const to   = dateTo   ? fromISO(dateTo)   : now;
  const from = dateFrom ? fromISO(dateFrom) : new Date(now - 90 * 864e5);
  const span = to - from; // ms

  const rng = createRng(span + count * 13);
  const transactions = [];

  for (let i = 0; i < count; i++) {
    const bp = pickCategory(rng);
    const date = toISO(new Date(from.getTime() + rng() * span));
    const amount = randFloat(rng, bp.min, bp.max);
    const confidence = randFloat(rng, bp.confidence[0], bp.confidence[1]);

    transactions.push({
      id: i + 1,
      date,
      payee: pick(rng, bp.merchants),
      amount,
      category: bp.category,
      source: pick(rng, bp.source),
      description: pick(rng, bp.descriptions),
      categorizationConfidence: round2(confidence),
    });
  }

  // Sort newest-first (matching the API default)
  transactions.sort((a, b) => (a.date < b.date ? 1 : -1));

  return transactions;
}

/**
 * @typedef {Object} CategorySummary
 * @property {string} category
 * @property {number} total
 * @property {number} count
 * @property {number} percentage
 */

/**
 * @typedef {Object} MerchantSummary
 * @property {string} payee
 * @property {number} total
 * @property {number} count
 */

/**
 * @typedef {Object} DailyPoint
 * @property {string} date
 * @property {number} amount
 */

/**
 * @typedef {Object} ExpensesSummary
 * @property {number}            totalSpend
 * @property {number}            transactionCount
 * @property {number}            avgTransaction
 * @property {CategorySummary[]} byCategory
 * @property {MerchantSummary[]} topMerchants
 * @property {DailyPoint[]}      dailyTrend
 */

/**
 * Calculate a summary object from a transactions array.
 *
 * @param {Transaction[]} transactions
 * @returns {ExpensesSummary}
 */
export function generateMockSummary(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      totalSpend: 0,
      transactionCount: 0,
      avgTransaction: 0,
      byCategory: [],
      topMerchants: [],
      dailyTrend: [],
    };
  }

  const totalSpend = round2(transactions.reduce((s, t) => s + t.amount, 0));

  // By-category aggregation
  const catMap = {};
  for (const t of transactions) {
    if (!catMap[t.category]) catMap[t.category] = { total: 0, count: 0 };
    catMap[t.category].total = round2(catMap[t.category].total + t.amount);
    catMap[t.category].count++;
  }
  const byCategory = Object.entries(catMap)
    .map(([category, { total, count }]) => ({
      category,
      total,
      count,
      percentage: round2((total / totalSpend) * 100),
    }))
    .sort((a, b) => b.total - a.total);

  // Top merchants by total spend
  const merchantMap = {};
  for (const t of transactions) {
    if (!merchantMap[t.payee]) merchantMap[t.payee] = { total: 0, count: 0 };
    merchantMap[t.payee].total = round2(merchantMap[t.payee].total + t.amount);
    merchantMap[t.payee].count++;
  }
  const topMerchants = Object.entries(merchantMap)
    .map(([payee, { total, count }]) => ({ payee, total, count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Daily trend — aggregate by date
  const dayMap = {};
  for (const t of transactions) {
    dayMap[t.date] = round2((dayMap[t.date] ?? 0) + t.amount);
  }
  const dailyTrend = Object.entries(dayMap)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return {
    totalSpend,
    transactionCount: transactions.length,
    avgTransaction: round2(totalSpend / transactions.length),
    byCategory,
    topMerchants,
    dailyTrend,
  };
}

/**
 * All categories with display metadata.
 * Dot colours align with CategoryBadge's palette.
 *
 * @type {Array<{name: string, dot: string, icon: string}>}
 */
export const mockCategories = [
  { name: 'Family Support', dot: '#0ea5e9', icon: '👨‍👩‍👧' },
  { name: 'BNPL & Loans',   dot: '#6366f1', icon: '💳' },
  { name: 'Investment',     dot: '#8b5cf6', icon: '📈' },
  { name: 'Groceries',      dot: '#10b981', icon: '🛒' },
  { name: 'Food & Tea',     dot: '#f97316', icon: '☕' },
  { name: 'Commute',        dot: '#14b8a6', icon: '🚌' },
  { name: 'Utilities',      dot: '#f59e0b', icon: '💡' },
  { name: 'Healthcare',     dot: '#ef4444', icon: '💊' },
  { name: 'Shopping',       dot: '#ec4899', icon: '🛍️' },
  { name: 'Entertainment',  dot: '#22c55e', icon: '🎬' },
  { name: 'Travel',         dot: '#06b6d4', icon: '✈️' },
];
