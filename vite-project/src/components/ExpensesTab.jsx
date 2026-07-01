import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { RefreshCw, SlidersHorizontal } from 'lucide-react';
import SummaryStats from './SummaryStats';
import CategoryChart from './CategoryChart';
import TransactionsList from './TransactionsList';
import UploadCard from './UploadCard';
import TimeFilter from './TimeFilter';
import expensesClient from '../api/expensesClient';

const PAGE_SIZE = 20;
const ALL_CATEGORIES = 'All Categories';

const HOUSEHOLD_OPTIONS = [
  { id: 'household_rakesh', label: 'Rakesh Household' },
  { id: 'household_joint', label: 'Joint Household' },
];

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRangeForPreset(preset, now = new Date()) {
  const today = new Date(now);
  if (preset === 'lastMonth') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const from = new Date(first); from.setMonth(from.getMonth() - 1);
    const to = new Date(first); to.setDate(0);
    return { from: toIsoDate(from), to: toIsoDate(to) };
  }
  if (preset === 'last3Months') {
    return { from: toIsoDate(new Date(today.getFullYear(), today.getMonth() - 2, 1)), to: toIsoDate(today) };
  }
  if (preset === 'last6Months') {
    return { from: toIsoDate(new Date(today.getFullYear(), today.getMonth() - 5, 1)), to: toIsoDate(today) };
  }
  if (preset === 'yearToDate') {
    return { from: toIsoDate(new Date(today.getFullYear(), 0, 1)), to: toIsoDate(today) };
  }
  return { from: toIsoDate(today), to: toIsoDate(today) };
}

function getSummaryStats(summary, total) {
  const entries = Object.entries(summary?.byCategory || {}).sort((a, b) => b[1] - a[1]);
  const [topName, topAmt] = entries[0] || ['No category', 0];
  const topPct = summary?.totalSpent > 0 ? (topAmt / summary.totalSpent) * 100 : 0;
  const topMerchant = summary?.topMerchants?.[0] || { name: 'No merchant', total: 0, count: 0 };
  return {
    totalSpent: summary?.totalSpent || 0,
    topCategory: { name: topName, amount: topAmt, percentage: topPct },
    topMerchant,
    transactionCount: Number.isFinite(summary?.transactionCount) ? summary.transactionCount : total,
  };
}

export default function ExpensesTab() {
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(HOUSEHOLD_OPTIONS[0].id);
  const [dateRange, setDateRange] = useState(() => getRangeForPreset('lastMonth'));
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [summary, setSummary] = useState(null);
  const [activeTimeFilter, setActiveTimeFilter] = useState('lastMonth');
  const [errorMessage, setErrorMessage] = useState('');

  const offset = (currentPage - 1) * PAGE_SIZE;

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const categoryFilter = selectedCategory === ALL_CATEGORIES ? undefined : selectedCategory;
      const [txRes, sumRes] = await Promise.all([
        expensesClient.fetchTransactions(selectedHouseholdId, dateRange.from, dateRange.to, categoryFilter, PAGE_SIZE, offset),
        expensesClient.fetchSummary(selectedHouseholdId, dateRange.from, dateRange.to),
      ]);
      setTransactions(txRes?.transactions || txRes?.data || []);
      setTotalTransactions(Number(txRes?.total || 0));
      setSummary(sumRes || null);
    } catch (error) {
      setErrorMessage(error?.message || 'Unable to fetch expenses data right now.');
    } finally {
      setLoading(false);
    }
  }, [selectedHouseholdId, dateRange.from, dateRange.to, selectedCategory, offset]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const previousFilterRef = useRef({ selectedHouseholdId, from: dateRange.from, to: dateRange.to, selectedCategory });

  useEffect(() => {
    const prev = previousFilterRef.current;
    if (prev.selectedHouseholdId !== selectedHouseholdId || prev.from !== dateRange.from ||
        prev.to !== dateRange.to || prev.selectedCategory !== selectedCategory) {
      previousFilterRef.current = { selectedHouseholdId, from: dateRange.from, to: dateRange.to, selectedCategory };
      setCurrentPage(1);
    }
  }, [selectedHouseholdId, dateRange.from, dateRange.to, selectedCategory]);

  const summaryStats = useMemo(() => getSummaryStats(summary, totalTransactions), [summary, totalTransactions]);

  const categoryOptions = useMemo(() => [ALL_CATEGORIES, ...Object.keys(summary?.byCategory || {})], [summary]);

  const totalPages = Math.max(1, Math.ceil(totalTransactions / PAGE_SIZE));

  const handleUpdateTransaction = useCallback(async (id, updates) => {
    await expensesClient.updateTransaction(id, updates);
    await loadExpenses();
  }, [loadExpenses]);

  const handleDeleteTransaction = useCallback((id) => {
    setTransactions((prev) => prev.filter((t) => String(t.id) !== String(id)));
    setTotalTransactions((prev) => Math.max(0, prev - 1));
  }, []);

  const handleCategoryReview = useCallback(async (id, updates) => {
    await expensesClient.updateTransaction(id, updates);
    await loadExpenses();
  }, [loadExpenses]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Expenses</h1>
          <p className="text-sm text-gray-400 mt-1">Analyze spending, review statement parsing, and manage categorization.</p>
        </div>
        <label className="text-sm text-gray-300 w-full sm:w-auto">
          Household
          <select value={selectedHouseholdId} onChange={(e) => setSelectedHouseholdId(e.target.value)}
            className="mt-1 w-full sm:w-52 rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500">
            {HOUSEHOLD_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
      </header>

      <TimeFilter
        selectedRange={activeTimeFilter}
        customDateFrom={dateRange.from}
        customDateTo={dateRange.to}
        onDateRangeChange={(from, to, key) => {
          setActiveTimeFilter(key);
          setDateRange({ from, to });
        }}
      />

      <UploadCard
        householdId={selectedHouseholdId}
        onUploadSuccess={() => loadExpenses()}
        onError={(msg) => setErrorMessage(msg)}
      />

      <SummaryStats summary={summaryStats} loading={loading} />

      <CategoryChart data={summary?.byCategory || {}} selectedCategory={selectedCategory}
        onCategoryClick={(name) => setSelectedCategory(name)} loading={loading} />

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
        <label className="text-sm text-gray-300 flex-1">
          <span className="inline-flex items-center gap-2 mb-1.5">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            Category
          </span>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500">
            {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setSelectedCategory(ALL_CATEGORIES)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-gray-100 text-sm font-medium hover:bg-gray-600">
          <RefreshCw className="w-4 h-4" /> Clear Filters
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      <TransactionsList
        transactions={transactions}
        categoryOptions={categoryOptions.filter((c) => c !== ALL_CATEGORIES)}
        loading={loading}
        page={currentPage}
        totalCount={totalTransactions}
        onPageChange={(nextPage) => setCurrentPage(Math.max(1, Math.min(totalPages, nextPage)))}
        onEdit={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
        onCategoryReview={handleCategoryReview}
      />
    </section>
  );
}
