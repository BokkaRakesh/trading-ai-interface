import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileUp,
  LoaderCircle,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import SummaryStats from './SummaryStats';
import expensesClient from '../api/expensesClient';

const PAGE_SIZE = 20;
const ALL_CATEGORIES = 'All Categories';

const TIME_FILTERS = [
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'last3Months', label: 'Last 3 Months' },
  { key: 'last6Months', label: 'Last 6 Months' },
  { key: 'yearToDate', label: 'Year to Date' },
  { key: 'custom', label: 'Custom Range' },
];

const CHART_COLORS = [
  '#0ea5e9',
  '#10b981',
  '#6366f1',
  '#f97316',
  '#ef4444',
  '#22c55e',
  '#14b8a6',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#84cc16',
];

const HOUSEHOLD_OPTIONS = [
  { id: 'household_rakesh', label: 'Rakesh Household' },
  { id: 'household_joint', label: 'Joint Household' },
];

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const shortDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function getRangeForPreset(preset, now = new Date()) {
  const today = new Date(now);

  if (preset === 'lastMonth') {
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const from = new Date(firstDayOfCurrentMonth);
    from.setMonth(from.getMonth() - 1);

    const to = new Date(firstDayOfCurrentMonth);
    to.setDate(0);

    return {
      from: toIsoDate(from),
      to: toIsoDate(to),
    };
  }

  if (preset === 'last3Months') {
    const from = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return {
      from: toIsoDate(from),
      to: toIsoDate(today),
    };
  }

  if (preset === 'last6Months') {
    const from = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    return {
      from: toIsoDate(from),
      to: toIsoDate(today),
    };
  }

  if (preset === 'yearToDate') {
    const from = new Date(today.getFullYear(), 0, 1);
    return {
      from: toIsoDate(from),
      to: toIsoDate(today),
    };
  }

  return {
    from: toIsoDate(today),
    to: toIsoDate(today),
  };
}

function getSummaryStats(summary, total) {
  const byCategoryEntries = Object.entries(summary?.byCategory || {}).sort((a, b) => b[1] - a[1]);
  const [topCategoryName, topCategoryAmount] = byCategoryEntries[0] || ['No category', 0];
  const topCategoryPercentage =
    summary?.totalSpent > 0 ? (topCategoryAmount / summary.totalSpent) * 100 : 0;

  const topMerchant = summary?.topMerchants?.[0] || {
    name: 'No merchant',
    total: 0,
    count: 0,
  };

  return {
    totalSpent: summary?.totalSpent || 0,
    topCategory: {
      name: topCategoryName,
      amount: topCategoryAmount,
      percentage: topCategoryPercentage,
    },
    topMerchant,
    transactionCount: Number.isFinite(summary?.transactionCount)
      ? summary.transactionCount
      : total,
  };
}

