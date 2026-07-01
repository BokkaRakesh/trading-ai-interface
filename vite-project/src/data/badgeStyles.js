/**
 * Shared color maps for CategoryBadge and SourceBadge.
 * Single source of truth — import from here in any component.
 */

/** @type {Record<string, {bg: string, text: string, dot: string}>} */
export const CATEGORY_STYLES = {
  'Family Support': { bg: 'bg-sky-500/20',     text: 'text-sky-300',     dot: '#0ea5e9' },
  'BNPL & Loans':   { bg: 'bg-indigo-500/20',  text: 'text-indigo-300',  dot: '#6366f1' },
  'Investment':     { bg: 'bg-violet-500/20',  text: 'text-violet-300',  dot: '#8b5cf6' },
  'Groceries':      { bg: 'bg-emerald-500/20', text: 'text-emerald-300', dot: '#10b981' },
  'Food & Tea':     { bg: 'bg-orange-500/20',  text: 'text-orange-300',  dot: '#f97316' },
  'Commute':        { bg: 'bg-teal-500/20',    text: 'text-teal-300',    dot: '#14b8a6' },
  'Utilities':      { bg: 'bg-amber-500/20',   text: 'text-amber-300',   dot: '#f59e0b' },
  'Healthcare':     { bg: 'bg-red-500/20',     text: 'text-red-300',     dot: '#ef4444' },
  'Shopping':       { bg: 'bg-pink-500/20',    text: 'text-pink-300',    dot: '#ec4899' },
  'Entertainment':  { bg: 'bg-green-500/20',   text: 'text-green-300',   dot: '#22c55e' },
  'Travel':         { bg: 'bg-cyan-500/20',    text: 'text-cyan-300',    dot: '#06b6d4' },
};

/** Fallback when a category has no entry in CATEGORY_STYLES */
export const DEFAULT_CATEGORY_STYLE = {
  bg: 'bg-gray-500/20', text: 'text-gray-300', dot: '#9ca3af',
};

/** @type {Record<string, {bg: string, text: string}>} */
export const SOURCE_STYLES = {
  'GPay':              { bg: 'bg-blue-500/20',   text: 'text-blue-200'   },
  'PhonePe':           { bg: 'bg-purple-500/20', text: 'text-purple-200' },
  'UPI':               { bg: 'bg-indigo-500/20', text: 'text-indigo-200' },
  'ICICI Credit Card': { bg: 'bg-orange-500/20', text: 'text-orange-200' },
  'HDFC Credit Card':  { bg: 'bg-red-500/20',    text: 'text-red-200'    },
  'Axis Debit Card':   { bg: 'bg-yellow-500/20', text: 'text-yellow-200' },
  'NetBanking':        { bg: 'bg-teal-500/20',   text: 'text-teal-200'   },
  'NACH':              { bg: 'bg-gray-500/20',   text: 'text-gray-300'   },
};

/** Fallback when a source has no entry in SOURCE_STYLES */
export const DEFAULT_SOURCE_STYLE = {
  bg: 'bg-gray-500/20', text: 'text-gray-300',
};

/** All category names in display order. */
export const CATEGORY_NAMES = Object.keys(CATEGORY_STYLES);

/** Dot colour for use in charts (Recharts palette-aligned). */
export const CATEGORY_DOT_COLORS = Object.fromEntries(
  Object.entries(CATEGORY_STYLES).map(([k, v]) => [k, v.dot]),
);
