import { useState } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, CalendarRange, ChevronDown } from 'lucide-react';

// ─── Preset definitions ───────────────────────────────────────────────────────
const PRESETS = [
  { key: 'lastMonth',   label: 'Last Month' },
  { key: 'last3Months', label: 'Last 3 Months' },
  { key: 'last6Months', label: 'Last 6 Months' },
  { key: 'ytd',         label: 'Year to Date' },
  { key: 'custom',      label: 'Custom Range' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Compute { from, to } ISO strings for a given preset key.
 * Returns null for 'custom' (caller supplies dates).
 */
export function computeRange(key, now = new Date()) {
  const today = new Date(now);
  const todayStr = toIso(today);
  if (key === 'lastMonth') {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return { from: toIso(d), to: todayStr };
  }
  if (key === 'last3Months') {
    const d = new Date(today);
    d.setDate(d.getDate() - 90);
    return { from: toIso(d), to: todayStr };
  }
  if (key === 'last6Months') {
    const d = new Date(today);
    d.setDate(d.getDate() - 180);
    return { from: toIso(d), to: todayStr };
  }
  if (key === 'ytd') {
    return { from: `${today.getFullYear()}-01-01`, to: todayStr };
  }
  return null; // 'custom'
}

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * TimeFilter — reusable date range picker with named presets + custom range.
 *
 * Props:
 *   selectedRange      — controlled active preset key (drives button highlight)
 *   customDateFrom     — ISO string; used as initial draft value for custom inputs
 *   customDateTo       — ISO string; used as initial draft value for custom inputs
 *   onDateRangeChange  — (dateFrom, dateTo, rangeKey) → void
 *                        fires immediately for presets; fires on "Apply" for custom
 */
export default function TimeFilter({
  selectedRange,
  customDateFrom,
  customDateTo,
  onDateRangeChange,
}) {
  // Draft state for the custom date inputs (independent of preset selection)
  const defaultFrom = customDateFrom || computeRange('lastMonth').from;
  const defaultTo   = customDateTo   || toIso(new Date());

  const [draftFrom, setDraftFrom] = useState(defaultFrom);
  const [draftTo,   setDraftTo]   = useState(defaultTo);
  const [draftError, setDraftError] = useState('');

  const todayStr = toIso(new Date());
  const isCustom = selectedRange === 'custom';

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handlePreset = (key) => {
    if (key === 'custom') {
      // Switch to custom mode — fire with current draft so parent updates its key
      onDateRangeChange?.(draftFrom, draftTo, 'custom');
      return;
    }
    const range = computeRange(key);
    if (range) onDateRangeChange?.(range.from, range.to, key);
  };

  const handleApply = () => {
    if (!draftFrom || !draftTo) {
      setDraftError('Please select both a start and end date.');
      return;
    }
    if (draftFrom > draftTo) {
      setDraftError('"From" date must not be after "To" date.');
      return;
    }
    setDraftError('');
    onDateRangeChange?.(draftFrom, draftTo, 'custom');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
        <CalendarRange className="w-4 h-4 text-cyan-400" />
        Time Range
      </div>

      {/* ── Desktop: horizontal button row ── */}
      <div className="hidden sm:flex flex-wrap gap-2" role="group" aria-label="Date range presets">
        {PRESETS.map((p) => {
          const isActive = selectedRange === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePreset(p.key)}
              aria-pressed={isActive}
              className={[
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-900 text-gray-300 hover:bg-gray-700 hover:text-white',
              ].join(' ')}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ── Mobile: select dropdown ── */}
      <div className="sm:hidden relative">
        <select
          value={selectedRange}
          onChange={(e) => handlePreset(e.target.value)}
          aria-label="Select date range"
          className="w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2.5 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          aria-hidden
        />
      </div>

      {/* ── Custom date range inputs (shown when "Custom Range" is active) ── */}
      {isCustom && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm text-gray-300">
              From
              <input
                type="date"
                value={draftFrom}
                max={draftTo || todayStr}
                onChange={(e) => { setDraftFrom(e.target.value); setDraftError(''); }}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="text-sm text-gray-300">
              To
              <input
                type="date"
                value={draftTo}
                min={draftFrom}
                max={todayStr}
                onChange={(e) => { setDraftTo(e.target.value); setDraftError(''); }}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          {draftError && (
            <p className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {draftError}
            </p>
          )}

          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 active:scale-95 transition-all"
          >
            Apply Range
          </button>
        </div>
      )}
    </div>
  );
}

TimeFilter.propTypes = {
  selectedRange: PropTypes.oneOf([
    'lastMonth', 'last3Months', 'last6Months', 'ytd', 'custom',
  ]).isRequired,
  /** ISO date string (YYYY-MM-DD) used to seed the custom "From" input. */
  customDateFrom: PropTypes.string,
  /** ISO date string (YYYY-MM-DD) used to seed the custom "To" input. */
  customDateTo: PropTypes.string,
  /** Called with (dateFrom, dateTo, rangeKey) whenever the effective range changes. */
  onDateRangeChange: PropTypes.func.isRequired,
};
