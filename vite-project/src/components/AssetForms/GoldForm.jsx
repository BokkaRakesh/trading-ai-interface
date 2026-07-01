import { Field, Input, Select, Checkbox, FormSection, SubmitRow, useAssetForm, createAsset, rules, formatINR } from './formHelpers';

const GOLD_FORMS = [
  { value: 'PHYSICAL', label: 'Physical (Jewellery / Coin / Bar)' },
  { value: 'DIGITAL', label: 'Digital Gold (Google Pay, Paytm, etc.)' },
  { value: 'ETF', label: 'Gold ETF (e.g. GOLDBEES)' },
  { value: 'SGB', label: 'Sovereign Gold Bond (SGB)' },
];
const PURITIES = [
  { value: '24K', label: '24K (99.9% pure)' },
  { value: '22K', label: '22K (91.7% pure — BIS 916)' },
  { value: '18K', label: '18K (75% pure)' },
  { value: '14K', label: '14K (58.5% pure)' },
];
const today = new Date().toISOString().split('T')[0];

function totalCostGold(weight, price) {
  const w = parseFloat(weight) || 0;
  const p = parseFloat(price) || 0;
  const total = w * p;
  if (!total) return null;
  return (
    <div className="bg-gray-900/60 rounded-lg px-3 py-2 text-sm text-gray-400">
      Estimated total cost:{' '}
      <span className="text-white font-medium">₹{formatINR(total)}</span>
      <span className="text-gray-500 ml-2">({w}g × ₹{formatINR(p)}/g)</span>
    </div>
  );
}

export default function GoldForm({ householdId, onSuccess }) {
  const INIT = {
    gold_form: 'PHYSICAL', purity: '22K', weight_grams: '', price_per_gram: '',
    purchase_date: '', hallmarked: false, custodian: '',
    sgb_series: '', sgb_isin: '', sgb_coupon_rate: '', sgb_maturity_date: '',
    etf_ticker: '', notes: '',
  };

  const { values, errors, loading, success, apiError, set, submit } = useAssetForm(INIT, async (v) => {
    const weight = parseFloat(v.weight_grams);
    const price = parseFloat(v.price_per_gram);
    const total = weight * price;
    const purityPct = { '24K': 99.99, '22K': 91.67, '18K': 75.0, '14K': 58.5 };

    await createAsset(householdId, 'GOLD', {
      asset_name: `Gold ${v.gold_form === 'SGB' ? 'SGB' : v.purity} — ${v.weight_grams}g`,
      quantity: v.weight_grams,   // quantity = grams
      purchase_price: v.price_per_gram,
      purchase_value: total.toFixed(2),
      purchase_date: v.purchase_date,
      notes: v.notes,
    }, {
      gold_form: v.gold_form,
      weight_grams: v.weight_grams,
      purity_karat: parseInt(v.purity),
      purity_percent: purityPct[v.purity] ?? null,
      hallmarked: v.hallmarked,
      custodian: v.custodian || null,
      sgb_series: v.sgb_series || null,
      sgb_isin: v.sgb_isin || null,
      sgb_coupon_rate: v.sgb_coupon_rate || null,
      sgb_maturity_date: v.sgb_maturity_date || null,
      etf_ticker: v.etf_ticker || null,
    });
    onSuccess?.();
  });

  const isPhysical = ['PHYSICAL', 'DIGITAL'].includes(values.gold_form);
  const isSGB = values.gold_form === 'SGB';
  const isETF = values.gold_form === 'ETF';

  const VALIDATION = {
    weight_grams: rules.positiveNumber('Weight'),
    price_per_gram: rules.positiveNumber('Price per gram'),
    purchase_date: rules.notFuture('Purchase date'),
    ...(isSGB && { sgb_series: rules.required('SGB series') }),
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(VALIDATION); }} className="space-y-5">
      <FormSection title="Gold Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Form" required>
            <Select value={values.gold_form} onChange={(v) => set('gold_form', v)} options={GOLD_FORMS} />
          </Field>
          {!isETF && (
            <Field label="Purity">
              <Select value={values.purity} onChange={(v) => set('purity', v)} options={PURITIES} />
            </Field>
          )}
          {isETF && (
            <Field label="ETF Ticker" hint="e.g. GOLDBEES, SETFGOLD">
              <Input value={values.etf_ticker} onChange={(v) => set('etf_ticker', v.toUpperCase())} placeholder="GOLDBEES" />
            </Field>
          )}
          {isPhysical && (
            <Field label="Custodian / Vault" hint="Where is it stored?">
              <Input value={values.custodian} onChange={(v) => set('custodian', v)} placeholder="Bank locker, home safe, vault" />
            </Field>
          )}
        </div>
        {isPhysical && (
          <div className="flex gap-4">
            <Checkbox checked={values.hallmarked} onChange={(v) => set('hallmarked', v)} label="BIS Hallmarked" />
          </div>
        )}
        {isSGB && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <Field label="SGB Series" error={errors.sgb_series} required>
              <Input value={values.sgb_series} onChange={(v) => set('sgb_series', v)} placeholder="e.g. SGB 2020-21 Series VIII" />
            </Field>
            <Field label="SGB ISIN">
              <Input value={values.sgb_isin} onChange={(v) => set('sgb_isin', v.toUpperCase())} placeholder="IN0020200XXX" />
            </Field>
            <Field label="Coupon Rate (% p.a.)" hint="Typically 2.5% p.a.">
              <Input type="number" value={values.sgb_coupon_rate} onChange={(v) => set('sgb_coupon_rate', v)} placeholder="2.5" step="0.01" min="0" />
            </Field>
            <Field label="SGB Maturity Date">
              <Input type="date" value={values.sgb_maturity_date} onChange={(v) => set('sgb_maturity_date', v)} />
            </Field>
          </div>
        )}
      </FormSection>

      <FormSection title="Purchase Details">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Weight (grams)" error={errors.weight_grams} required>
            <Input type="number" value={values.weight_grams} onChange={(v) => set('weight_grams', v)} placeholder="10.0" step="0.001" min="0.001" />
          </Field>
          <Field label="Price per gram (₹)" error={errors.price_per_gram} required>
            <Input type="number" value={values.price_per_gram} onChange={(v) => set('price_per_gram', v)} placeholder="7500" step="0.01" min="1" />
          </Field>
          <Field label="Purchase Date" error={errors.purchase_date} required>
            <Input type="date" value={values.purchase_date} onChange={(v) => set('purchase_date', v)} max={today} />
          </Field>
        </div>
        {totalCostGold(values.weight_grams, values.price_per_gram)}
      </FormSection>

      <SubmitRow loading={loading} success={success} apiError={apiError} label="Add Gold" />
    </form>
  );
}
