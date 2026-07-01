import PropTypes from 'prop-types';
import { ReceiptIndianRupee, Landmark, ShoppingBag, ListChecks } from 'lucide-react';

const inrCompactFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatInr(value) {
  return inrCompactFormatter.format(Number(value) || 0);
}

function SummarySkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-7 w-36 bg-slate-300 rounded" />
            <div className="h-3 w-28 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SummaryStats({ summary, loading }) {
  if (loading) {
    return <SummarySkeleton />;
  }

  const totalSpent = summary?.totalSpent || 0;
  const topCategory = summary?.topCategory || {
    name: 'No category',
    amount: 0,
    percentage: 0,
  };
  const topMerchant = summary?.topMerchant || {
    name: 'No merchant',
    total: 0,
  };
  const transactionCount = summary?.transactionCount || 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/80">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold uppercase tracking-wide">
            <ReceiptIndianRupee className="w-4 h-4 text-emerald-600" />
            Total Spent
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {formatInr(totalSpent)}
          </p>
          <p className="text-xs text-slate-500 mt-1">For selected date range</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/80">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold uppercase tracking-wide">
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
            Top Category
          </div>
          <p className="mt-2 text-base sm:text-lg font-semibold text-slate-900">
            {topCategory.name}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            {formatInr(topCategory.amount)} ({Math.round(topCategory.percentage || 0)}%)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/80">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold uppercase tracking-wide">
            <Landmark className="w-4 h-4 text-blue-600" />
            Top Merchant
          </div>
          <p className="mt-2 text-base sm:text-lg font-semibold text-slate-900 break-words">
            {topMerchant.name}
          </p>
          <p className="text-sm text-slate-600 mt-1">{formatInr(topMerchant.total)}</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/80">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold uppercase tracking-wide">
            <ListChecks className="w-4 h-4 text-emerald-600" />
            Transaction Count
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {transactionCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">transactions</p>
        </div>
      </div>
    </div>
  );
}

SummaryStats.propTypes = {
  summary: PropTypes.shape({
    totalSpent: PropTypes.number,
    topCategory: PropTypes.shape({
      name: PropTypes.string,
      amount: PropTypes.number,
      percentage: PropTypes.number,
    }),
    topMerchant: PropTypes.shape({
      name: PropTypes.string,
      total: PropTypes.number,
      count: PropTypes.number,
    }),
    transactionCount: PropTypes.number,
  }),
  loading: PropTypes.bool,
};

SummaryStats.defaultProps = {
  summary: null,
  loading: false,
};
