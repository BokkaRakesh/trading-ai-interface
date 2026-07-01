import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

const SORT_KEYS = ['label', 'count', 'invested', 'current_value', 'gain_loss', 'roi_percent'];

export default function AllocationTable({ breakdown, assets = [], onAssetClick }) {
  const [sortKey, setSortKey] = useState('current_value');
  const [sortAsc, setSortAsc] = useState(false);
  const [expanded, setExpanded] = useState(null);

  function toggleSort(key) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  const sorted = [...(breakdown || [])].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return sortAsc ? cmp : -cmp;
  });

  function SortIcon({ k }) {
    if (sortKey !== k) return <span className="text-gray-600 ml-1">⇅</span>;
    return <span className="text-blue-400 ml-1">{sortAsc ? '↑' : '↓'}</span>;
  }

  function th(label, key) {
    return (
      <th
        className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white select-none whitespace-nowrap"
        onClick={() => toggleSort(key)}
      >
        {label}<SortIcon k={key} />
      </th>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">Allocation by Asset Class</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="w-8 px-3 py-2" />
              {th('Asset Class', 'label')}
              {th('Count', 'count')}
              {th('Invested', 'invested')}
              {th('Current Value', 'current_value')}
              {th('Gain / Loss', 'gain_loss')}
              {th('ROI %', 'roi_percent')}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {sorted.map((row) => {
              const isGain = row.gain_loss >= 0;
              const isExpanded = expanded === row.asset_type;
              const rowAssets = assets.filter((a) => a.asset_type === row.asset_type);
              return (
                <>
                  <tr
                    key={row.asset_type}
                    className="hover:bg-gray-700/30 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : row.asset_type)}
                  >
                    <td className="px-3 py-3 text-gray-400">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </td>
                    <td className="px-3 py-3 font-medium text-white">{row.label}</td>
                    <td className="px-3 py-3 text-gray-300">{row.count}</td>
                    <td className="px-3 py-3 text-gray-300">₹{fmt(row.invested)}</td>
                    <td className="px-3 py-3 text-white font-medium">₹{fmt(row.current_value)}</td>
                    <td className={`px-3 py-3 font-medium ${isGain ? 'text-green-400' : 'text-red-400'}`}>
                      {isGain ? '+' : ''}₹{fmt(Math.abs(row.gain_loss))}
                    </td>
                    <td className={`px-3 py-3 font-medium ${isGain ? 'text-green-400' : 'text-red-400'}`}>
                      {isGain ? '+' : ''}{row.roi_percent.toFixed(2)}%
                    </td>
                  </tr>
                  {isExpanded && rowAssets.map((a) => {
                    const ag = (a.gain_loss ?? 0) >= 0;
                    return (
                      <tr
                        key={a.asset_id}
                        className="bg-gray-900/40 hover:bg-gray-700/20 cursor-pointer"
                        onClick={() => onAssetClick?.(a.asset_id)}
                      >
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2 pl-6 text-gray-300 text-xs">{a.asset_name}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{Number(a.quantity).toLocaleString()}</td>
                        <td className="px-3 py-2 text-gray-400 text-xs">₹{fmt(a.purchase_value)}</td>
                        <td className="px-3 py-2 text-gray-200 text-xs">₹{fmt(a.current_value)}</td>
                        <td className={`px-3 py-2 text-xs ${ag ? 'text-green-400' : 'text-red-400'}`}>
                          {ag ? '+' : ''}₹{fmt(Math.abs(a.gain_loss ?? 0))}
                        </td>
                        <td className={`px-3 py-2 text-xs ${ag ? 'text-green-400' : 'text-red-400'}`}>
                          {ag ? '+' : ''}{(a.roi_percent ?? 0).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
