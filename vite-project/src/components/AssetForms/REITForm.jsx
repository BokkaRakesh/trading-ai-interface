import { Field, Input, Select, FormSection, TotalCost, SubmitRow, useAssetForm, createAsset, rules } from './formHelpers';

const PROPERTY_TYPES = [
  { value: 'OFFICE', label: 'Office / Commercial' },
  { value: 'RETAIL', label: 'Retail / Mall' },
  { value: 'WAREHOUSE', label: 'Warehouse / Logistics' },
  { value: 'MIXED', label: 'Mixed Use' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
];
const EXCHANGES = ['NSE', 'BSE'];
const KNOWN_REITS = [
  { value: 'EMBASSY', label: 'Embassy Office Parks REIT' },
  { value: 'MINDSPACE', label: 'Mindspace Business Parks REIT' },
  { value: 'BROOKFIELD', label: 'Brookfield India Real Estate Trust' },
  { value: 'NEXUS', label: 'Nexus Select Trust REIT' },
  { value: 'custom', label: 'Other REIT' },
];

const VALIDATION = {
  reit_name: rules.required('REIT name'),
  quantity: rules.positiveNumber('Units'),
  nav_at_purchase: rules.positiveNumber('NAV / price at purchase'),
  purchase_date: rules.notFuture('Purchase date'),
};

export default function REITForm({ householdId, onSuccess }) {
  const INIT = {
    preset: '', reit_name: '', ticker: '', isin: '', exchange: 'NSE',
    property_type: 'MIXED', nav_at_purchase: '', quantity: '',
    purchase_date: '', dividend_yield: '', notes: '',
  };

  const { values, errors, loading, success, apiError, set, submit } = useAssetForm(INIT, async (v) => {
    await createAsset(householdId, 'REIT', {
      asset_name: v.reit_name,
      quantity: v.quantity,
      purchase_price: v.nav_at_purchase,
      purchase_date: v.purchase_date,
      notes: v.notes,
    }, {
      reit_name: v.reit_name,
      ticker: v.ticker,
      isin: v.isin,
      exchange: v.exchange,
      property_type: v.property_type,
      nav_at_purchase: v.nav_at_purchase,
      dividend_yield: v.dividend_yield || null,
    });
    onSuccess?.();
  });

  function handlePreset(val) {
    set('preset', val);
    if (val && val !== 'custom') {
      set('ticker', val);
      set('reit_name', KNOWN_REITS.find((r) => r.value === val)?.label || val);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(VALIDATION); }} className="space-y-5">
      <FormSection title="REIT Details">
        <Field label="Quick Select">
          <Select value={values.preset} onChange={handlePreset} options={KNOWN_REITS} placeholder="Select a REIT…" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="REIT Name" error={errors.reit_name} required>
            <Input value={values.reit_name} onChange={(v) => set('reit_name', v)} placeholder="e.g. Embassy Office Parks REIT" />
          </Field>
          <Field label="Ticker">
            <Input value={values.ticker} onChange={(v) => set('ticker', v.toUpperCase())} placeholder="EMBASSY" />
          </Field>
          <Field label="ISIN">
            <Input value={values.isin} onChange={(v) => set('isin', v.toUpperCase())} placeholder="INE040A01034" />
          </Field>
          <Field label="Exchange">
            <Select value={values.exchange} onChange={(v) => set('exchange', v)} options={EXCHANGES} />
          </Field>
          <Field label="Property Type">
            <Select value={values.property_type} onChange={(v) => set('property_type', v)} options={PROPERTY_TYPES} />
          </Field>
          <Field label="Annual Dividend Yield (%)" hint="Optional — from annual report">
            <Input type="number" value={values.dividend_yield} onChange={(v) => set('dividend_yield', v)} placeholder="6.5" step="0.01" min="0" max="30" />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Purchase Details">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Units" error={errors.quantity} required>
            <Input type="number" value={values.quantity} onChange={(v) => set('quantity', v)} placeholder="100" step="0.001" min="0.001" />
          </Field>
          <Field label="NAV / Price at Purchase (₹)" error={errors.nav_at_purchase} required>
            <Input type="number" value={values.nav_at_purchase} onChange={(v) => set('nav_at_purchase', v)} placeholder="350.00" step="0.01" min="0.01" />
          </Field>
          <Field label="Purchase Date" error={errors.purchase_date} required>
            <Input type="date" value={values.purchase_date} onChange={(v) => set('purchase_date', v)} max={new Date().toISOString().split('T')[0]} />
          </Field>
        </div>
        <TotalCost quantity={values.quantity} price={values.nav_at_purchase} />
      </FormSection>

      <SubmitRow loading={loading} success={success} apiError={apiError} label="Add REIT" />
    </form>
  );
}
