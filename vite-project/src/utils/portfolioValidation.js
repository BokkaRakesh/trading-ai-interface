/**
 * portfolioValidation.js
 *
 * Pure-function validation helpers for all asset form types.
 * Returns { isValid: boolean, errors: { fieldName: string } }
 *
 * Usage:
 *   import { validateAsset, warnConcentration } from '../utils/portfolioValidation';
 *   const { isValid, errors } = validateAsset(values, 'STOCK');
 */

// ─── helpers ────────────────────────────────────────────────────────────────

function required(value, label) {
  if (value == null || String(value).trim() === '') return `${label} is required.`;
  return null;
}

function positiveNumber(value, label) {
  const n = Number(value);
  if (value == null || value === '' || isNaN(n) || n <= 0) return `${label} must be a positive number.`;
  return null;
}

function nonNegative(value, label) {
  const n = Number(value);
  if (value == null || value === '' || isNaN(n) || n < 0) return `${label} must be ≥ 0.`;
  return null;
}

function notFuture(dateStr, label) {
  if (!dateStr) return `${label} is required.`;
  if (new Date(dateStr) > new Date()) return `${label} cannot be in the future.`;
  return null;
}

function afterDate(endStr, startStr, endLabel, startLabel) {
  if (!endStr || !startStr) return null; // let required() handle missing
  if (new Date(endStr) <= new Date(startStr)) return `${endLabel} must be after ${startLabel}.`;
  return null;
}

function inSet(value, allowed, label) {
  if (!allowed.includes(value)) return `${label} must be one of: ${allowed.join(', ')}.`;
  return null;
}

// ─── per-type validators ─────────────────────────────────────────────────────

function validateStock(v) {
  const e = {};
  const add = (k, msg) => { if (msg) e[k] = msg; };
  add('asset_name', required(v.asset_name, 'Company Name'));
  add('ticker', required(v.ticker, 'Ticker'));
  add('exchange', required(v.exchange, 'Exchange'));
  add('quantity', positiveNumber(v.quantity, 'Quantity'));
  add('purchase_price', positiveNumber(v.purchase_price, 'Purchase Price'));
  add('purchase_date', notFuture(v.purchase_date, 'Purchase Date'));
  return e;
}

function validateMF(v) {
  const e = {};
  const add = (k, msg) => { if (msg) e[k] = msg; };
  add('asset_name', required(v.asset_name, 'Scheme Name'));
  add('fund_house', required(v.fund_house, 'Fund House'));
  add('quantity', positiveNumber(v.quantity, 'Units'));
  add('purchase_price', positiveNumber(v.purchase_price, 'NAV at Purchase'));
  add('purchase_date', notFuture(v.purchase_date, 'Purchase Date'));
  if (v.sip_active) {
    add('sip_amount', positiveNumber(v.sip_amount, 'SIP Amount'));
  }
  return e;
}

function validateETF(v) {
  const e = {};
  const add = (k, msg) => { if (msg) e[k] = msg; };
  add('asset_name', required(v.asset_name, 'ETF Name'));
  add('ticker', required(v.ticker, 'Ticker'));
  add('quantity', positiveNumber(v.quantity, 'Quantity'));
  add('purchase_price', positiveNumber(v.purchase_price, 'Purchase Price'));
  add('purchase_date', notFuture(v.purchase_date, 'Purchase Date'));
  return e;
}

function validateREIT(v) {
  const e = {};
  const add = (k, msg) => { if (msg) e[k] = msg; };
  add('asset_name', required(v.asset_name, 'REIT Name'));
  add('ticker', required(v.ticker, 'Ticker'));
  add('quantity', positiveNumber(v.quantity, 'Quantity'));
  add('purchase_price', positiveNumber(v.purchase_price, 'Purchase Price'));
  add('purchase_date', notFuture(v.purchase_date, 'Purchase Date'));
  return e;
}

