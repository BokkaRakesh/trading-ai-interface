import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

function fmtShort(n) {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const invested = payload.find((p) => p.dataKey === 'invested')?.value ?? 0;
  const current = payload.find((p) => p.dataKey === 'value')?.value ?? 0;
  const gainLoss = current - invested;
  const isGain = gainLoss >= 0;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-gray-400 font-medium mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-gray-400">Portfolio Value</span>
          <span className="text-white font-semibold">{fmtShort(current)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-gray-400">Invested</span>
          <span className="text-blue-300">{fmtShort(invested)}</span>
        </div>
        <div className="flex justify-between gap-6 pt-1 border-t border-gray-700">
          <span className="text-gray-400">Gain / Loss</span>
          <span className={isGain ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
            {isGain ? '+' : ''}{fmtShort(Math.abs(gainLoss))}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PerformanceChart({ performance }) {
  if (!performance?.dates?.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center justify-center h-48">
        <p className="text-gray-500 text-sm">No performance data available.</p>
      </div>
    );
  }

  const data = performance.dates.map((date, i) => ({
    date: new Date(date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    value: performance.values[i],
    invested: performance.invested_amounts[i],
  }));

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Portfolio Growth</h3>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" />
            <span className="text-gray-400">Current Value</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-400 inline-block rounded border-dashed border-b border-blue-400" />
            <span className="text-gray-400">Invested</span>
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="grad_value" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad_invested" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={fmtShort} tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="invested" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="5 3"
            fill="url(#grad_invested)" dot={false} name="Invested" />
          <Area type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2}
            fill="url(#grad_value)" dot={false} name="Current Value" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
