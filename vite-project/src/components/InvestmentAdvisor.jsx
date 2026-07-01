import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  AlertTriangle,
  BadgeIndianRupee,
  BarChart2,
  BookOpen,
  ChevronRight,
  CircleDollarSign,
  Flame,
  Lightbulb,
  Scissors,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import expensesClient from '../api/expensesClient';
import {
  analyzeExpenses,
  buildProjection,
  ETF_OPTIONS,
  SIP_OPTIONS,
  STOCK_OPTIONS,
  WHAT_NOT_TO_DO,
} from '../data/expenseAnalysis';

// ── Formatters ────────────────────────────────────────────────────────────────

const inrFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});
const fmt = (v) => inrFmt.format(v || 0);

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

// ── Small sub-components ──────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, children, color = 'text-cyan-400' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
      <h2 className="text-base font-semibold text-white">{children}</h2>
    </div>
  );
}
SectionTitle.propTypes = { icon: PropTypes.elementType.isRequired, children: PropTypes.node.isRequired, color: PropTypes.string };

function Card({ children, className = '' }) {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}
Card.propTypes = { children: PropTypes.node.isRequired, className: PropTypes.string };

function RoleBadge({ role }) {
  const map = {
    essential:  { label: 'Essential',   cls: 'bg-sky-500/20 text-sky-300' },
    investing:  { label: 'Investing',   cls: 'bg-violet-500/20 text-violet-300' },
    debt:       { label: 'Debt ⚠️',      cls: 'bg-red-500/20 text-red-300' },
    reducible:  { label: 'Reducible',   cls: 'bg-amber-500/20 text-amber-300' },
  };
  const { label, cls } = map[role] ?? map.reducible;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>{label}</span>
  );
}
RoleBadge.propTypes = { role: PropTypes.string.isRequired };

// ── Section 1 — Expense Health Check ─────────────────────────────────────────

