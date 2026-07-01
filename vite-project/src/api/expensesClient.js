const DEFAULT_HOUSEHOLD_ID = 'household_rakesh';

const SOURCE_OPTIONS = [
  'GPay',
  'PhonePe',
  'UPI',
  'ICICI Credit Card',
  'HDFC Credit Card',
  'Axis Debit Card',
  'NetBanking',
  'NACH',
];

const CATEGORY_BLUEPRINTS = [
  {
    category: 'Family Support',
    total: 59310,
    count: 8,
    min: 3000,
    max: 10000,
    merchants: ['BOKKA RAMULAMMA DUMMY', 'BOKKA ANITHA DUMMY', 'Family Emergency'],
    descriptions: ['Family support transfer', 'Monthly family assistance', 'Medical support for family'],
  },
  {
    category: 'BNPL & Loans',
    total: 20457,
    count: 16,
    min: 450,
    max: 2200,
    merchants: ['KreditBee', 'Paytm Postpaid', 'Slice EMI', 'LazyPay'],
    descriptions: ['EMI repayment', 'BNPL settlement', 'Loan installment'],
  },
  {
    category: 'Investment',
    total: 20000,
    count: 10,
    min: 1200,
    max: 3200,
    merchants: ['Groww', 'Zerodha', 'Mutual Fund SIP', 'NPS Contribution'],
    descriptions: ['SIP investment', 'Portfolio top-up', 'Long-term investment'],
  },
  {
    category: 'Groceries',
    total: 17125.2,
    count: 30,
    min: 220,
    max: 950,
    merchants: ['DMart', 'Reliance Fresh', 'More Hypermart', 'BigBasket', 'FreshToHome'],
    descriptions: ['Weekly groceries', 'Household essentials', 'Monthly grocery basket'],
  },
  {
    category: 'Food & Tea',
    total: 6530,
    count: 45,
    min: 60,
    max: 280,
    merchants: ['Tea Point', 'Coffee Day', 'Chai Corner', 'Swiggy', 'Zomato'],
    descriptions: ['Evening snack', 'Tea break', 'Quick food order'],
  },
  {
    category: 'Commute',
    total: 8300,
    count: 32,
    min: 80,
    max: 620,
    merchants: ['Uber', 'Ola', 'Metro Card Recharge', 'Rapido', 'Auto Rickshaw'],
    descriptions: ['Daily commute', 'Office travel', 'Metro recharge'],
  },
  {
    category: 'Utilities',
    total: 6490,
    count: 14,
    min: 180,
    max: 1450,
    merchants: ['BESCOM Electricity', 'Airtel', 'Jio Fiber', 'Water Board'],
    descriptions: ['Utility bill payment', 'Internet recharge', 'Electricity bill'],
  },
  {
    category: 'Healthcare',
    total: 4175,
    count: 9,
    min: 120,
    max: 1200,
    merchants: ['Apollo Pharmacy', 'MedPlus', 'Practo', 'Dr Lal PathLabs'],
    descriptions: ['Medicines purchase', 'Health checkup', 'Doctor consultation'],
  },
  {
    category: 'Shopping',
    total: 5822,
    count: 14,
    min: 150,
    max: 980,
    merchants: ['Amazon', 'Flipkart', 'Myntra', 'Decathlon'],
    descriptions: ['Online shopping', 'Home utility order', 'Lifestyle purchase'],
  },
  {
    category: 'Entertainment',
    total: 3750,
    count: 12,
    min: 120,
    max: 760,
    merchants: ['PVR Cinemas', 'Netflix', 'Spotify', 'BookMyShow'],
    descriptions: ['Weekend entertainment', 'Streaming subscription', 'Movie tickets'],
  },
  {
    category: 'Travel',
    total: 3010,
    count: 10,
    min: 120,
    max: 650,
    merchants: ['IRCTC', 'RedBus', 'MakeMyTrip'],
    descriptions: ['Intercity travel', 'Bus booking', 'Rail booking'],
  },
];

