import { useState } from 'react';
import { Users, User, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

function fmt(n) { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n ?? 0); }

const MEMBER_COLORS = ['#60a5fa', '#34d399', '#f59e0b', '#a78bfa', '#fb7185'];
const PIE_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#06b6d4'];

const TYPE_LABELS = {
  STOCK:'Stock', MF:'Mutual Fund', ETF:'ETF', REIT:'REIT',
  GOLD:'Gold', SILVER:'Silver', REAL_ESTATE:'Real Estate',
  BOND:'Bond', FD:'FD', OTHER:'Other',
};

// ---------- Mock household data ----------
const MOCK_HOUSEHOLD = {
  id: 'household_rakesh',
  name: 'Bokka Family',
  members: [
    {
      member_id: 'mem_1',
      name: 'Rakesh',
      relation: 'Primary',
      total_invested: 2850000,
      total_current_value: 3480000,
      gain_loss: 630000,
      roi_percent: 22.1,
      allocation: [
        { label: 'Stock', asset_type: 'STOCK', value: 1600000, pct: 46 },
        { label: 'Mutual Fund', asset_type: 'MF', value: 900000, pct: 26 },
        { label: 'Gold', asset_type: 'GOLD', value: 480000, pct: 14 },
        { label: 'Bond', asset_type: 'BOND', value: 300000, pct: 9 },
        { label: 'FD', asset_type: 'FD', value: 200000, pct: 6 },
      ],
      top_assets: [
        { name: 'HDFC Bank', type: 'STOCK', value: 680000, roi: 24.5 },
        { name: 'Parag Parikh Flexi Cap', type: 'MF', value: 490000, roi: 31.2 },
        { name: 'Gold 22K', type: 'GOLD', value: 480000, roi: 18.0 },
      ],
    },
    {
      member_id: 'mem_2',
      name: 'Priya',
      relation: 'Spouse',
      total_invested: 1420000,
      total_current_value: 1720000,
      gain_loss: 300000,
      roi_percent: 21.1,
      allocation: [
        { label: 'Mutual Fund', asset_type: 'MF', value: 720000, pct: 42 },
        { label: 'FD', asset_type: 'FD', value: 600000, pct: 35 },
        { label: 'Gold', asset_type: 'GOLD', value: 250000, pct: 15 },
        { label: 'Stock', asset_type: 'STOCK', value: 150000, pct: 9 },
      ],
      top_assets: [
        { name: 'UTI Nifty 50', type: 'MF', value: 420000, roi: 19.8 },
        { name: 'SBI FD', type: 'FD', value: 300000, roi: 7.1 },
        { name: 'Gold ETF', type: 'GOLD', value: 250000, roi: 18.0 },
      ],
    },
  ],
};