function validateGold(v) {
  const e = {};
  const add = (k, msg) => { if (msg) e[k] = msg; };
  add('asset_name', required(v.asset_name, 'Asset Name'));
  add('gold_form', required(v.gold_form, 'Gold Form'));
  add('purity_karat', required(v.purity_karat, 'Purity'));
  add('weight_grams', positiveNumber(v.weight_grams, 'Weight (grams)'));
  add('price_per_gram', positiveNumber(v.price_per_gram, 'Price per gram'));
  add('purchase_date', notFuture(v.purchase_date, 'Purchase Date'));
  const validKarats = ['24K', '22K', '18K', '14K'];
  if (v.purity_karat && !validKarats.includes(v.purity_karat)) {
    e.purity_karat = `Purity must be one of ${validKarats.join(', ')}.`;
  }
  return e;
}

function validateSilver(v) {
  const e = {};
  const add = (k, msg) => { if (msg) e[k] = msg; };
  add('asset_name', required(v.asset_name, 'Asset Name'));
  add('silver_form', required(v.silver_form, 'Silver Form'));
  add('weight_grams', positiveNumber(v.weight_grams, 'Weight (grams)'));
  add('price_per_gram', positiveNumber(v.price_per_gram, 'Price per gram'));
  add('purchase_date', notFuture(v.purchase_date, 'Purchase Date'));
  const validFineness = ['999', '925', '900', '800'];
  if (v.fineness && !validFineness.includes(v.fineness)) {
    e.fineness = `Fineness must be one of ${validFineness.join(', ')}.`;
  }
  return e;
}

function validateRealEstate(v) {
  const e = {};
  const add = (k, msg) => { if (msg) e[k] = msg; };
  add('asset_name', required(v.asset_name, 'Property Name'));
  add('city', required(v.city, 'City'));
  add('state', required(v.state, 'State'));
  add('property_type', required(v.property_type, 'Property Type'));
  add('purchase_price', positiveNumber(v.purchase_price, 'Purchase Price'));
  add('purchase_date', notFuture(v.purchase_date, 'Purchase Date'));
  if (v.current_value != null && v.current_value !== '') {
    add('current_value', nonNegative(v.current_value, 'Current Value'));
  }
  if (v.is_under_loan) {
    add('loan_outstanding', nonNegative(v.loan_outstanding, 'Loan Outstanding'));
  }
  if (v.is_rented) {
    add('monthly_rent', positiveNumber(v.monthly_rent, 'Monthly Rent'));
  }
  return e;
}

function validateBond(v) {
  const e = {};
  const add = (k, msg) => { if (msg) e[k] = msg; };
  add('asset_name', required(v.asset_name, 'Bond Name'));
  add('issuer_name', required(v.issuer_name, 'Issuer Name'));
  add('face_value', positiveNumber(v.face_value, 'Face Value'));
  add('coupon_rate', positiveNumber(v.coupon_rate, 'Coupon Rate'));
  add('quantity', positiveNumber(v.quantity, 'No. of Bonds'));
  add('purchase_price', positiveNumber(v.purchase_price, 'Price per Bond'));
  add('purchase_date', notFuture(v.purchase_date, 'Purchase Date'));
  add('maturity_date', required(v.maturity_date, 'Maturity Date'));
  if (v.maturity_date) {
    add('maturity_date', afterDate(v.maturity_date, v.purchase_date, 'Maturity Date', 'Purchase Date'));
  }
  if (v.coupon_rate && (Number(v.coupon_rate) < 0 || Number(v.coupon_rate) > 100)) {
    e.coupon_rate = 'Coupon Rate must be between 0 and 100.';
  }
  return e;
}

function validateFD(v) {
  const e = {};
  const add = (k, msg) => { if (msg) e[k] = msg; };
  add('asset_name', required(v.asset_name, 'Institution Name'));
  add('principal_amount', positiveNumber(v.principal_amount, 'Principal Amount'));
  add('interest_rate', positiveNumber(v.interest_rate, 'Interest Rate'));
  add('deposit_date', notFuture(v.deposit_date, 'Opening Date'));
  add('maturity_date', required(v.maturity_date, 'Maturity Date'));
  if (v.maturity_date) {
    add('maturity_date', afterDate(v.maturity_date, v.deposit_date, 'Maturity Date', 'Opening Date'));
  }
  if (v.interest_rate && (Number(v.interest_rate) <= 0 || Number(v.interest_rate) > 50)) {
    e.interest_rate = 'Interest Rate must be between 0.01 and 50%.';
  }
  return e;
}

