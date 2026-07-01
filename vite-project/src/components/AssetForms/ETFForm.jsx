import { Field, Input, Select, FormSection, TotalCost, SubmitRow, useAssetForm, createAsset, rules } from './formHelpers';

const ETF_TYPES = [
  { value: 'EQUITY', label: 'Equity' },
  { value: 'GOLD', label: 'Gold' },
  { value: 'SILVER', label: 'Silver' },
  { value: 'DEBT', label: 'Debt / Liquid' },
  { value: 'INTERNATIONAL', label: 'International' },
  { value: 'REIT', label: 'REIT ETF' },
];
const EXCHANGES = ['NSE', 'BSE'];
const POPULAR_ETFS = [
  { value: 'NIFTYBEES', label: 'Nippon Nifty BeES (NIFTYBEES)' },
  { value: 'JUNIORBEES', label: 'Nippon Junior BeES (JUNIORBEES)' },
  { value: 'GOLDBEES', label: 'Nippon Gold BeES (GOLDBEES)' },
  { value: 'SETFNIF50', label: 'SBI Nifty 50 ETF (SETFNIF50)' },
  { value: 'SILVERBEES', label: 'Nippon Silver BeES (SILVERBEES)' },
  { value: 'BANKBEES', label: 'Nippon Bank BeES (BANKBEES)' },
  { value: 'custom', label: 'Other (enter manually)' },
];

const VALIDATION = {
  asset_name: rules.required('ETF name'),
  quantity: rules.positiveNumber('Units'),
  purchase_price: rules.nonNegative('Purchase price'),
  purchase_date: rules.notFuture('Purchase date'),
};

export default function ETFForm({ householdId, onSuccess }) {
  const INIT = {
    preset: '', asset_name: '', ticker: '', isin: '', exchange: 'NSE',
    etf_type: 'EQUITY', underlying_index: '', fund_house: '', expense_ratio: '',
    quantity: '', purchase_price: '', purchase_date: '', notes: '',
  };

  const { values, errors, loading, success, apiError, set, submit } = useAssetForm(INIT, async (v) => {
    await createAsset(householdId, 'ETF', {
      asset_name: v.asset_name,
      quantity: v.quantity,
      purchase_price: v.purchase_price,
      purchase_date: v.purchase_date,
      notes: v.notes,
    }, {
      ticker: v.ticker,
      isin: v.isin,
      exchange: v.exchange,
      etf_type: v.etf_type,
      underlying_index: v.underlying_index,
      fund_house: v.fund_house,
      expense_ratio: v.expense_ratio || null,
    });
    onSuccess?.();
  });

  function handlePreset(val) {
    set('preset', val);
    if (val && val !== 'custom') {
      set('ticker', val);
      set('asset_name', POPULAR_ETFS.find((e) => e.value === val)?.label?.split(' (')[0] || val);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(VALIDATION); }} className="space-y-5">
      <FormSection title="ETF Details">
        <Field label="Quick Select (Popular ETFs)" hint="Select a preset or enter manually below">
          <Select value={values.preset} onChange={handlePreset} options={POPULAR_ETFS} placeholder="Select an ETF…" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ETF Name" error={errors.asset_name} required>
            <Input value={values.asset_name} onChange={(v) => set('asset_name', v)} placeholder="e.g. Nippon Nifty BeES" />
          </Field>
          <Field label="Ticker">
            <Input value={values.ticker} onChange={(v) => set('ticker', v.toUpperCase())} placeholder="NIFTYBEES" />
          </Field>
          <Field label="ISIN">
            <Input value={values.isin} onChange={(v) => set('isin', v.toUpperCase())} placeholder="INF204KA1X78" />
          </Field>
          <Field label="Exchange">
            <Select value={values.exchange} onChange={(v) => set('exchange', v)} options={EXCHANGES} />
          </Field>
          <Field label="ETF Type">
            <Select value={values.etf_type} onChange={(v) => set('etf_type', v)} options={ETF_TYPES} />
          </Field>
          <Field label="Underlying Index / Asset">
            <Input value={values.underlying_index} onChange={(v) => set('underlying_index', v)} placeholder="e.g. Nifty 50, Gold Spot" />
          </Field>
          <Field label="Fund House">
            <Input value={values.fund_house} onChange={(v) => set('fund_house', v)} placeholder="e.g. Nippon India MF" />
          </Field>
          <Field label="Expense Ratio (%)" hint="Optional, for tracking">
            <Input type="number" value={values.expense_ratio} onChange={(v) => set('expense_ratio', v)} placeholder="0.05" step="0.001" min="0" max="5" />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Purchase Details">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Units" error={errors.quantity} required>
            <Input type="number" value={values.quantity} onChange={(v) => set('quantity', v)} placeholder="100" step="0.001" min="0.001" />
          </Field>
          <Field label="Purchase Price (₹ per unit)" error={errors.purchase_price} required>
            <Input type="number" value={values.purchase_price} onChange={(v) => set('purchase_price', v)} placeholder="230.50" step="0.01" min="0" />
          </Field>
          <Field label="Purchase Date" error={errors.purchase_date} required>
            <Input type="date" value={values.purchase_date} onChange={(v) => set('purchase_date', v)} max={new Date().toISOString().split('T')[0]} />
          </Field>
        </div>
        <TotalCost quantity={values.quantity} price={values.purchase_price} />
      </FormSection>

      <SubmitRow loading={loading} success={success} apiError={apiError} label="Add ETF" />
    </form>
  );
}
