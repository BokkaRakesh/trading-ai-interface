/**
 * Shared helpers for all AssetForm components.
 *
 * Usage:
 *   import { Field, Select, Checkbox, FormSection, useAssetForm } from './formHelpers';
 */

import { useState } from 'react';

// ── formatINR ────────────────────────────────────────────────────────────────
export function formatINR(n) {
  if (!n && n !== 0) return '';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

// ── useAssetForm ─────────────────────────────────────────────────────────────
/**
 * Generic form state + submit handler.
 * @param {object} initialValues
 * @param {(values: object) => void|Promise<void>} onSubmit
 */
export function useAssetForm(initialValues, onSubmit) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  function set(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validate(rules) {
    const newErrors = {};
    for (const [field, rule] of Object.entries(rules)) {
      const msg = rule(values[field], values);
      if (msg) newErrors[field] = msg;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function submit(rules) {
    if (!validate(rules)) return;
    setLoading(true);
    setApiError('');
    setSuccess(false);
    try {
      await onSubmit(values);
      setSuccess(true);
    } catch (err) {
      setApiError(err?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return { values, errors, loading, success, apiError, set, submit };
}

// ── API call ─────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export async function createAsset(householdId, assetType, commonFields, assetDetails) {
  const res = await fetch(`${API_BASE}/api/portfolio/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      household_id: householdId,
      asset_type: assetType,
      ...commonFields,
      asset_details: assetDetails,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Shared validation rules ───────────────────────────────────────────────────
export const rules = {
  required: (label) => (v) => (!v && v !== 0 ? `${label} is required.` : ''),
  positiveNumber: (label) => (v) =>
    !v || isNaN(v) || Number(v) <= 0 ? `${label} must be a positive number.` : '',
  nonNegative: (label) => (v) =>
    v === '' || v === undefined || v === null
      ? `${label} is required.`
      : isNaN(v) || Number(v) < 0
      ? `${label} must be 0 or greater.`
      : '',
  notFuture: (label) => (v) => {
    if (!v) return `${label} is required.`;
    if (new Date(v) > new Date()) return `${label} cannot be in the future.`;
    return '';
  },
  afterDate: (label, otherField, otherLabel) => (v, all) => {
    if (!v) return `${label} is required.`;
    if (all[otherField] && new Date(v) < new Date(all[otherField]))
      return `${label} must be after ${otherLabel}.`;
    return '';
  },
  range: (label, min, max) => (v) =>
    !v || isNaN(v) || Number(v) < min || Number(v) > max
      ? `${label} must be between ${min} and ${max}.`
      : '',
};

// ── UI primitives ─────────────────────────────────────────────────────────────

export function Field({ label, error, required, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

export function Input({ value, onChange, type = 'text', placeholder, className = '', ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white
        text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500
        focus:border-transparent ${className}`}
      {...rest}
    />
  );
}

export function Select({ value, onChange, options, placeholder, className = '' }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white
        text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) =>
        typeof opt === 'string' ? (
          <option key={opt} value={opt}>{opt}</option>
        ) : (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        )
      )}
    </select>
  );
}

export function Checkbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-blue-500"
      />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export function FormSection({ title, children }) {
  return (
    <div className="space-y-4">
      {title && (
        <div className="border-b border-gray-700 pb-2">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

export function TotalCost({ quantity, price, label = 'Estimated total cost' }) {
  const qty = parseFloat(quantity) || 0;
  const px = parseFloat(price) || 0;
  const total = qty * px;
  if (!total) return null;
  return (
    <div className="bg-gray-900/60 rounded-lg px-3 py-2 text-sm text-gray-400">
      {label}:{' '}
      <span className="text-white font-medium">₹{formatINR(total)}</span>
    </div>
  );
}

export function SubmitRow({ loading, success, apiError, label = 'Add Asset', onReset }) {
  return (
    <div className="space-y-3 pt-2">
      {apiError && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
          {apiError}
        </div>
      )}
      {success && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg px-3 py-2 text-sm text-green-300 flex items-center justify-between">
          Asset added successfully!
          {onReset && (
            <button type="button" onClick={onReset} className="underline text-green-400 text-xs">
              Add another
            </button>
          )}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
          text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
      >
        {loading ? 'Saving…' : label}
      </button>
    </div>
  );
}