function TimeFilter({ activeFilter, dateRange, showCustomRange, onFilterChange, onCustomDateChange }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
        <CalendarRange className="w-4 h-4 text-cyan-400" />
        Time Filters
      </div>

      <div className="flex flex-wrap gap-2">
        {TIME_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => onFilterChange(filter.key)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === filter.key
                ? 'bg-cyan-600 text-white shadow'
                : 'bg-gray-900 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {showCustomRange && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm text-gray-300">
            From
            <input
              type="date"
              value={dateRange.from}
              onChange={(event) => onCustomDateChange('from', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </label>

          <label className="text-sm text-gray-300">
            To
            <input
              type="date"
              value={dateRange.to}
              onChange={(event) => onCustomDateChange('to', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </label>
        </div>
      )}
    </div>
  );
}

TimeFilter.propTypes = {
  activeFilter: PropTypes.string.isRequired,
  dateRange: PropTypes.shape({
    from: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
  }).isRequired,
  showCustomRange: PropTypes.bool.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onCustomDateChange: PropTypes.func.isRequired,
};

function UploadCard({ uploading, uploadProgress, statements, onUpload }) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const pickFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-base font-semibold text-white">Upload Statement</h2>
        <span className="text-xs text-gray-400">CSV, XLSX or PDF</span>
      </div>

      <div
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? 'border-cyan-400 bg-cyan-500/10' : 'border-gray-600 bg-gray-900'
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <FileUp className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
        <p className="text-sm text-gray-200 mb-2">Drag and drop a bank statement here</p>
        <button
          type="button"
          onClick={pickFile}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <LoaderCircle className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <FileUp className="w-4 h-4" />
              Choose File
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onUpload(file);
            }
            event.target.value = '';
          }}
        />
      </div>

      {uploading && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
            <span>Parsing statement</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {statements.length > 0 && (
        <div className="mt-4 border-t border-gray-700 pt-3">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Recent Uploads</p>
          <div className="space-y-2">
            {statements.slice(0, 3).map((statement) => (
              <div
                key={statement.statementId}
                className="rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-gray-100 font-medium">{statement.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {statement.transactionCount} transactions, {statement.needsReviewCount} need review
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-md text-xs font-semibold ${
                    statement.status === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {statement.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

UploadCard.propTypes = {
  uploading: PropTypes.bool.isRequired,
  uploadProgress: PropTypes.number.isRequired,
  statements: PropTypes.arrayOf(
    PropTypes.shape({
      statementId: PropTypes.string.isRequired,
      fileName: PropTypes.string,
      transactionCount: PropTypes.number,
      needsReviewCount: PropTypes.number,
      status: PropTypes.string,
    }),
  ).isRequired,
  onUpload: PropTypes.func.isRequired,
};

function CategoryChart({ byCategory, selectedCategory, onSliceClick }) {
  const chartData = useMemo(
    () =>
      Object.entries(byCategory || {}).map(([name, amount]) => ({
        name,
        amount,
      })),
    [byCategory],
  );

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white">Category Breakdown</h2>
        <span className="text-xs text-gray-400">Click a slice to filter transactions</span>
      </div>

      {chartData.length === 0 ? (
        <div className="h-72 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center text-sm text-gray-400">
          No category data for this date range.
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={72}
                outerRadius={120}
                paddingAngle={2}
                onClick={(slice) => {
                  if (slice?.name) {
                    onSliceClick(slice.name);
                  }
                }}
              >
                {chartData.map((entry, index) => {
                  const isActive = selectedCategory === entry.name;
                  return (
                    <Cell
                      key={entry.name}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      stroke={isActive ? '#e5e7eb' : 'transparent'}
                      strokeWidth={isActive ? 2 : 0}
                      style={{ cursor: 'pointer' }}
                    />
                  );
                })}
              </Pie>
              <Tooltip
                formatter={(value) => inrFormatter.format(Number(value) || 0)}
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '0.75rem',
                }}
                itemStyle={{ color: '#e5e7eb' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Legend wrapperStyle={{ color: '#e5e7eb', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

CategoryChart.propTypes = {
  byCategory: PropTypes.objectOf(PropTypes.number).isRequired,
  selectedCategory: PropTypes.string.isRequired,
  onSliceClick: PropTypes.func.isRequired,
};

function TransactionsList({
  transactions,
  categoryOptions,
  loading,
  currentPage,
  totalPages,
  totalTransactions,
  onPageChange,
  onUpdateTransaction,
}) {
  const [editingId, setEditingId] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (transaction) => {
    setEditingId(transaction.id);
    setCategoryDraft(transaction.category || '');
    setDescriptionDraft(transaction.description || '');
  };

  const resetEdit = () => {
    setEditingId(null);
    setCategoryDraft('');
    setDescriptionDraft('');
  };

  const saveEdit = async () => {
    if (!editingId) {
      return;
    }

    setSaving(true);
    await onUpdateTransaction(editingId, {
      category: categoryDraft,
      description: descriptionDraft,
    });
    setSaving(false);
    resetEdit();
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-gray-700 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Transactions</h2>
        <span className="text-xs text-gray-400">Total: {totalTransactions}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-gray-900/70 text-gray-300 uppercase tracking-wide text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Payee</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                  <div className="inline-flex items-center gap-2">
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    Loading transactions...
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                  No transactions found for the selected filters.
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => {
                const isEditing = editingId === transaction.id;

                return (
                  <tr key={transaction.id} className="border-t border-gray-700/80 hover:bg-gray-900/40">
                    <td className="px-4 py-3 text-gray-200 whitespace-nowrap">
                      {shortDateFormatter.format(parseIsoDate(transaction.date))}
                    </td>
                    <td className="px-4 py-3 text-gray-100 font-medium">{transaction.payee}</td>
                    <td className="px-4 py-3 text-gray-200 min-w-44">
                      {isEditing ? (
                        <select
                          value={categoryDraft}
                          onChange={(event) => setCategoryDraft(event.target.value)}
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          {categoryOptions.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      ) : (
                        transaction.category
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{transaction.source}</td>
                    <td className="px-4 py-3 text-gray-300 min-w-64">
                      {isEditing ? (
                        <input
                          value={descriptionDraft}
                          onChange={(event) => setDescriptionDraft(event.target.value)}
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      ) : (
                        transaction.description
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-100 font-semibold whitespace-nowrap">
                      {inrFormatter.format(transaction.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {transaction.needsReview ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 text-xs font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          Needs Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Categorized
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={saving}
                            className="px-2.5 py-1 rounded-md bg-cyan-600 text-white text-xs font-medium hover:bg-cyan-500 disabled:opacity-60"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={resetEdit}
                            className="px-2.5 py-1 rounded-md bg-gray-700 text-gray-200 text-xs font-medium hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(transaction)}
                          className="px-2.5 py-1 rounded-md bg-gray-700 text-gray-100 text-xs font-medium hover:bg-gray-600"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 sm:px-5 py-3 border-t border-gray-700 bg-gray-900/60 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gray-700 text-gray-100 hover:bg-gray-600 disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <span className="text-xs sm:text-sm text-gray-300">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gray-700 text-gray-100 hover:bg-gray-600 disabled:opacity-45 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

TransactionsList.propTypes = {
  transactions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      date: PropTypes.string.isRequired,
      payee: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      source: PropTypes.string.isRequired,
      description: PropTypes.string,
      amount: PropTypes.number.isRequired,
      needsReview: PropTypes.bool,
    }),
  ).isRequired,
  categoryOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  loading: PropTypes.bool.isRequired,
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  totalTransactions: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onUpdateTransaction: PropTypes.func.isRequired,
};

export default function ExpensesTab() {
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(HOUSEHOLD_OPTIONS[0].id);
  const [dateRange, setDateRange] = useState(() => getRangeForPreset('lastMonth'));
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [summary, setSummary] = useState(null);
  const [statements, setStatements] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTimeFilter, setActiveTimeFilter] = useState('lastMonth');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const offset = (currentPage - 1) * PAGE_SIZE;

  const loadStatements = useCallback(async () => {
    const response = await expensesClient.fetchStatement(selectedHouseholdId);
    const statementItems =
      response?.statements ||
      response?.data ||
      (Array.isArray(response) ? response : []);

    setStatements(statementItems);
  }, [selectedHouseholdId]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const categoryFilter = selectedCategory === ALL_CATEGORIES ? undefined : selectedCategory;

      const [transactionResponse, summaryResponse] = await Promise.all([
        expensesClient.fetchTransactions(
          selectedHouseholdId,
          dateRange.from,
          dateRange.to,
          categoryFilter,
          PAGE_SIZE,
          offset,
        ),
        expensesClient.fetchSummary(selectedHouseholdId, dateRange.from, dateRange.to),
      ]);

      setTransactions(transactionResponse?.transactions || transactionResponse?.data || []);
      setTotalTransactions(Number(transactionResponse?.total || 0));
      setSummary(summaryResponse || null);
    } catch (error) {
      setErrorMessage(error?.message || 'Unable to fetch expenses data right now.');
    } finally {
      setLoading(false);
    }
  }, [selectedHouseholdId, dateRange.from, dateRange.to, selectedCategory, offset]);

  useEffect(() => {
    loadStatements();
  }, [loadStatements]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const previousFilterRef = useRef({
    selectedHouseholdId,
    from: dateRange.from,
    to: dateRange.to,
    selectedCategory,
  });

  useEffect(() => {
    const filterChanged =
      previousFilterRef.current.selectedHouseholdId !== selectedHouseholdId ||
      previousFilterRef.current.from !== dateRange.from ||
      previousFilterRef.current.to !== dateRange.to ||
      previousFilterRef.current.selectedCategory !== selectedCategory;

    if (filterChanged) {
      previousFilterRef.current = {
        selectedHouseholdId,
        from: dateRange.from,
        to: dateRange.to,
        selectedCategory,
      };
      setCurrentPage(1);
    }
  }, [selectedHouseholdId, dateRange.from, dateRange.to, selectedCategory]);

  const summaryStats = useMemo(
    () => getSummaryStats(summary, totalTransactions),
    [summary, totalTransactions],
  );

  const categoryOptions = useMemo(() => {
    const fromSummary = Object.keys(summary?.byCategory || {});
    return [ALL_CATEGORIES, ...fromSummary];
  }, [summary]);

  const totalPages = Math.max(1, Math.ceil(totalTransactions / PAGE_SIZE));

  const changeTimeFilter = (filterKey) => {
    setActiveTimeFilter(filterKey);

    if (filterKey === 'custom') {
      setShowCustomRange(true);
      return;
    }

    setShowCustomRange(false);
    setDateRange(getRangeForPreset(filterKey));
  };

  const updateCustomDate = (field, value) => {
    setDateRange((previous) => {
      const nextRange = {
        ...previous,
        [field]: value,
      };

      if (nextRange.from > nextRange.to) {
        return previous;
      }

      return nextRange;
    });
  };

  const clearCategoryFilter = () => {
    setSelectedCategory(ALL_CATEGORIES);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    setUploadProgress(8);

    const timer = window.setInterval(() => {
      setUploadProgress((previous) => (previous >= 92 ? previous : previous + 8));
    }, 170);

    try {
      await expensesClient.uploadStatement(file, selectedHouseholdId);
      setUploadProgress(100);
      await Promise.all([loadExpenses(), loadStatements()]);
    } catch (error) {
      setErrorMessage(error?.message || 'Upload failed. Please try again.');
    } finally {
      window.clearInterval(timer);
      window.setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 350);
    }
  };

  const handleUpdateTransaction = async (transactionId, updates) => {
    await expensesClient.updateTransaction(transactionId, updates);
    await loadExpenses();
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Expenses</h1>
          <p className="text-sm text-gray-400 mt-1">
            Analyze spending, review statement parsing, and manage categorization.
          </p>
        </div>

        <label className="text-sm text-gray-300 w-full sm:w-auto">
          Household
          <select
            value={selectedHouseholdId}
            onChange={(event) => setSelectedHouseholdId(event.target.value)}
            className="mt-1 w-full sm:w-52 rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {HOUSEHOLD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <TimeFilter
        activeFilter={activeTimeFilter}
        dateRange={dateRange}
        showCustomRange={showCustomRange}
        onFilterChange={changeTimeFilter}
        onCustomDateChange={updateCustomDate}
      />

      <UploadCard
        uploading={uploading}
        uploadProgress={uploadProgress}
        statements={statements}
        onUpload={handleUpload}
      />

      <SummaryStats summary={summaryStats} loading={loading} />

      <CategoryChart
        byCategory={summary?.byCategory || {}}
        selectedCategory={selectedCategory}
        onSliceClick={(categoryName) => setSelectedCategory(categoryName)}
      />

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
        <label className="text-sm text-gray-300 flex-1">
          <span className="inline-flex items-center gap-2 mb-1.5">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            Category
          </span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={clearCategoryFilter}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-gray-100 text-sm font-medium hover:bg-gray-600"
        >
          <RefreshCw className="w-4 h-4" />
          Clear Filters
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      <TransactionsList
        transactions={transactions}
        categoryOptions={categoryOptions.filter((category) => category !== ALL_CATEGORIES)}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalTransactions={totalTransactions}
        onPageChange={(nextPage) => {
          const boundedPage = Math.max(1, Math.min(totalPages, nextPage));
          setCurrentPage(boundedPage);
        }}
        onUpdateTransaction={handleUpdateTransaction}
      />
    </section>
  );
}
