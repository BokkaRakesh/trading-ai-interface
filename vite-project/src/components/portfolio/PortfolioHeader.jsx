import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

export default function PortfolioHeader({ summary }) {
  const isGain = (summary?.total_gain_loss ?? 0) >= 0;
  const lastUpdated = summary?.last_updated
    ? new Date(summary.last_updated).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left — current value */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Portfolio Value</p>
          <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            ₹{fmt(summary?.total_current_value ?? 0)}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Invested: <span className="text-gray-200">₹{fmt(summary?.total_invested ?? 0)}</span>
          </p>
        </div>

        {/* Right — gain/loss */}
        <div className={`flex flex-col items-start sm:items-end ${isGain ? 'text-green-400' : 'text-red-400'}`}>
          <div className="flex items-center gap-2">
            {isGain ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            <span className="text-2xl sm:text-3xl font-bold">
              {isGain ? '+' : ''}₹{fmt(Math.abs(summary?.total_gain_loss ?? 0))}
            </span>
          </div>
          <span className={`text-lg font-semibold mt-0.5 ${isGain ? 'text-green-300' : 'text-red-300'}`}>
            {isGain ? '+' : ''}{(summary?.roi_percent ?? 0).toFixed(2)}% overall
          </span>
          {lastUpdated && (
            <span className="flex items-center gap-1 text-xs text-gray-500 mt-2">
              <Clock className="w-3 h-3" />
              Updated {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* Quick allocation bar */}
      {summary?.allocation_by_asset_class && (
        <div className="mt-5">
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
            {Object.entries(summary.allocation_by_asset_class).map(([label, data], i) => {
              const pct = parseFloat(data.percent) || 0;
              const COLORS = ['bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-cyan-500','bg-rose-500','bg-orange-500'];
              return (
                <div
                  key={label}
                  className={`${COLORS[i % COLORS.length]} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${label}: ${data.percent}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {Object.entries(summary.allocation_by_asset_class).map(([label, data], i) => {
              const COLORS = ['text-blue-400','text-emerald-400','text-amber-400','text-purple-400','text-cyan-400','text-rose-400','text-orange-400'];
              return (
                <span key={label} className={`text-xs ${COLORS[i % COLORS.length]}`}>
                  {label} {data.percent}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
