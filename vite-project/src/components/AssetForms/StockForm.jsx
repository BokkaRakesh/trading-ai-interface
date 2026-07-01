import { Field, Input, Select, FormSection, TotalCost, SubmitRow, useAssetForm, createAsset, rules } from './formHelpers';

const EXCHANGES = ['NSE', 'BSE', 'NASDAQ', 'NYSE'];

const VALIDATION = {
  asset_name: rules.required('Company name'),
  quantity: rules.positiveNumber('Quantity'),
  purchase_price: rules.nonNegative('Purchase price'),
  purchase_date: rules.notFuture('Purchase date'),
};

export default function StockForm({ householdId, onSuccess }) {
  const INIT = {
    asset_name: '', ticker: '', isin: '', exchange: 'NSE', sector: '',
    broker_account: '', quantity: '', purchase_price: '', purchase_date: '',
    current_price: '', notes: '',
  };

  const { values, errors, loading, success, apiError, set, submit } = useAssetForm(INIT, async (v) => {
    await createAsset(householdId, 'STOCK', {
      asset_name: v.asset_name,
      quantity: v.quantity,
      purchase_price: v.purchase_price,
      purchase_date: v.purchase_date,
      notes: v.notes,
    }, {
      ticker: v.ticker,
      isin: v.isin,
      exchange: v.exchange,
      sector: v.sector,
      broker_account: v.broker_account,
      company_name: v.asset_name,
    });
    onSuccess?.();
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(VALIDATION); }} className="space-y-5">
      <FormSection title="Stock Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Company Name" error={errors.asset_name} required>
            <Input value={values.asset_name} onChange={(v) => set('asset_name', v)} placeholder="e.g. HDFC Bank Ltd" />
          </Field>
          <Field label="Ticker Symbol" error={errors.ticker}>
            <Input value={values.ticker} onChange={(v) => set('ticker', v.toUpperCase())} placeholder="e.g. HDFCBANK" />
          </Field>
          <Field label="ISIN" error={errors.isin} hint="12-character code e.g. INE040A01034">
            <Input value={values.isin} onChange={(v) => set('isin', v.toUpperCase())} placeholder="INE040A01034" />
          </Field>
          <Field label="Exchange">
            <Select value={values.exchange} onChange={(v) => set('exchange', v)} options={EXCHANGES} />
          </Field>
          <Field label="Sector">
            <Input value={values.sector} onChange={(v) => set('sector', v)} placeholder="e.g. Banking, IT, FMCG" />
          </Field>
          <Field label="Broker / Demat Account">
            <Input value={values.broker_account} onChange={(v) => set('broker_account', v)} placeholder="e.g. Zerodha A1234" />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Purchase Details">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Quantity (Shares)" error={errors.quantity} required>
            <Input type="number" value={values.quantity} onChange={(v) => set('quantity', v)} placeholder="50" min="0.001" step="0.001" />
          </Field>
          <Field label="Purchase Price (₹)" error={errors.purchase_price} required>
            <Input type="number" value={values.purchase_price} onChange={(v) => set('purchase_price', v)} placeholder="1580.00" min="0" step="0.01" />
          </Field>
          <Field label="Purchase Date" error={errors.purchase_date} required>
            <Input type="date" value={values.purchase_date} onChange={(v) => set('purchase_date', v)} max={new Date().toISOString().split('T')[0]} />
          </Field>
        </div>
        <TotalCost quantity={values.quantity} price={values.purchase_price} />
      </FormSection>

      <FormSection>
        <Field label="Notes">
          <Input value={values.notes} onChange={(v) => set('notes', v)} placeholder="Optional notes" />
        </Field>
      </FormSection>

      <SubmitRow loading={loading} success={success} apiError={apiError} label="Add Stock" />
    </form>
  );
}