const FIXED_TRANSACTIONS = [
  {
    id: 1,
    date: '2026-06-15',
    payee: 'Vithu Vada Pav',
    amount: 88,
    category: 'Food & Tea',
    source: 'GPay',
    description: 'Evening snack after office',
    categorizationConfidence: 0.97,
  },
  {
    id: 2,
    date: '2026-04-03',
    payee: 'BOKKA KATAIAH',
    amount: 8000,
    category: 'Family Support',
    source: 'GPay',
    description: 'Family support transfer',
    categorizationConfidence: 0.96,
  },
  {
    id: 3,
    date: '2026-04-20',
    payee: 'BOKKA KATAIAH',
    amount: 8000,
    category: 'Family Support',
    source: 'UPI',
    description: 'Monthly support transfer',
    categorizationConfidence: 0.96,
  },
  {
    id: 4,
    date: '2026-05-05',
    payee: 'BOKKA KATAIAH',
    amount: 8000,
    category: 'Family Support',
    source: 'PhonePe',
    description: 'Home expense support',
    categorizationConfidence: 0.96,
  },
  {
    id: 5,
    date: '2026-06-02',
    payee: 'BOKKA KATAIAH',
    amount: 8000,
    category: 'Family Support',
    source: 'GPay',
    description: 'Medical support transfer',
    categorizationConfidence: 0.96,
  },
  {
    id: 6,
    date: '2026-06-24',
    payee: 'BOKKA KATAIAH',
    amount: 8000,
    category: 'Family Support',
    source: 'UPI',
    description: 'Family emergency support',
    categorizationConfidence: 0.96,
  },
  {
    id: 7,
    date: '2026-04-14',
    payee: 'Vithu Vada Pav',
    amount: 74,
    category: 'Food & Tea',
    source: 'GPay',
    description: 'Tea and snack stop',
    categorizationConfidence: 0.94,
  },
  {
    id: 8,
    date: '2026-04-26',
    payee: 'Vithu Vada Pav',
    amount: 92,
    category: 'Food & Tea',
    source: 'PhonePe',
    description: 'Evening tea break',
    categorizationConfidence: 0.93,
  },
  {
    id: 9,
    date: '2026-05-12',
    payee: 'Vithu Vada Pav',
    amount: 80,
    category: 'Food & Tea',
    source: 'GPay',
    description: 'Quick tiffin',
    categorizationConfidence: 0.91,
  },
  {
    id: 10,
    date: '2026-05-28',
    payee: 'Vithu Vada Pav',
    amount: 101,
    category: 'Food & Tea',
    source: 'UPI',
    description: 'Late evening snack',
    categorizationConfidence: 0.92,
  },
  {
    id: 11,
    date: '2026-06-21',
    payee: 'Vithu Vada Pav',
    amount: 95,
    category: 'Food & Tea',
    source: 'GPay',
    description: 'Tea and vada pav',
    categorizationConfidence: 0.95,
  },
];

const statementsDb = [
  {
    statementId: 'stmt_apr_2026_icici',
    householdId: DEFAULT_HOUSEHOLD_ID,
    fileName: 'ICICI-Apr-2026.pdf',
    transactionCount: 68,
    needsReviewCount: 2,
    parsedAt: '2026-05-01T07:40:00Z',
    uploadedAt: '2026-05-01T07:35:00Z',
    status: 'success',
    parseStatus: 'parsed',
  },
  {
    statementId: 'stmt_may_2026_gpay',
    householdId: DEFAULT_HOUSEHOLD_ID,
    fileName: 'GPay-May-2026.csv',
    transactionCount: 71,
    needsReviewCount: 3,
    parsedAt: '2026-06-01T06:15:00Z',
    uploadedAt: '2026-06-01T06:08:00Z',
    status: 'success',
    parseStatus: 'parsed',
  },
  {
    statementId: 'stmt_jun_2026_hdfc',
    householdId: DEFAULT_HOUSEHOLD_ID,
    fileName: 'HDFC-Jun-2026.pdf',
    transactionCount: 61,
    needsReviewCount: 4,
    parsedAt: '2026-07-01T05:10:00Z',
    uploadedAt: '2026-07-01T05:01:00Z',
    status: 'success',
    parseStatus: 'parsed',
  },
];