function ExpenseHealthCheck({ analysis }) {
  const { categories, totalSpent } = analysis;
  const sorted = [...categories].sort((a, b) => b.amount - a.amount);

  return (
    <Card>
      <SectionTitle icon={BarChart2} color="text-cyan-400">Expense Health Check</SectionTitle>
      <div className="space-y-3">
        {sorted.map(({ name, amount, role, reducibleAmount }) => {
          const spendPct = pct(amount, totalSpent);
          const reduPct  = pct(reducibleAmount, amount);
          return (
            <div key={name}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-gray-200 font-medium truncate">{name}</span>
                  <RoleBadge role={role} />
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-semibold text-white">{fmt(amount)}</span>
                  <span className="text-xs text-gray-400 ml-1">({spendPct}%)</span>
                </div>
              </div>
              {/* spend bar */}
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${role === 'debt' ? 'bg-red-500' : role === 'reducible' ? 'bg-amber-500' : role === 'investing' ? 'bg-violet-500' : 'bg-sky-500'}`}
                  style={{ width: `${spendPct}%` }}
                />
              </div>
              {/* reducible sub-bar */}
              {reducibleAmount > 0 && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Scissors className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <span className="text-[11px] text-amber-300">
                    Could save {fmt(reducibleAmount)} ({reduPct}% of this category)
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* summary row */}
      <div className="mt-5 pt-4 border-t border-gray-700 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-[11px] text-gray-400">Total Spent</p>
          <p className="text-base font-bold text-white">{fmt(analysis.totalSpent)}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-gray-400">Essential</p>
          <p className="text-base font-bold text-sky-400">{fmt(analysis.totalEssential)}</p>
        </div>
        <div className="text-center col-span-2 sm:col-span-1">
          <p className="text-[11px] text-gray-400">Could Be Saved</p>
          <p className="text-base font-bold text-amber-400">{fmt(analysis.totalReducible)}/mo</p>
        </div>
      </div>
    </Card>
  );
}
ExpenseHealthCheck.propTypes = { analysis: PropTypes.object.isRequired };

// ── Section 2 — Unnecessary Expense Tips ─────────────────────────────────────

function UnnecessaryExpenses({ analysis }) {
  const { reducible, hasHighInterestDebt, totalDebt } = analysis;
  if (reducible.length === 0 && !hasHighInterestDebt) return null;

  return (
    <Card>
      <SectionTitle icon={Scissors} color="text-amber-400">Where You Can Cut</SectionTitle>
      {hasHighInterestDebt && (
        <div className="mb-4 flex gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">Pay off BNPL / loans first — {fmt(totalDebt)}</p>
            <p className="text-xs text-red-300/80 mt-0.5">
              BNPL and personal loans charge 18–36% interest p.a. No SIP or stock earns that reliably.
              Clearing this debt gives you an instant, guaranteed 18–36% return.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {reducible.map(({ name, amount, reducibleAmount, config }) => (
          <div key={name} className="border border-gray-700 rounded-xl p-3 sm:p-4 bg-gray-900/50">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{config?.icon ?? '💸'}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{config?.label ?? name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{config?.why}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] text-gray-500">Current</p>
                <p className="text-sm font-bold text-white">{fmt(amount)}/mo</p>
                <p className="text-xs text-amber-400 font-semibold mt-0.5">Save {fmt(reducibleAmount)}</p>
              </div>
            </div>
            <ul className="mt-2 space-y-1">
              {config?.how.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-xs text-gray-300">
                  <ChevronRight className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
UnnecessaryExpenses.propTypes = { analysis: PropTypes.object.isRequired };

// ── Section 3 — Investment Recommendations ────────────────────────────────────

function InvestmentRecommendations({ analysis }) {
  const { monthlySavingsPotential, alreadyInvesting, sipSuggestions } = analysis;

  return (
    <Card>
      <SectionTitle icon={TrendingUp} color="text-emerald-400">Where to Invest Your Savings</SectionTitle>

      {alreadyInvesting > 0 && (
        <div className="mb-4 flex gap-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/30">
          <ShieldCheck className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-violet-300">
            You&apos;re already investing <strong>{fmt(alreadyInvesting)}/mo</strong> — great habit.
            These suggestions are for the additional <strong>{fmt(monthlySavingsPotential)}/mo</strong> you could free up.
          </p>
        </div>
      )}

      {/* SIPs */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 mt-1">
        SIP — Mutual Funds (auto-invest monthly)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {sipSuggestions.map(({ fund, monthlyAmount }) => (
          <div key={fund.name} className="border border-gray-700 rounded-xl p-3 bg-gray-900/50">
            <div className="flex items-start justify-between mb-1">
              <span className={`text-[10px] font-semibold ${fund.tagColor}`}>{fund.tag}</span>
              <span className="text-[10px] text-gray-500">{fund.risk} risk</span>
            </div>
            <p className="text-sm font-bold text-white mt-1">{fund.name}</p>
            <p className="text-[11px] text-gray-400">{fund.example}</p>
            <p className="text-xs text-gray-300 mt-2">{fund.why}</p>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500">Suggested SIP</p>
                <p className="text-sm font-bold text-emerald-400">{fmt(monthlyAmount)}/mo</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500">Expected return</p>
                <p className="text-sm font-bold text-cyan-400">~{fund.expectedReturn}% p.a.</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ETFs */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
        ETFs — Buy like stocks on NSE
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {ETF_OPTIONS.map((etf) => (
          <div key={etf.name} className="border border-gray-700 rounded-xl p-3 bg-gray-900/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white">{etf.name}</span>
              <span className={`text-[10px] font-semibold ${etf.tagColor}`}>{etf.tag}</span>
            </div>
            <p className="text-[11px] text-gray-400">{etf.fullName}</p>
            <p className="text-xs text-gray-300 mt-2">{etf.why}</p>
            <p className="text-xs font-semibold text-cyan-400 mt-2">~{etf.expectedReturn}% p.a.</p>
          </div>
        ))}
      </div>

      {/* Stocks */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
        Stocks — Blue-chip buy &amp; hold
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STOCK_OPTIONS.map((s) => (
          <div key={s.symbol} className="border border-gray-700 rounded-xl p-3 bg-gray-900/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white font-mono">{s.symbol}</span>
              <span className={`text-[10px] font-semibold ${s.tagColor}`}>{s.tag}</span>
            </div>
            <p className="text-[11px] text-gray-400">{s.name}</p>
            <p className="text-[11px] text-gray-500">{s.sector}</p>
            <p className="text-xs text-gray-300 mt-1.5">{s.why}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
InvestmentRecommendations.propTypes = { analysis: PropTypes.object.isRequired };

// ── Section 4 — 5-Year Projection ────────────────────────────────────────────

function GrowthProjection({ defaultMonthly }) {
  const [monthly, setMonthly] = useState(defaultMonthly || 2000);
  const [rate, setRate] = useState(12);

  const projection = useMemo(() => buildProjection(monthly, rate), [monthly, rate]);

  const RATE_PRESETS = [
    { label: 'FD ~7%', value: 7 },
    { label: 'ETF ~11%', value: 11 },
    { label: 'SIP ~12%', value: 12 },
    { label: 'Mid-cap ~16%', value: 16 },
  ];

  return (
    <Card>
      <SectionTitle icon={Sparkles} color="text-yellow-400">5-Year Growth Projection</SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {/* Amount slider */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Monthly investment — <span className="text-white font-semibold">{fmt(monthly)}</span>
          </label>
          <input
            type="range" min={500} max={50000} step={500}
            value={monthly}
            onChange={(e) => setMonthly(Number(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
            <span>₹500</span><span>₹50,000</span>
          </div>
        </div>

        {/* Rate presets */}
        <div>
          <p className="text-xs text-gray-400 mb-1">Expected annual return</p>
          <div className="flex flex-wrap gap-2">
            {RATE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setRate(p.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  rate === p.value ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projection table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-2 text-xs font-semibold text-gray-400 uppercase">Duration</th>
              <th className="text-right p-2 text-xs font-semibold text-gray-400 uppercase">You Invest</th>
              <th className="text-right p-2 text-xs font-semibold text-gray-400 uppercase">Final Value</th>
              <th className="text-right p-2 text-xs font-semibold text-gray-400 uppercase">Gains</th>
            </tr>
          </thead>
          <tbody>
            {projection.map(({ years, invested, finalValue, gains }) => (
              <tr key={years} className="border-b border-gray-800 hover:bg-gray-700/30 transition-colors">
                <td className="p-2 font-semibold text-white">{years} {years === 1 ? 'year' : 'years'}</td>
                <td className="p-2 text-right font-mono text-gray-300">{fmt(invested)}</td>
                <td className="p-2 text-right font-mono font-bold text-emerald-400">{fmt(finalValue)}</td>
                <td className="p-2 text-right font-mono text-cyan-400">+{fmt(gains)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-500 mt-3">
        * Projections use compound interest (SIP formula). Past returns are not a guarantee of future performance. Consult a SEBI-registered advisor before investing.
      </p>
    </Card>
  );
}
GrowthProjection.propTypes = { defaultMonthly: PropTypes.number };

// ── Section 5 — What Not to Do ────────────────────────────────────────────────

function WhatNotToDo() {
  return (
    <Card>
      <SectionTitle icon={BookOpen} color="text-red-400">Common Mistakes to Avoid</SectionTitle>
      <ul className="space-y-2.5">
        {WHAT_NOT_TO_DO.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <Flame className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-300">{item.text}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InvestmentAdvisor() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch last 3 months for a meaningful analysis window
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      .toISOString().slice(0, 10);

    expensesClient
      .fetchSummary('household_rakesh', from, to)
      .then((data) => { setSummary(data); setLoading(false); })
      .catch((err) => { setError(err?.message || 'Failed to load expense data.'); setLoading(false); });
  }, []);

  const analysis = useMemo(() => (summary ? analyzeExpenses(summary) : null), [summary]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-gray-800 rounded-2xl border border-gray-700 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <AlertTriangle className="w-10 h-10 mb-3 text-red-400" />
        <p className="text-sm">{error || 'No expense data to analyse yet.'}</p>
        <p className="text-xs mt-1">Upload a bank statement in the Expenses tab to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero savings banner */}
      <div className="bg-gradient-to-r from-cyan-900/40 to-emerald-900/30 border border-cyan-700/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <CircleDollarSign className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Monthly savings potential (last 3 months avg.)</p>
            <p className="text-2xl font-bold text-white">{fmt(analysis.monthlySavingsPotential)}<span className="text-sm font-normal text-gray-400">/month</span></p>
          </div>
        </div>
        <div className="flex gap-3 text-center">
          <div>
            <p className="text-[11px] text-gray-500">Already investing</p>
            <p className="text-sm font-bold text-violet-400">{fmt(analysis.alreadyInvesting)}/mo</p>
          </div>
          <div className="w-px bg-gray-700" />
          <div>
            <p className="text-[11px] text-gray-500">Could become</p>
            <p className="text-sm font-bold text-emerald-400">{fmt(analysis.alreadyInvesting + analysis.monthlySavingsPotential)}/mo</p>
          </div>
        </div>
      </div>

      {/* Info callout */}
      <div className="flex gap-2 p-3 bg-gray-800/60 border border-gray-700 rounded-xl">
        <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-300">
          Analysis based on your last 3 months of spending. &quot;Reducible&quot; amounts are estimates —
          essential categories like Family Support, Groceries, Utilities and Healthcare are never flagged.
        </p>
      </div>

      <ExpenseHealthCheck analysis={analysis} />
      <UnnecessaryExpenses analysis={analysis} />
      <InvestmentRecommendations analysis={analysis} />
      <GrowthProjection defaultMonthly={analysis.monthlySavingsPotential} />
      <WhatNotToDo />

      <div className="flex items-center gap-2 p-3 bg-gray-800/40 border border-gray-700 rounded-xl">
        <BadgeIndianRupee className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <p className="text-[11px] text-gray-500">
          This is educational content only — not SEBI-registered investment advice.
          All projected returns assume historical averages and are not guaranteed.
        </p>
      </div>
    </div>
  );
}
