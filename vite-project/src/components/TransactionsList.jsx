import { Fragment, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  AlertTriangle,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LoaderCircle,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import EditModal from './EditModal';
import CategoryBadge from './CategoryBadge';
import SourceBadge from './SourceBadge';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ── Formatters ────────────────────────────────────────────────────────────────

const inrFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const shortDate = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function fmtDate(iso) {
  try {
    return shortDate.format(new Date(`${iso}T00:00:00`));
  } catch {
    return iso;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3 h-3 text-cyan-400" />
    : <ArrowDown className="w-3 h-3 text-cyan-400" />;
}
SortIcon.propTypes = {
  field: PropTypes.string.isRequired,
  sortField: PropTypes.string.isRequired,
  sortDir: PropTypes.string.isRequired,
};

// ── Quick Review Modal ─────────────────────────────────────────────────────────

function QuickReviewModal({ transaction, categoryOptions, onSave, onClose, saving }) {
  const [category, setCategory] = useState(transaction.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-gray-900 border border-amber-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <h3 className="text-base font-semibold text-amber-300">Needs Review</h3>
          <button type="button" onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          Low confidence for <span className="text-white font-medium">{transaction.payee}</span>.
          Pick the correct category to mark it reviewed.
        </p>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {categoryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose} className="flex-1 px-3 py-2 rounded-lg bg-gray-700 text-gray-100 text-sm font-medium hover:bg-gray-600">
            Skip
          </button>
          <button
            type="button"
            onClick={() => onSave(transaction.id, { category })}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500 text-gray-900 text-sm font-semibold hover:bg-amber-400 disabled:opacity-60"
          >
            {saving && <LoaderCircle className="w-3.5 h-3.5 animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

QuickReviewModal.propTypes = {
  transaction: PropTypes.object.isRequired,
  categoryOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ transaction, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-gray-900 border border-red-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-base font-semibold text-white mb-2">Delete Transaction?</h3>
        <p className="text-sm text-gray-400 mb-5">
          Remove <span className="text-white font-medium">{transaction.payee}</span>{' '}
          ({inrFmt.format(transaction.amount)}) on {fmtDate(transaction.date)}? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 px-3 py-2 rounded-lg bg-gray-700 text-gray-100 text-sm font-medium hover:bg-gray-600">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(transaction.id)}
            className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

DeleteConfirm.propTypes = {
  transaction: PropTypes.object.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`px-4 py-4 flex gap-4 items-center border-b border-gray-700/60 ${i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}`}>
          <div className="h-3.5 w-20 bg-gray-600 rounded" />
          <div className="h-3.5 flex-1 bg-gray-600 rounded" />
          <div className="h-3.5 w-24 bg-gray-600 rounded hidden sm:block" />
          <div className="h-3.5 w-20 bg-gray-600 rounded ml-auto" />
        </div>
      ))}
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPageChange }) {
  const [jumpValue, setJumpValue] = useState('');

  const goTo = (p) => {
    const bounded = Math.max(1, Math.min(totalPages, p));
    onPageChange(bounded);
  };

  const handleJump = (e) => {
    if (e.key === 'Enter') {
      const parsed = parseInt(jumpValue, 10);
      if (!Number.isNaN(parsed)) {
        goTo(parsed);
        setJumpValue('');
      }
    }
  };

  return (
    <div className="px-4 sm:px-5 py-3 border-t border-gray-700 bg-gray-900/60 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => goTo(1)} disabled={page <= 1} title="First page"
          className="p-1.5 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-gray-700 text-gray-100 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-300">
        <span>Page</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={jumpValue}
          placeholder={String(page)}
          onChange={(e) => setJumpValue(e.target.value)}
          onKeyDown={handleJump}
          title="Enter page number and press Enter"
          className="w-14 text-center rounded-lg border border-gray-600 bg-gray-800 text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <span>of <span className="font-medium text-white">{totalPages}</span></span>
      </div>

      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => goTo(page + 1)} disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-gray-700 text-gray-100 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => goTo(totalPages)} disabled={page >= totalPages} title="Last page"
          className="p-1.5 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TransactionsList({
  transactions,
  categoryOptions,
  loading,
  page,
  totalCount,
  onPageChange,
  onEdit,
  onDelete,
  onCategoryReview,
}) {
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Client-side sort (server already pages, we sort within the page)
  const sorted = useMemo(() => {
    const copy = [...transactions];
    copy.sort((a, b) => {
      let av, bv;
      if (sortField === 'date')   { av = a.date;   bv = b.date; }
      else if (sortField === 'amount') { av = a.amount; bv = b.amount; }
      else if (sortField === 'payee')  { av = (a.payee || '').toLowerCase(); bv = (b.payee || '').toLowerCase(); }
      else return 0;

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [transactions, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  // Edit
  const openEdit = (e, tx) => { e.stopPropagation(); setEditTarget(tx); };
  const closeEdit = () => { if (!saving) setEditTarget(null); };
  const handleSaveEdit = async (id, updates) => {
    if (!id) return;
    setSaving(true);
    await onEdit(id, updates);
    setSaving(false);
    setEditTarget(null);
  };

  // Review
  const openReview = (e, tx) => { e.stopPropagation(); setReviewTarget(tx); };
  const closeReview = () => { if (!saving) setReviewTarget(null); };
  const handleSaveReview = async (id, updates) => {
    setSaving(true);
    await onCategoryReview(id, updates);
    setSaving(false);
    setReviewTarget(null);
  };

  // Delete
  const openDelete = (e, tx) => { e.stopPropagation(); setDeleteTarget(tx); };
  const handleConfirmDelete = (id) => {
    onDelete(id);
    setDeleteTarget(null);
  };

  const thClass = 'px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide select-none';
  const sortableThClass = `${thClass} cursor-pointer hover:text-cyan-400 transition-colors`;

  return (
    <>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-5 py-4 border-b border-gray-700 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">Transactions</h2>
          <span className="text-xs text-gray-400">
            {totalCount} total · page {page} of {totalPages}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton />
          ) : sorted.length === 0 ? (
            <div className="px-4 py-20 text-center text-sm text-gray-400">
              No transactions match the current filters.
            </div>
          ) : (
            <table className="w-full text-sm" style={{ minWidth: 640 }}>
              <thead className="bg-gray-900/70">
                <tr>
                  {/* Date — sortable */}
                  <th
                    className={sortableThClass}
                    onClick={() => toggleSort('date')}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Date
                      <SortIcon field="date" sortField={sortField} sortDir={sortDir} />
                    </span>
                  </th>

                  {/* Payee — sortable */}
                  <th
                    className={`${sortableThClass} hidden sm:table-cell`}
                    onClick={() => toggleSort('payee')}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Payee
                      <SortIcon field="payee" sortField={sortField} sortDir={sortDir} />
                    </span>
                  </th>

                  {/* Amount — sortable */}
                  <th
                    className={`${sortableThClass} text-right`}
                    onClick={() => toggleSort('amount')}
                  >
                    <span className="inline-flex items-center justify-end gap-1.5 w-full">
                      Amount
                      <SortIcon field="amount" sortField={sortField} sortDir={sortDir} />
                    </span>
                  </th>

                  {/* Category */}
                  <th className={`${thClass} hidden md:table-cell`}>Category</th>

                  {/* Source */}
                  <th className={`${thClass} hidden lg:table-cell`}>Source</th>

                  {/* Status */}
                  <th className={`${thClass} hidden sm:table-cell`}>Status</th>

                  {/* Actions */}
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {sorted.map((tx, rowIndex) => {
                  const isExpanded = expandedId === tx.id;
                  const isEven = rowIndex % 2 === 0;

                  return (
                    <Fragment key={tx.id}>
                      <tr
                        key={tx.id}
                        onClick={() => toggleExpand(tx.id)}
                        className={`border-t border-gray-700/50 cursor-pointer transition-colors group
                          ${isEven ? 'bg-gray-800' : 'bg-gray-800/50'}
                          hover:bg-gray-700/60`}
                      >
                        {/* Date */}
                        <td className="px-3 sm:px-4 py-3 text-gray-300 whitespace-nowrap text-xs sm:text-sm">
                          <div className="inline-flex items-center gap-1.5">
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                            {fmtDate(tx.date)}
                          </div>
                        </td>

                        {/* Payee — hidden on mobile */}
                        <td className="px-3 sm:px-4 py-3 text-gray-100 font-medium hidden sm:table-cell max-w-[160px] truncate">
                          {tx.payee}
                        </td>

                        {/* Amount */}
                        <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap font-semibold text-red-400">
                          {/* On mobile also show payee here */}
                          <div className="sm:hidden text-left mb-0.5 text-xs text-gray-400 font-normal">{tx.payee}</div>
                          {inrFmt.format(tx.amount)}
                        </td>

                        {/* Category */}
                        <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
                          <CategoryBadge category={tx.category} />
                        </td>

                        {/* Source */}
                        <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
                          <SourceBadge source={tx.source} />
                        </td>

                        {/* Status */}
                        <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                          {tx.needsReview ? (
                            <button
                              type="button"
                              onClick={(e) => openReview(e, tx)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 text-xs font-semibold hover:bg-amber-500/35 transition-colors"
                            >
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span className="hidden sm:inline">Needs Review</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                              <span className="hidden sm:inline">Categorized</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-3 sm:px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              title="Edit transaction"
                              onClick={(e) => openEdit(e, tx)}
                              className="p-1.5 rounded-lg bg-gray-700 text-gray-200 hover:bg-cyan-600/40 hover:text-cyan-300 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Delete transaction"
                              onClick={(e) => openDelete(e, tx)}
                              className="p-1.5 rounded-lg bg-gray-700 text-gray-200 hover:bg-red-600/40 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr key={`${tx.id}-expanded`} className={isEven ? 'bg-gray-800' : 'bg-gray-800/50'}>
                          <td colSpan={7} className="px-5 pb-4 pt-1">
                            <div className="rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3 text-sm space-y-2">
                              <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-gray-400">
                                <span><span className="text-gray-500">Payee: </span><span className="text-gray-200">{tx.payee}</span></span>
                                <span><span className="text-gray-500">Category: </span><CategoryBadge category={tx.category} /></span>
                                <span><span className="text-gray-500">Source: </span><SourceBadge source={tx.source} /></span>
                                <span><span className="text-gray-500">Confidence: </span><span className="text-gray-200">{tx.categorizationConfidence != null ? `${Math.round(tx.categorizationConfidence * 100)}%` : 'N/A'}</span></span>
                              </div>
                              {tx.description && (
                                <p className="text-xs text-gray-300 pt-1 border-t border-gray-700">
                                  <span className="text-gray-500">Note: </span>{tx.description}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && (
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        )}
      </div>

      {/* Modals */}
      <EditModal
        isOpen={Boolean(editTarget)}
        transaction={editTarget}
        categories={categoryOptions}
        onSave={(updates) => handleSaveEdit(editTarget?.id, updates)}
        onCancel={closeEdit}
        loading={saving}
      />

      {reviewTarget && (
        <QuickReviewModal
          transaction={reviewTarget}
          categoryOptions={categoryOptions}
          onSave={handleSaveReview}
          onClose={closeReview}
          saving={saving}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          transaction={deleteTarget}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

TransactionsList.propTypes = {
  transactions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      date: PropTypes.string.isRequired,
      payee: PropTypes.string.isRequired,
      amount: PropTypes.number.isRequired,
      category: PropTypes.string.isRequired,
      source: PropTypes.string.isRequired,
      description: PropTypes.string,
      needsReview: PropTypes.bool,
      categorizationConfidence: PropTypes.number,
    }),
  ).isRequired,
  categoryOptions: PropTypes.arrayOf(PropTypes.string),
  loading: PropTypes.bool,
  page: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onCategoryReview: PropTypes.func.isRequired,
};

TransactionsList.defaultProps = {
  categoryOptions: [],
  loading: false,
};