function validateOther(v) {
  const e = {};
  const add = (k, msg) => { if (msg) e[k] = msg; };
  add('asset_name', required(v.asset_name, 'Asset Name'));
  add('sub_type', required(v.sub_type, 'Sub-type'));
  add('current_value', positiveNumber(v.current_value, 'Current Value'));
  add('purchase_date', notFuture(v.purchase_date, 'Purchase / Opening Date'));
  if (v.sub_type === 'CRYPTO') {
    add('token_symbol', required(v.token_symbol, 'Token Symbol'));
  }
  return e;
}

// ─── public API ─────────────────────────────────────────────────────────────

const VALIDATORS = {
  STOCK: validateStock,
  MF: validateMF,
  ETF: validateETF,
  REIT: validateREIT,
  GOLD: validateGold,
  SILVER: validateSilver,
  REAL_ESTATE: validateRealEstate,
  BOND: validateBond,
  FD: validateFD,
  OTHER: validateOther,
};

/**
 * Validate a single asset form's values.
 * @param {object} values   — form values object
 * @param {string} assetType — e.g. 'STOCK', 'MF', 'FD' …
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateAsset(values, assetType) {
  const validator = VALIDATORS[assetType];
  if (!validator) return { isValid: true, errors: {} };
  const errors = validator(values);
  return { isValid: Object.keys(errors).length === 0, errors };
}

/**
 * Portfolio-level concentration warning.
 * @param {object[]} assets  — array of asset objects with `current_value` and `asset_type`
 * @param {number}   totalValue
 * @returns {{ warnings: string[] }}
 */
export function warnConcentration(assets, totalValue) {
  const warnings = [];
  if (!totalValue || !assets?.length) return { warnings };

  // Single-asset concentration
  assets.forEach((a) => {
    const pct = (a.current_value / totalValue) * 100;
    if (pct > 50) {
      warnings.push(
        `"${a.asset_name}" represents ${pct.toFixed(1)}% of your portfolio — consider diversifying.`
      );
    }
  });

  // Total debt vs total assets
  const debtTypes = ['BOND', 'FD'];
  const debtValue = assets.filter((a) => debtTypes.includes(a.asset_type))
    .reduce((s, a) => s + (a.current_value ?? 0), 0);
  if (debtValue / totalValue > 0.7) {
    warnings.push('Over 70% of your portfolio is in debt instruments. Consider adding equity exposure.');
  }

  // Equity only warning
  const equityTypes = ['STOCK', 'MF', 'ETF', 'REIT'];
  const equityValue = assets.filter((a) => equityTypes.includes(a.asset_type))
    .reduce((s, a) => s + (a.current_value ?? 0), 0);
  if (equityValue / totalValue > 0.9) {
    warnings.push('Over 90% of your portfolio is in equity — consider adding some debt or gold for stability.');
  }

  // Single sector concentration (stocks)
  const sectorMap = {};
  assets.filter((a) => a.asset_type === 'STOCK' && a.sector).forEach((a) => {
    sectorMap[a.sector] = (sectorMap[a.sector] || 0) + (a.current_value ?? 0);
  });
  Object.entries(sectorMap).forEach(([sector, val]) => {
    if (val / totalValue > 0.4) {
      warnings.push(`${sector} sector accounts for ${((val / totalValue) * 100).toFixed(1)}% of your portfolio.`);
    }
  });

  return { warnings };
}

/**
 * Check if a real-estate asset has high loan-to-value ratio.
 * @param {number} loanOutstanding
 * @param {number} currentValue
 * @returns {{ warning: string|null }}
 */
export function warnLTV(loanOutstanding, currentValue) {
  if (!loanOutstanding || !currentValue) return { warning: null };
  const ltv = (loanOutstanding / currentValue) * 100;
  if (ltv > 80) {
    return { warning: `Loan-to-value ratio is ${ltv.toFixed(1)}% — high financial leverage on this property.` };
  }
  return { warning: null };
}