function MiniPie({ data }) {
  return (
    <ResponsiveContainer width="100%" height={130}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={32} outerRadius={52}
          dataKey="value" paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
          formatter={(v, n) => [`₹${fmt(v)}`, n]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function MemberCard({ member, color, expanded, onToggle }) {
  const isGain = member.gain_loss >= 0;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Card header */}
      <button type="button"
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: color }}>
            {member.name[0]}
          </div>
          <div className="text-left">
            <p className="text-white font-semibold">{member.name}</p>
            <p className="text-xs text-gray-400">{member.relation}</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div>
            <p className="text-xs text-gray-400">Portfolio</p>
            <p className="text-white font-bold">₹{fmt(member.total_current_value)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">ROI</p>
            <p className={`font-bold ${isGain ? 'text-green-400' : 'text-red-400'}`}>
              {isGain ? '+' : ''}{member.roi_percent.toFixed(1)}%
            </p>
          </div>
          <div className="text-gray-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-700 px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Metrics */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Key Metrics</h4>
            {[
              { label: 'Invested', value: `₹${fmt(member.total_invested)}`, color: 'text-white' },
              { label: 'Current Value', value: `₹${fmt(member.total_current_value)}`, color: 'text-white' },
              { label: 'Gain / Loss', value: `${isGain?'+':''}₹${fmt(Math.abs(member.gain_loss))}`, color: isGain?'text-green-400':'text-red-400' },
              { label: 'ROI', value: `${isGain?'+':''}${member.roi_percent.toFixed(2)}%`, color: isGain?'text-green-400':'text-red-400' },
            ].map((m) => (
              <div key={m.label} className="flex justify-between items-center">
                <span className="text-sm text-gray-400">{m.label}</span>
                <span className={`text-sm font-semibold ${m.color}`}>{m.value}</span>
              </div>
            ))}
          </div>

          {/* Allocation pie */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Allocation</h4>
            <MiniPie data={member.allocation.map((a) => ({ name: a.label, value: a.value }))} />
          </div>

          {/* Top assets */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Top Holdings</h4>
            <div className="space-y-2">
              {member.top_assets.map((a) => (
                <div key={a.name} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-200">{a.name}</p>
                    <p className="text-xs text-gray-500">{TYPE_LABELS[a.type]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white font-medium">₹{fmt(a.value)}</p>
                    <p className={`text-xs ${a.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {a.roi >= 0 ? '+' : ''}{a.roi.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConsolidatedTable({ members }) {
  const allAssets = members.flatMap((m) =>
    m.top_assets.map((a) => ({ ...a, owner: m.name }))
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-900/50">
          <tr>
            {['Asset', 'Type', 'Owner', 'Value', 'ROI'].map((h) => (
              <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {allAssets.map((a, i) => (
            <tr key={i} className="hover:bg-gray-700/20">
              <td className="px-4 py-3 text-white font-medium">{a.name}</td>
              <td className="px-4 py-3 text-gray-400">{TYPE_LABELS[a.type]}</td>
              <td className="px-4 py-3 text-gray-400">{a.owner}</td>
              <td className="px-4 py-3 text-white">₹{fmt(a.value)}</td>
              <td className={`px-4 py-3 font-medium ${a.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {a.roi >= 0 ? '+' : ''}{a.roi.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * HouseholdPortfolioView
 *
 * Props:
 *   householdId  — string  (used for API calls, defaults to mock)
 */
export default function HouseholdPortfolioView({ householdId }) {
  const [view, setView] = useState('individual'); // 'individual' | 'consolidated'
  const [expandedMember, setExpandedMember] = useState(MOCK_HOUSEHOLD.members[0]?.member_id);

  const household = MOCK_HOUSEHOLD; // TODO: replace with API call using householdId
  const combined = household.members.reduce(
    (acc, m) => ({
      invested: acc.invested + m.total_invested,
      value: acc.value + m.total_current_value,
      gain: acc.gain + m.gain_loss,
    }),
    { invested: 0, value: 0, gain: 0 }
  );
  const combinedRoi = combined.invested > 0 ? (combined.gain / combined.invested) * 100 : 0;
  const isGain = combined.gain >= 0;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">{household.name}</h2>
          <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 px-2.5 py-0.5 rounded-full">
            {household.members.length} members
          </span>
        </div>
        {/* View toggle */}
        <div className="flex border border-gray-700 rounded-lg overflow-hidden">
          {[['individual', 'Per Member'], ['consolidated', 'Consolidated']].map(([v, label]) => (
            <button key={v} type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm transition-colors ${view === v ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Household total card */}
      <div className="bg-gradient-to-br from-blue-950 to-gray-900 border border-blue-900/50 rounded-2xl p-5">
        <p className="text-sm text-blue-300 mb-1">Combined Household Net Worth</p>
        <p className="text-3xl font-bold text-white mb-3">₹{fmt(combined.value)}</p>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-gray-400">Total Invested</p>
            <p className="text-white font-semibold">₹{fmt(combined.invested)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Gain / Loss</p>
            <p className={`font-semibold ${isGain ? 'text-green-400' : 'text-red-400'}`}>
              {isGain ? '+' : ''}₹{fmt(Math.abs(combined.gain))}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Overall ROI</p>
            <p className={`font-semibold ${isGain ? 'text-green-400' : 'text-red-400'}`}>
              {isGain ? '+' : ''}{combinedRoi.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Member contribution bar */}
        <div className="mt-4">
          <p className="text-xs text-gray-400 mb-1.5">Contribution by member</p>
          <div className="flex h-2 rounded-full overflow-hidden">
            {household.members.map((m, i) => (
              <div key={m.member_id} title={`${m.name}: ₹${fmt(m.total_current_value)}`}
                style={{ width: `${(m.total_current_value / combined.value * 100).toFixed(1)}%`, backgroundColor: MEMBER_COLORS[i] }} />
            ))}
          </div>
          <div className="flex gap-4 mt-1.5">
            {household.members.map((m, i) => (
              <span key={m.member_id} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: MEMBER_COLORS[i] }} />
                {m.name} ({(m.total_current_value / combined.value * 100).toFixed(1)}%)
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Individual / Consolidated view */}
      {view === 'individual' ? (
        <div className="space-y-3">
          {household.members.map((m, i) => (
            <MemberCard
              key={m.member_id}
              member={m}
              color={MEMBER_COLORS[i]}
              expanded={expandedMember === m.member_id}
              onToggle={() => setExpandedMember(expandedMember === m.member_id ? null : m.member_id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white">All Holdings</h3>
          </div>
          <ConsolidatedTable members={household.members} />
        </div>
      )}
    </div>
  );
}
