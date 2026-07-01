import { Field, Input, Select, FormSection, SubmitRow, useAssetForm, createAsset, rules, formatINR } from './formHelpers';

const SILVER_FORMS = [
  { value: 'PHYSICAL', label: 'Physical (Bullion / Coins / Bars)' },
  { value: 'ETF', label: 'Silver ETF (e.g. SILVERBEES)' },
  { value: 'DIGITAL', label: 'Digital Silver' },
];
const FINENESS_OPTIONS = [
  { value: '999', label: '999 Fine (99.9%)' },
  { value: '925', label: '925 Sterling (92.5%)' },
  { value: '900', label: '900 (90%)' },
  { value: '800', label: '800 (80%)' },
];
const today = new Date().toISOString().split('T')[0];

export default function SilverForm({ householdId, onSuccess }) {
  const INIT = {
    silver_form: 'PHYSICAL', fineness: '999', weight_grams: '',
    price_per_gram: '', purchase_date: '', etf_ticker: '', etf_isin: '', notes: '',
  };

  const VALIDATION = {
    weight_grams: rules.positiveNumber('Weight'),
    price_per_gram: rules.positiveNumber('Price per gram'),
    purchase_date: rules.notFuture('Purchase date'),
  };

  const { values, errors, loading, success, apiError, set, submit } = useAssetForm(INIT, async (v) => {
    const weight = parseFloat(v.weight_grams);
    const price = parseFloat(v.price_per_gram);
    const total = weight * price;

    await createAsset(householdId, 'SILVER', {
      asset_name: `Silver ${v.silver_form} — ${v.weight_grams}g`,
      quantity: v.weight_grams,
      purchase_price: v.price_per_gram,
      purchase_value: total.toFixed(2),
      purchase_date: v.purchase_date,
      notes: v.notes,
    }, {
      silver_form: v.silver_form,
      weight_grams: v.weight_grams,
      fineness: parseFloat(v.fineness) || null,
      etf_ticker: v.etf_ticker || null,
      etf_isin: v.etf_isin || null,
    });
    onSuccess?.();
  });

  const isETF = values.silver_form === 'ETF';
  const w = parseFloat(values.weight_grams) || 0;
  const p = parseFloat(values.price_per_gram) || 0;
  const total = w * p;

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(VALIDATION); }} className="space-y-5">
      <FormSection title="Silver Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Form" required>
            <Select value={values.silver_form} onChange={(v) => set('silver_form', v)} options={SILVER_FORMS} />
          </Field>
          <Field label="Fineness / Purity">
            <Select value={values.fineness} onChange={(v) => set('fineness', v)} options={FINENESS_OPTIONS} />
          </Field>
          {isETF && (
            <>
              <Field label="ETF Ticker" hint="e.g. SILVERBEES">
                <Input value={values.etf_ticker} onChange={(v) => set('etf_ticker', v.toUpperCase())} placeholder="SILVERBEES" />
              </Field>
              <Field label="ETF ISIN">
                <Input value={values.etf_isin} onChange={(v) => set('etf_isin', v.toUpperCase())} placeholder="INF204KC1PH6" />
              </Field>
            </>
          )}
        </div>
      </FormSection>

      <FormSection title="Purchase Details">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Weight (grams)" error={errors.weight_grams} required>
            <Input type="number" value={values.weight_grams} onChange={(v) => set('weight_grams', v)} placeholder="100" step="0.001" min="0.001" />
          </Field>
          <Field label="Price per gram (₹)" error={errors.price_per_gram} required>
            <Input type="number" value={values.price_per_gram} onChange={(v) => set('price_per_gram', v)} placeholder="102.50" step="0.01" min="0.01" />
          </Field>
          <Field label="Purchase Date" error={errors.purchase_date} required>
            <Input type="date" value={values.purchase_date} onChange={(v) => set('purchase_date', v)} max={today} />
          </Field>
        </div>
        {total > 0 && (
          <div className="bg-gray-900/60 rounded-lg px-3 py-2 text-sm text-gray-400">
            Estimated total cost:{' '}
            <span className="text-white font-medium">₹{formatINR(total)}</span>
          </div>
        )}
      </FormSection>

      <SubmitRow loading={loading} success={success} apiError={apiError} label="Add Silver" />
    </form>
  );
}
