import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, LoaderCircle, Tag, X } from 'lucide-react';

// ── Formatters ────────────────────────────────────────────────────────────────

const inrFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function fmtDate(iso) {
  try {
    return dateFmt.format(new Date(`${iso}T00:00:00`));
  } catch {
    return iso ?? '—';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * EditModal — edit a transaction's category and/or description.
 *
 * Props:
 *   isOpen      — controls visibility; component returns null when false
 *   transaction — transaction object to edit
 *   categories  — array of category name strings for the dropdown
 *   onSave      — ({ category, description }) → void | Promise<void>
 *   onCancel    — () → void; closes the modal
 *   loading     — disables Save button and shows spinner while parent is saving
 */
export default function EditModal({
  isOpen,
  transaction,
  categories,
  onSave,
  onCancel,
  loading,
}) {
  const [category, setCategory]       = useState('');
  const [description, setDescription] = useState('');
  const [error, setError]             = useState('');

  const categoryRef   = useRef(null);
  const overlayRef    = useRef(null);

  // Reset form whenever the modal opens with a new transaction
  useEffect(() => {
    if (isOpen && transaction) {
      setCategory(transaction.category ?? (categories[0] ?? ''));
      setDescription(transaction.description ?? '');
      setError('');
      // Focus the category dropdown after paint
      requestAnimationFrame(() => categoryRef.current?.focus());
    }
  }, [isOpen, transaction, categories]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, loading, onCancel]);

  if (!isOpen || !transaction) return null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!category) {
      setError('Please select a category.');
      return;
    }
    setError('');
    try {
      await onSave({ category, description });
    } catch (err) {
      setError(err?.message || 'Save failed. Please try again.');
    }
  };

  const handleOverlayClick = (e) => {
    if (!loading && e.target === overlayRef.current) onCancel();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />

      {/* Card */}
      <div className="relative z-10 bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-5">
          <h3
            id="edit-modal-title"
            className="text-base font-semibold text-white"
          >
            Edit Transaction
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Transaction preview (read-only) ── */}
        <div className="rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 mb-5">
          <div className="flex items-start justify-between gap-3">
            {/* Left: Payee + Date */}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-100 truncate">
                {transaction.payee}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {fmtDate(transaction.date)}
              </p>
            </div>
            {/* Right: Amount */}
            <p className="text-base font-bold text-red-400 whitespace-nowrap flex-shrink-0">
              {inrFmt.format(transaction.amount)}
            </p>
          </div>

          {/* Current category — read-only badge */}
          <div className="mt-2.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-400">Current category:</span>
            <span className="text-xs text-gray-200 font-medium">
              {transaction.category ?? '—'}
            </span>
          </div>
        </div>

        {/* ── Form fields ── */}
        <div className="space-y-4">

          {/* Category dropdown */}
          <div>
            <label
              htmlFor="edit-category"
              className="block text-sm text-gray-300 mb-1.5"
            >
              Category
            </label>
            <select
              id="edit-category"
              ref={categoryRef}
              value={category}
              onChange={(e) => { setCategory(e.target.value); setError(''); }}
              disabled={loading}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Description input */}
          <div>
            <label
              htmlFor="edit-description"
              className="block text-sm text-gray-300 mb-1.5"
            >
              Description
              <span className="ml-1 text-xs text-gray-500">(optional)</span>
            </label>
            <input
              id="edit-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              placeholder="Add a note…"
              maxLength={200}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
        </div>

        {/* ── Error message ── */}
        {error && (
          <p className="mt-4 flex items-start gap-1.5 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {error}
          </p>
        )}

        {/* ── Footer buttons ── */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gray-700 text-gray-100 text-sm font-medium hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-60 transition-colors active:scale-95"
          >
            {loading && <LoaderCircle className="w-3.5 h-3.5 animate-spin" />}
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

EditModal.propTypes = {
  /** Controls modal visibility. */
  isOpen: PropTypes.bool.isRequired,
  /** The transaction object being edited. */
  transaction: PropTypes.shape({
    date:        PropTypes.string,
    payee:       PropTypes.string.isRequired,
    amount:      PropTypes.number.isRequired,
    category:    PropTypes.string,
    description: PropTypes.string,
  }),
  /** Available category strings for the dropdown. */
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  /** Called with { category, description } when user clicks Save. */
  onSave: PropTypes.func.isRequired,
  /** Called when user clicks Cancel, presses Escape, or clicks the backdrop. */
  onCancel: PropTypes.func.isRequired,
  /** When true, Save button shows a spinner and all inputs are disabled. */
  loading: PropTypes.bool,
};

EditModal.defaultProps = {
  transaction: null,
  loading: false,
};
