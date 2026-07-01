import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, ExternalLink, Pencil, Trash2 } from 'lucide-react';

const ALL_TYPES = ['All', 'STOCK', 'MF', 'ETF', 'REIT', 'GOLD', 'SILVER', 'REAL_ESTATE', 'BOND', 'FD', 'OTHER'];
const TYPE_LABELS = {
  STOCK:'Stock', MF:'MF', ETF:'ETF', REIT:'REIT', GOLD:'Gold', SILVER:'Silver',
  REAL_ESTATE:'Real Estate', BOND:'Bond', FD:'FD', OTHER:'Other',
};
const TYPE_COLORS = {
  STOCK:'bg-blue-900/50 text-blue-300', MF:'bg-purple-900/50 text-purple-300',
  ETF:'bg-cyan-900/50 text-cyan-300', REIT:'bg-orange-900/50 text-orange-300',
  GOLD:'bg-yellow-900/50 text-yellow-300', SILVER:'bg-gray-700 text-gray-300',
  REAL_ESTATE:'bg-emerald-900/50 text-emerald-300', BOND:'bg-rose-900/50 text-rose-300',
  FD:'bg-teal-900/50 text-teal-300', OTHER:'bg-gray-700 text-gray-300',
};
const PAGE_SIZE = 20;

function fmt(n) { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n ?? 0); }

export default function AssetList({ assets = [], onAssetClick, onDelete }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortKey, setSortKey] = useState('current_value');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = assets;
    if (typeFilter !== 'All') list = list.filter((a) => a.asset_type === typeFilter);
    if (query.trim()) list = list.filter((a) => a.asset_name.toLowerCase().includes(query.toLowerCase()));
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [assets, typeFilter, query, sortKey, sortAsc]);

  const total = filtered.length;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
    setPage(1);
  }

  function SortIcon({ k }) {
    if (sortKey !== k) return <span className="text-gray-600 ml-0.5">⇅</span>;
    return <span className="text-blue-400 ml-0.5">{sortAsc ? '↑' : '↓'}</span>;
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
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-gray-700 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search assets…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white
              placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white
            focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>{t === 'All' ? 'All Asset Types' : TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/50">
            <tr>
              {th('Asset Name', 'asset_name')}
              <th className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider">Type</th>
              {th('Qty / Units', 'quantity')}
              {th('Buy Price', 'purchase_price')}
              {th('Current Value', 'current_value')}
              {th('Gain / Loss', 'gain_loss')}
              {th('ROI %', 'roi_percent')}
              <th className="px-3 py-2 text-xs text-gray-400 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                  No assets found.
                </td>
              </tr>
            ) : pageData.map((a) => {
              const isGain = (a.gain_loss ?? 0) >= 0;
              return (
                <tr key={a.asset_id} className="hover:bg-gray-700/30">
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onAssetClick?.(a.asset_id)}
                      className="text-white font-medium hover:text-blue-300 text-left"
                    >
                      {a.asset_name}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[a.asset_type] || 'bg-gray-700 text-gray-300'}`}>
                      {TYPE_LABELS[a.asset_type] || a.asset_type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-300">{Number(a.quantity).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-gray-300">₹{fmt(a.purchase_price)}</td>
                  <td className="px-3 py-3 text-white font-medium">₹{fmt(a.current_value)}</td>
                  <td className={`px-3 py-3 font-medium ${isGain ? 'text-green-400' : 'text-red-400'}`}>
                    {isGain ? '+' : ''}₹{fmt(Math.abs(a.gain_loss ?? 0))}
                  </td>
                  <td className={`px-3 py-3 font-medium ${isGain ? 'text-green-400' : 'text-red-400'}`}>
                    {isGain ? '+' : ''}{(a.roi_percent ?? 0).toFixed(2)}%
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onAssetClick?.(a.asset_id)}
                        title="View details"
                        className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-gray-700"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete?.(a.asset_id)}
                        title="Delete"
                        className="p-1 text-gray-500 hover:text-red-400 rounded-md hover:bg-gray-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 text-xs rounded-md bg-gray-700 text-white disabled:opacity-40 hover:bg-gray-600"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`px-2 py-1 text-xs rounded-md ${p === page ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={page === pageCount}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 text-xs rounded-md bg-gray-700 text-white disabled:opacity-40 hover:bg-gray-600"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
