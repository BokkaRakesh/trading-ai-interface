import { TrendingUp, TrendingDown } from 'lucide-react';

function fmt(n) { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(n ?? 0)); }

function PerformerCard({ title, items, isGainer }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className={`flex items-center gap-2 mb-3 ${isGainer ? 'text-green-400' : 'text-red-400'}`}>
        {isGainer ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="space-y-2">
        {(!items?.length) && (
          <p className="text-xs text-gray-500">No data available.</p>
        )}
        {items?.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-sm text-gray-300 truncate max-w-[60%]">{item.name}</span>
            <div className="flex flex-col items-end">
              <span className={`text-sm font-semibold ${isGainer ? 'text-green-400' : 'text-red-400'}`}>
                {isGainer ? '+' : ''}{item.roi_percent?.toFixed(2)}%
              </span>
              <span className={`text-xs ${isGainer ? 'text-green-600' : 'text-red-600'}`}>
                {isGainer ? '+' : '-'}₹{fmt(item.gain_loss)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TopPerformers({ topGainers, topLosers }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <PerformerCard title="Top Gainers" items={topGainers} isGainer={true} />
      <PerformerCard title="Top Losers" items={topLosers} isGainer={false} />
    </div>
  );
}
