/**
 * Expense Analysis Engine
 * Takes a summary.byCategory object and returns actionable insights:
 *   - which categories are unnecessary / reducible
 *   - how much can be saved
 *   - what to invest that saving in (SIP / ETF / Stocks)
 */

// ── Category classification ───────────────────────────────────────────────────

export const CATEGORY_ROLES = {
  'Family Support': 'essential',   // non-negotiable
  'Groceries':      'essential',
  'Utilities':      'essential',
  'Healthcare':     'essential',
  'Commute':        'essential',
  'Investment':     'investing',   // already deploying capital
  'BNPL & Loans':   'debt',        // must clear before investing more
  'Food & Tea':     'reducible',
  'Entertainment':  'reducible',
  'Shopping':       'reducible',
  'Travel':         'reducible',
};

/** Config per reducible category — how much can be cut and how. */
const REDUCIBLE_CONFIG = {
  'Food & Tea': {
    fraction: 0.35,
    icon: '☕',
    label: 'Food & Tea (dining out)',
    why: 'Frequent café visits and food delivery add up fast.',
    how: [
      'Pack lunch to office 3 days a week',
      'Limit app-based food orders to weekends only',
      'Make your own morning tea/coffee at home',
    ],
  },
  'Entertainment': {
    fraction: 0.50,
    icon: '🎬',
    label: 'Entertainment & Subscriptions',
    why: 'Multiple OTT/streaming subscriptions often overlap.',
    how: [
      'Keep only 2 streaming services — cancel the rest',
      'Share a Netflix/Amazon family plan instead of individual',
      'Use free Spotify tier or YouTube Music instead of paid',
    ],
  },
  'Shopping': {
    fraction: 0.40,
    icon: '🛍️',
    label: 'Shopping (impulse buys)',
    why: 'Quick-commerce and app notifications drive impulse spending.',
    how: [
      'Apply a 48-hour wait rule before any non-essential purchase',
      'Create a monthly shopping list; buy only what\'s on it',
      'Uninstall shopping apps from your phone home screen',
    ],
  },
  'Travel': {
    fraction: 0.30,
    icon: '✈️',
    label: 'Travel (last-minute bookings)',
    why: 'Last-minute tickets cost 30–50% more than advance bookings.',
    how: [
      'Book train/bus tickets at least 2 weeks in advance',
      'Use bus > flight for routes under 400 km',
      'Prefer IRCTC over aggregators to avoid convenience fees',
    ],
  },
};

// ── Investment recommendations ────────────────────────────────────────────────

/** SIP options — indexed mutual funds suitable for monthly SIP. */
export const SIP_OPTIONS = [
  {
    name: 'Nifty 50 Index Fund',
    example: 'UTI Nifty 50 Index Fund',
    expectedReturn: 12,
    risk: 'Low–Medium',
    minSip: 500,
    horizon: '5+ years',
    why: 'Tracks India\'s top 50 companies. Simple, low-cost, proven long-term performer.',
    tag: 'Best for beginners',
    tagColor: 'text-emerald-400',
  },
  {
    name: 'Flexi Cap Fund',
    example: 'Parag Parikh Flexi Cap',
    expectedReturn: 14,
    risk: 'Medium',
    minSip: 1000,
    horizon: '5+ years',
    why: 'Invests across large, mid and small caps + some international exposure. Well-diversified.',
    tag: 'Most popular',
    tagColor: 'text-blue-400',
  },
  {
    name: 'Mid Cap Index Fund',
    example: 'Motilal Oswal Nifty Midcap 150',
    expectedReturn: 16,
    risk: 'High',
    minSip: 500,
    horizon: '7+ years',
    why: 'Higher growth potential but more volatile. Good if you already have a Nifty 50 SIP.',
    tag: 'Growth booster',
    tagColor: 'text-violet-400',
  },
];

