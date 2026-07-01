import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

// ── Colour palette ────────────────────────────────────────────────────────────
const PALETTE = [
  '#0ea5e9', // sky-500
  '#10b981', // emerald-500
  '#6366f1', // indigo-500
  '#f97316', // orange-500
  '#ef4444', // red-500
  '#22c55e', // green-500
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#84cc16', // lime-500
  '#06b6d4', // cyan-500
];

// ── Formatters ────────────────────────────────────────────────────────────────
const inrFull = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const inrNoDecimal = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function fmtInr(value) {
  return inrFull.format(Number(value) || 0);
}

function fmtInrShort(value) {
  const num = Number(value) || 0;
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)}L`;
  }
  return inrNoDecimal.format(num);
}

function pct(value, total) {
  if (!total || !value) return '0.0';
  return ((value / total) * 100).toFixed(1);
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;

  const { name, value } = payload[0];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-2xl min-w-44">
      <p className="text-sm font-semibold text-white mb-2 leading-tight">{name}</p>
      <p className="text-lg font-bold text-cyan-400">{fmtInr(value)}</p>
      <p className="text-xs text-gray-400 mt-0.5">{pct(value, total)}% of total</p>
    </div>
  );
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
    }),
  ),
  total: PropTypes.number.isRequired,
};

CustomTooltip.defaultProps = {
  active: false,
  payload: [],
};

// ── Custom legend ─────────────────────────────────────────────────────────────
function CustomLegend({ chartData, activeIndex, total, onHover, onClick }) {
  return (
    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      {chartData.map((entry, index) => {
        const isHighlighted = activeIndex === null || activeIndex === index;
        const color = PALETTE[index % PALETTE.length];

        return (
          <button
            key={entry.name}
            type="button"
            onClick={() => onClick(entry.name)}
            onMouseEnter={() => onHover(index)}
            onMouseLeave={() => onHover(null)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
              isHighlighted
                ? 'bg-gray-700/60 hover:bg-gray-700'
                : 'bg-gray-800/30 opacity-50 hover:opacity-75 hover:bg-gray-700/30'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white/10"
              style={{ backgroundColor: color }}
            />
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-medium text-gray-200 truncate">
                {entry.name}
              </span>
              <span className="block text-xs text-gray-400">
                {fmtInr(entry.amount)}&nbsp;·&nbsp;{pct(entry.amount, total)}%
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

CustomLegend.propTypes = {
  chartData: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      amount: PropTypes.number.isRequired,
    }),
  ).isRequired,
  activeIndex: PropTypes.number,
  total: PropTypes.number.isRequired,
  onHover: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
};

CustomLegend.defaultProps = {
  activeIndex: null,
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function CategoryChartSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5 animate-pulse">
      <div className="h-4 w-40 bg-gray-700 rounded mb-6" />
      <div className="flex items-center justify-center" style={{ height: 300 }}>
        <div className="w-56 h-56 rounded-full bg-gray-700 ring-[40px] ring-gray-800" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CategoryChart({ data, onCategoryClick, loading, selectedCategory }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [activeIndex, setActiveIndex] = useState(null);

  const chartData = useMemo(
    () =>
      Object.entries(data || {})
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount),
    [data],
  );

  const total = useMemo(
    () => chartData.reduce((sum, item) => sum + item.amount, 0),
    [chartData],
  );

  const handleSliceClick = (entry) => {
    if (entry?.name) {
      onCategoryClick(entry.name);
    }
  };

  const handleLegendClick = (name) => {
    onCategoryClick(name);
  };

  if (loading) return <CategoryChartSkeleton />;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-white">Category Breakdown</h2>
        <span className="text-xs text-gray-400">Click slice or legend to filter</span>
      </div>

      {chartData.length === 0 ? (
        <div
          className="mt-4 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center text-sm text-gray-400"
          style={{ height: 300 }}
        >
          No spending data for this date range.
        </div>
      ) : (
        <>
          {/* Donut + center label */}
          <div className="relative" style={{ height: 300, minWidth: 0 }}>
            {mounted && <ResponsiveContainer width="100%" height={300} minWidth={1}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="42%"
                  outerRadius="68%"
                  paddingAngle={2}
                  onClick={handleSliceClick}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  isAnimationActive
                  animationBegin={0}
                  animationDuration={600}
                >
                  {chartData.map((entry, index) => {
                    const isActive =
                      activeIndex === null ||
                      activeIndex === index ||
                      selectedCategory === entry.name;

                    return (
                      <Cell
                        key={entry.name}
                        fill={PALETTE[index % PALETTE.length]}
                        opacity={isActive ? 1 : 0.35}
                        stroke={
                          activeIndex === index || selectedCategory === entry.name
                            ? '#f9fafb'
                            : 'transparent'
                        }
                        strokeWidth={
                          activeIndex === index || selectedCategory === entry.name ? 2 : 0
                        }
                        style={{ cursor: 'pointer', outline: 'none' }}
                      />
                    );
                  })}
                </Pie>
                <Tooltip
                  content={<CustomTooltip total={total} />}
                  cursor={false}
                />
              </PieChart>
            </ResponsiveContainer>}

            {/* Center label — overlaid absolutely on the donut hole */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="text-center px-2">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                  Total Spent
                </p>
                <p className="text-xl font-bold text-white mt-0.5 leading-tight">
                  {fmtInrShort(total)}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {chartData.length} categories
                </p>
              </div>
            </div>
          </div>

          {/* Custom legend */}
          <CustomLegend
            chartData={chartData}
            activeIndex={activeIndex}
            total={total}
            onHover={setActiveIndex}
            onClick={handleLegendClick}
          />
        </>
      )}
    </div>
  );
}

CategoryChart.propTypes = {
  data: PropTypes.objectOf(PropTypes.number),
  onCategoryClick: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  selectedCategory: PropTypes.string,
};

CategoryChart.defaultProps = {
  data: {},
  loading: false,
  selectedCategory: '',
};
