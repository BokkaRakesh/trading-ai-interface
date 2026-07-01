/**
 * portfolioApi.js — Frontend API client for /api/portfolio/*
 */

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE)
  ? import.meta.env.VITE_API_BASE
  : 'http://localhost:8000';

async function _get(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function _post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function _put(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function _delete(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export const portfolioApi = {
  getSummary: (householdId) => _get('/api/portfolio/summary', { household_id: householdId }),
  getAssets: (householdId, params = {}) => _get('/api/portfolio/assets', { household_id: householdId, ...params }),
  getAsset: (assetId) => _get(`/api/portfolio/assets/${assetId}`),
  updateAsset: (assetId, body) => _put(`/api/portfolio/assets/${assetId}`, body),
  deleteAsset: (assetId) => _delete(`/api/portfolio/assets/${assetId}`),
  updatePrice: (assetId, body) => _post(`/api/portfolio/assets/${assetId}/update-price`, body),
  getPerformance: (householdId, period = '1year') =>
    _get('/api/portfolio/performance', { household_id: householdId, period }),
  getStatements: (householdId) => _get('/api/portfolio/statements', { household_id: householdId }),
};

export default portfolioApi;