/** ETF options — exchange-traded, can buy like stocks. */
export const ETF_OPTIONS = [
  {
    name: 'NIFTYBEES',
    fullName: 'Nippon India Nifty 50 ETF',
    expectedReturn: 11,
    risk: 'Low–Medium',
    why: 'Most liquid ETF in India. Buy anytime on NSE like a stock. Tracks Nifty 50.',
    tag: 'Most liquid ETF',
    tagColor: 'text-emerald-400',
  },
  {
    name: 'JUNIORBEES',
    fullName: 'Nippon India Nifty Next 50 ETF',
    expectedReturn: 13,
    risk: 'Medium',
    why: 'Tracks the 51st–100th largest companies. Complements NIFTYBEES perfectly.',
    tag: 'Pairs with NIFTYBEES',
    tagColor: 'text-cyan-400',
  },
  {
    name: 'GOLDBEES',
    fullName: 'Nippon India Gold ETF',
    expectedReturn: 9,
    risk: 'Low',
    why: 'Gold hedge against inflation and market crashes. Keep 5–10% of portfolio here.',
    tag: 'Inflation hedge',
    tagColor: 'text-amber-400',
  },
];

/** Blue-chip stocks — suitable for buy-and-hold beginners. */
export const STOCK_OPTIONS = [
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank',
    sector: 'Banking',
    risk: 'Low–Medium',
    why: 'India\'s largest private bank. Consistent earnings, low NPAs, decade-long track record.',
    tag: 'Defensive pick',
    tagColor: 'text-emerald-400',
  },
  {
    symbol: 'INFY',
    name: 'Infosys',
    sector: 'IT',
    risk: 'Low–Medium',
    why: 'Tier-1 IT bellwether. Benefits from global tech spending and rupee depreciation.',
    tag: 'IT bellwether',
    tagColor: 'text-blue-400',
  },
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries',
    sector: 'Conglomerate',
    risk: 'Medium',
    why: 'Retail + Jio + petrochemicals + green energy. Most diversified Indian conglomerate.',
    tag: 'Conglomerate giant',
    tagColor: 'text-violet-400',
  },
  {
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance',
    sector: 'NBFC / Fintech',
    risk: 'Medium–High',
    why: 'Fastest-growing consumer lender. High ROE, consistent growth. Volatile but rewarding.',
    tag: 'High growth',
    tagColor: 'text-orange-400',
  },
];

/** Things NOT to do — common mistakes. */
export const WHAT_NOT_TO_DO = [
  { text: 'Don\'t invest while carrying BNPL / personal loan debt above 15% interest — the debt cost exceeds most investment returns.' },
  { text: 'Don\'t put all savings into a single stock — even blue-chips can drop 30–40% in a bad year.' },
  { text: 'Don\'t chase last year\'s top mutual fund — past returns don\'t guarantee future performance.' },
  { text: 'Don\'t skip an emergency fund — keep 3–6 months of expenses in a liquid fund before investing.' },
  { text: 'Don\'t stop a SIP during a market crash — that\'s exactly when you buy more units cheap.' },
];

// ── Core analysis function ────────────────────────────────────────────────────

/**
 * @param {{ byCategory: Record<string, number>, totalSpent: number, transactionCount: number }} summary
 * @returns {AnalysisResult}
 */