function createRng(seed = 20260701) {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 48271) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function pickOne(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

function toIsoDate(date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRange(start, end) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const dates = [];

  for (let cursor = startDate; cursor <= endDate; cursor = new Date(cursor.getTime() + 86400000)) {
    dates.push(toIsoDate(cursor));
  }

  return dates;
}

const historicalDates = getDateRange('2026-04-01', '2026-06-30');

function splitTotal(total, count, min, max, rng) {
  if (count <= 0) {
    return [];
  }

  const values = [];
  let remaining = round2(total);

  for (let index = 0; index < count; index += 1) {
    const slotsLeft = count - index - 1;

    if (slotsLeft === 0) {
      values.push(round2(remaining));
      break;
    }

    const minAllowed = round2(Math.max(min, remaining - slotsLeft * max));
    const maxAllowed = round2(Math.min(max, remaining - slotsLeft * min));
    const spread = Math.max(0, maxAllowed - minAllowed);
    const amount = round2(minAllowed + spread * rng());

    values.push(amount);
    remaining = round2(remaining - amount);
  }

  return values;
}

function markNeedsReview(confidence) {
  return confidence < 0.68;
}

function buildInitialTransactions() {
  const rng = createRng(20260401);
  const transactions = FIXED_TRANSACTIONS.map((item) => ({
    ...item,
    householdId: DEFAULT_HOUSEHOLD_ID,
    needsReview: markNeedsReview(item.categorizationConfidence),
  }));

  let nextId = 12;

  for (const blueprint of CATEGORY_BLUEPRINTS) {
    let remainingTotal = blueprint.total;
    let remainingCount = blueprint.count;

    if (blueprint.category === 'Family Support') {
      remainingTotal = round2(remainingTotal - 40000);
      remainingCount -= 5;
    }

    if (blueprint.category === 'Food & Tea') {
      remainingTotal = round2(remainingTotal - 530);
      remainingCount -= 6;
    }

    const generatedAmounts = splitTotal(
      remainingTotal,
      remainingCount,
      blueprint.min,
      blueprint.max,
      rng,
    );

    for (const amount of generatedAmounts) {
      const merchant = pickOne(blueprint.merchants, rng);
      const source = pickOne(SOURCE_OPTIONS, rng);
      const date = pickOne(historicalDates, rng);
      const confidence = round2(0.52 + rng() * 0.47);
      const description = pickOne(blueprint.descriptions, rng);

      transactions.push({
        id: nextId,
        householdId: DEFAULT_HOUSEHOLD_ID,
        date,
        payee: merchant,
        amount,
        category: blueprint.category,
        source,
        description,
        categorizationConfidence: confidence,
        needsReview: markNeedsReview(confidence),
      });

      nextId += 1;
    }
  }

  return transactions
    .sort((first, second) => first.id - second.id)
    .map((transaction) => ({
      ...transaction,
      amount: round2(transaction.amount),
    }));
}

const transactionsDb = buildInitialTransactions();
let nextTransactionId = transactionsDb.length + 1;
let statementCounter = 1000;

function delay(min = 220, max = 640) {
  const wait = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => {
    setTimeout(resolve, wait);
  });
}

function inDateRange(dateValue, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) {
    return true;
  }

  if (dateFrom && dateValue < dateFrom) {
    return false;
  }

  if (dateTo && dateValue > dateTo) {
    return false;
  }

  return true;
}

function getFilteredTransactions(householdId, dateFrom, dateTo, category) {
  return transactionsDb.filter((transaction) => {
    const sameHousehold =
      !householdId || transaction.householdId === householdId || householdId === DEFAULT_HOUSEHOLD_ID;
    const categoryMatch =
      !category ||
      category === 'All Categories' ||
      transaction.category.toLowerCase() === String(category).toLowerCase();

    return (
      sameHousehold &&
      categoryMatch &&
      inDateRange(transaction.date, dateFrom, dateTo)
    );
  });
}

function aggregateByCategory(transactions) {
  const sums = {};

  for (const transaction of transactions) {
    sums[transaction.category] = round2((sums[transaction.category] || 0) + transaction.amount);
  }

  return Object.fromEntries(
    Object.entries(sums).sort((first, second) => second[1] - first[1]),
  );
}

function aggregateTopMerchants(transactions) {
  const merchantMap = new Map();

  for (const transaction of transactions) {
    const existing = merchantMap.get(transaction.payee);
    if (existing) {
      existing.total = round2(existing.total + transaction.amount);
      existing.count += 1;
    } else {
      merchantMap.set(transaction.payee, {
        name: transaction.payee,
        total: round2(transaction.amount),
        count: 1,
      });
    }
  }

  return Array.from(merchantMap.values())
    .sort((first, second) => second.total - first.total)
    .slice(0, 12);
}

function aggregateDailyTrend(transactions) {
  const dailyMap = new Map();

  for (const transaction of transactions) {
    const previous = dailyMap.get(transaction.date) || 0;
    dailyMap.set(transaction.date, round2(previous + transaction.amount));
  }

  return Array.from(dailyMap.entries())
    .sort((first, second) => first[0].localeCompare(second[0]))
    .map(([date, amount]) => ({ date, amount }));
}

