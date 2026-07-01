import { useState } from 'react';
import { ArrowLeft, Pencil, Trash2, RefreshCw, TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useMockPortfolio } from '../services/mockPortfolioData';

function fmt(n) { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n ?? 0); }
function fmtDec(n, d = 2) { return n != null ? n.toFixed(d) : '—'; }

const TYPE_LABELS = {
  STOCK:'Stock', MF:'Mutual Fund', ETF:'ETF', REIT:'REIT',
  GOLD:'Gold', SILVER:'Silver', REAL_ESTATE:'Real Estate',
  BOND:'Bond', FD:'Fixed Deposit', OTHER:'Other',
};
const TYPE_COLORS = {
  STOCK:'bg-blue-900/60 text-blue-300', MF:'bg-purple-900/60 text-purple-300',
  ETF:'bg-cyan-900/60 text-cyan-300', REIT:'bg-orange-900/60 text-orange-300',
  GOLD:'bg-yellow-900/60 text-yellow-300', SILVER:'bg-gray-700 text-gray-300',
  REAL_ESTATE:'bg-emerald-900/60 text-emerald-300', BOND:'bg-rose-900/60 text-rose-300',
  FD:'bg-teal-900/60 text-teal-300', OTHER:'bg-gray-700 text-gray-300',
};

function MetricCard({ label, value, sub, highlight }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight || 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function PriceUpdateModal({ assetId, onClose, onSuccess }) {
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!price || isNaN(price) || Number(price) <= 0) { setError('Enter a valid price > 0.'); return; }
    setLoading(true);
    setError('');
    try {
      // TODO: replace with portfolioApi.updatePrice(assetId, { current_price: price, price_date: date, notes })
      await new Promise((r) => setTimeout(r, 500)); // mock delay
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update price.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <h3 className="text-white font-semibold mb-4">Update Current Price</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Current Price (₹) *</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price" min="0.01" step="0.01"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().split('T')[0]}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Property agent valuation"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50">
              {loading ? 'Saving…' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * AssetDetailPage
 *
 * Props:
 *   assetId   — string
 *   onBack    — () => void
 */
export default function AssetDetailPage({ assetId, onBack }) {
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState('');

  // Use mock data — replace with API call in production
  const { assets, performance } = useMockPortfolio();
  const asset = assets?.find((a) => a.asset_id === assetId) || assets?.[0];

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <AlertCircle className="w-10 h-10 mb-3" />
        <p>Asset not found.</p>
        <button type="button" onClick={onBack} className="mt-4 text-blue-400 hover:underline text-sm">← Back to portfolio</button>
      </div>
    );
  }

  const gainLoss = asset.gain_loss ?? 0;
  const roi = asset.roi_percent ?? 0;
  const isGain = gainLoss >= 0;
  const typeLabel = TYPE_LABELS[asset.asset_type] || asset.asset_type;

  // Mock price history for chart
  const priceHistory = performance?.dates?.map((d, i) => ({
    date: new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    price: (asset.purchase_price || 100) * (1 + (i * 0.02) + (Math.sin(i) * 0.05)),
    invested: asset.purchase_price,
  })) || [];

  return (
    <div className="space-y-5">
      {/* Back nav */}
      <button type="button" onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Portfolio
      </button>

      {/* Header */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[asset.asset_type] || 'bg-gray-700 text-gray-300'}`}>
              {typeLabel}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{asset.asset_name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Purchased on {asset.purchase_date || '—'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setShowPriceModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Update Price
          </button>
          <button type="button" onClick={() => alert('Edit form — coming soon.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors">
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button type="button" onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gray-700 hover:bg-red-700 text-gray-300 hover:text-white transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Quantity / Units" value={Number(asset.quantity).toLocaleString('en-IN')} />
        <MetricCard label="Purchase Price" value={`₹${fmt(asset.purchase_price)}`} />
        <MetricCard label="Total Invested" value={`₹${fmt(asset.purchase_value)}`} />
        <MetricCard label="Purchase Date" value={asset.purchase_date || '—'} />
        <MetricCard label="Current Price" value={asset.current_price ? `₹${fmt(asset.current_price)}` : '—'} />
        <MetricCard label="Current Value" value={`₹${fmt(asset.current_value)}`} highlight="text-white" />
        <MetricCard
          label="Gain / Loss"
          value={`${isGain ? '+' : ''}₹${fmt(Math.abs(gainLoss))}`}
          highlight={isGain ? 'text-green-400' : 'text-red-400'}
        />
        <MetricCard
          label="ROI"
          value={`${isGain ? '+' : ''}${fmtDec(roi)}%`}
          highlight={isGain ? 'text-green-400' : 'text-red-400'}
        />
      </div>

      {/* Price / Value history chart */}
      {priceHistory.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white">Value History</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={priceHistory} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} width={55} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                labelStyle={{ color: '#9ca3af' }}
                itemStyle={{ color: '#fff' }}
                formatter={(v) => [`₹${fmt(v)}`, '']}
              />
              <ReferenceLine y={asset.purchase_price} stroke="#60a5fa" strokeDasharray="4 3" label={{ value: 'Buy', fill: '#60a5fa', fontSize: 11 }} />
              <Line type="monotone" dataKey="price" stroke="#34d399" strokeWidth={2} dot={false} name="Price" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Events / transactions list */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">Events</h3>
        </div>
        <div className="divide-y divide-gray-700/50">
          {[
            { date: asset.purchase_date, type: 'Buy', qty: asset.quantity, price: asset.purchase_price, source: 'Manual entry' },
          ].map((ev, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300">{ev.type}</span>
                <div>
                  <p className="text-gray-200">{ev.qty} units @ ₹{fmt(ev.price)}</p>
                  <p className="text-xs text-gray-500">{ev.source}</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">{ev.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Notes</h3>
          {!editNotes && (
            <button type="button" onClick={() => { setEditNotes(true); setNotes(asset.notes || ''); }}
              className="text-xs text-blue-400 hover:underline">Edit</button>
          )}
        </div>
        {editNotes ? (
          <div className="space-y-3">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Add notes about this asset…"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm
                placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditNotes(false)}
                className="px-3 py-1.5 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600">Cancel</button>
              <button type="button" onClick={() => setEditNotes(false)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500">Save</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">{asset.notes || 'No notes added yet.'}</p>
        )}
      </div>

      {/* Price update modal */}
      {showPriceModal && (
        <PriceUpdateModal assetId={assetId} onClose={() => setShowPriceModal(false)} onSuccess={() => {}} />
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Delete Asset?</h3>
            <p className="text-sm text-gray-400 mb-5">
              This will soft-delete <strong className="text-white">{asset.asset_name}</strong>. The asset will be hidden from your portfolio. This cannot be undone from the UI.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600">Cancel</button>
              <button type="button" onClick={() => { setShowDeleteConfirm(false); onBack?.(); }}
                className="flex-1 py-2 rounded-lg bg-red-700 text-white text-sm hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