export function analyzeExpenses(summary) {
  const byCategory = summary?.byCategory ?? {};
  const totalSpent = summary?.totalSpent ?? Object.values(byCategory).reduce((s, v) => s + v, 0);

  // Classify each category's spend
  const categories = Object.entries(byCategory).map(([name, amount]) => {
    const role = CATEGORY_ROLES[name] ?? 'reducible';
    const config = REDUCIBLE_CONFIG[name];
    const reducibleAmount = config ? Math.round(amount * config.fraction) : 0;
    return { name, amount, role, reducibleAmount, config };
  });

  // Split by role
  const essential  = categories.filter((c) => c.role === 'essential');
  const reducible  = categories.filter((c) => c.role === 'reducible' && c.amount > 0);
  const debt       = categories.filter((c) => c.role === 'debt' && c.amount > 0);
  const investing  = categories.filter((c) => c.role === 'investing');

  const totalEssential  = essential.reduce((s, c) => s + c.amount, 0);
  const totalReducible  = reducible.reduce((s, c) => s + c.reducibleAmount, 0);
  const totalDebt       = debt.reduce((s, c) => s + c.amount, 0);
  const alreadyInvesting = investing.reduce((s, c) => s + c.amount, 0);

  // Monthly savings potential
  const monthlySavingsPotential = Math.round(totalReducible);

  // Debt urgency flag
  const hasHighInterestDebt = totalDebt > 5000;

  // Investment tier based on savings potential
  let investmentTier;
  if (monthlySavingsPotential < 2000) {
    investmentTier = 'starter';    // ₹500-2k: emergency fund + 1 SIP
  } else if (monthlySavingsPotential < 6000) {
    investmentTier = 'growing';   // ₹2k-6k: 2 SIPs
  } else if (monthlySavingsPotential < 12000) {
    investmentTier = 'committed';  // ₹6k-12k: 2 SIPs + 1 ETF
  } else {
    investmentTier = 'advanced';   // ₹12k+: full portfolio
  }

  // Investment allocation based on tier
  const sipSuggestions = getSipSuggestions(investmentTier, monthlySavingsPotential);

  return {
    totalSpent,
    totalEssential,
    totalReducible,
    totalDebt,
    alreadyInvesting,
    monthlySavingsPotential,
    hasHighInterestDebt,
    investmentTier,
    categories,          // all with role annotation
    reducible,           // only reducible categories
    debt,
    essential,
    sipSuggestions,      // {fund, monthlyAmount}[]
  };
}

/** Returns which SIPs and how much to put in each, given a monthly savings potential. */
function getSipSuggestions(tier, monthly) {
  if (tier === 'starter') {
    return [{ fund: SIP_OPTIONS[0], monthlyAmount: Math.max(500, monthly) }];
  }
  if (tier === 'growing') {
    const half = Math.round(monthly / 2);
    return [
      { fund: SIP_OPTIONS[0], monthlyAmount: Math.max(500, half) },
      { fund: SIP_OPTIONS[1], monthlyAmount: Math.max(500, half) },
    ];
  }
  if (tier === 'committed') {
    const third = Math.round(monthly / 3);
    return [
      { fund: SIP_OPTIONS[0], monthlyAmount: Math.max(500, third) },
      { fund: SIP_OPTIONS[1], monthlyAmount: Math.max(500, third) },
      { fund: SIP_OPTIONS[2], monthlyAmount: Math.max(500, monthly - third * 2) },
    ];
  }
  // advanced
  const half = Math.round(monthly / 2);
  const quarter = Math.round(monthly / 4);
  return [
    { fund: SIP_OPTIONS[0], monthlyAmount: half },
    { fund: SIP_OPTIONS[1], monthlyAmount: quarter },
    { fund: SIP_OPTIONS[2], monthlyAmount: monthly - half - quarter },
  ];
}

// ── Compound growth projector ─────────────────────────────────────────────────

/**
 * Future value of a monthly SIP compounded at annualRate% p.a.
 * @param {number} monthlyAmount
 * @param {number} annualRate   - percentage, e.g. 12 for 12%
 * @param {number} years
 * @returns {number}
 */
export function sipFutureValue(monthlyAmount, annualRate, years) {
  if (!monthlyAmount || monthlyAmount <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return Math.round(monthlyAmount * (((1 + r) ** n - 1) / r) * (1 + r));
}

/** Returns a projection table for 1 / 3 / 5 / 10 years at a given annual rate. */
export function buildProjection(monthlyAmount, annualRate) {
  return [1, 3, 5, 10].map((years) => ({
    years,
    invested: monthlyAmount * years * 12,
    finalValue: sipFutureValue(monthlyAmount, annualRate, years),
    gains: sipFutureValue(monthlyAmount, annualRate, years) - monthlyAmount * years * 12,
  }));
}