function generateUploadedTransactions(householdId, count) {
  const rng = createRng(Date.now());
  const now = new Date();
  const generated = [];

  for (let index = 0; index < count; index += 1) {
    const blueprint = pickOne(CATEGORY_BLUEPRINTS, rng);
    const merchant = pickOne(blueprint.merchants, rng);
    const source = pickOne(SOURCE_OPTIONS, rng);
    const confidence = round2(0.45 + rng() * 0.52);
    const amount = round2(blueprint.min + rng() * (blueprint.max - blueprint.min));
    const dayOffset = Math.floor(rng() * 25);
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);

    generated.push({
      id: nextTransactionId,
      householdId,
      date: toIsoDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))),
      payee: merchant,
      amount,
      category: blueprint.category,
      source,
      description: pickOne(blueprint.descriptions, rng),
      categorizationConfidence: confidence,
      needsReview: markNeedsReview(confidence),
    });

    nextTransactionId += 1;
  }

  return generated;
}

export async function fetchTransactions(
  householdId,
  dateFrom,
  dateTo,
  category,
  limit = 25,
  offset = 0,
) {
  await delay();

  const filtered = getFilteredTransactions(householdId, dateFrom, dateTo, category).sort((first, second) => {
    const byDate = second.date.localeCompare(first.date);
    if (byDate !== 0) {
      return byDate;
    }

    return second.id - first.id;
  });

  const safeLimit = Math.max(1, Number(limit) || 25);
  const safeOffset = Math.max(0, Number(offset) || 0);
  const data = filtered.slice(safeOffset, safeOffset + safeLimit);

  return {
    data,
    transactions: data,
    total: filtered.length,
    limit: safeLimit,
    offset: safeOffset,
  };
}

export async function fetchSummary(householdId, dateFrom, dateTo) {
  await delay(180, 520);

  const scopedTransactions = getFilteredTransactions(householdId, dateFrom, dateTo);
  const totalSpent = round2(
    scopedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
  );

  return {
    totalSpent,
    byCategory: aggregateByCategory(scopedTransactions),
    topMerchants: aggregateTopMerchants(scopedTransactions),
    dailyTrend: aggregateDailyTrend(scopedTransactions),
    transactionCount: scopedTransactions.length,
  };
}

export async function uploadStatement(file, householdId = DEFAULT_HOUSEHOLD_ID) {
  if (!file) {
    throw new Error('Statement file is required.');
  }

  await delay(600, 1200);

  const transactionCount = 45;
  const uploadedTransactions = generateUploadedTransactions(householdId, transactionCount);
  transactionsDb.push(...uploadedTransactions);

  const needsReviewCount = uploadedTransactions.filter((transaction) => transaction.needsReview).length;
  const parsedAt = new Date().toISOString();
  const statementId = `stmt_${statementCounter}`;
  statementCounter += 1;

  const statementRecord = {
    statementId,
    householdId,
    fileName: file.name || `statement_${statementId}.pdf`,
    transactionCount,
    parsedAt,
    uploadedAt: new Date().toISOString(),
    needsReviewCount,
    status: 'success',
    parseStatus: 'parsed',
  };

  statementsDb.push(statementRecord);

  return {
    statementId,
    transactionCount,
    parsedAt,
    needsReviewCount,
    status: 'success',
  };
}

export async function updateTransaction(transactionId, updates = {}) {
  await delay(120, 420);

  const transaction = transactionsDb.find(
    (entry) => String(entry.id) === String(transactionId),
  );

  if (!transaction) {
    return {
      success: false,
      transaction: null,
    };
  }

  if (typeof updates.category === 'string' && updates.category.trim()) {
    transaction.category = updates.category.trim();
  }

  if (typeof updates.description === 'string') {
    transaction.description = updates.description.trim();
  }

  transaction.categorizationConfidence = round2(Math.max(0.82, transaction.categorizationConfidence));
  transaction.needsReview = markNeedsReview(transaction.categorizationConfidence);

  return {
    success: true,
    transaction: { ...transaction },
  };
}

export async function fetchStatement(householdId = DEFAULT_HOUSEHOLD_ID) {
  await delay(100, 320);

  return statementsDb
    .filter((statement) => !householdId || statement.householdId === householdId)
    .sort((first, second) => second.parsedAt.localeCompare(first.parsedAt));
}

const expensesClient = {
  fetchTransactions,
  fetchSummary,
  uploadStatement,
  updateTransaction,
  fetchStatement,
};

export default expensesClient;
