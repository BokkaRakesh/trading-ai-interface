import { Field, Input, Select, Checkbox, FormSection, TotalCost, SubmitRow, useAssetForm, createAsset, rules } from './formHelpers';

const ISSUER_TYPES = [
  { value: 'GOVERNMENT', label: 'Government Security (G-Sec / T-Bill)' },
  { value: 'PSU', label: 'PSU Bond' },
  { value: 'CORPORATE', label: 'Corporate Bond' },
  { value: 'MUNICIPAL', label: 'Municipal Bond' },
];
const COUPON_FREQS = [
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'SEMI_ANNUAL', label: 'Semi-annual' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'ZERO_COUPON', label: 'Zero Coupon / Discount' },
];

const VALIDATION = {
  bond_name: rules.required('Bond name'),
  quantity: rules.positiveNumber('Number of bonds'),
  purchase_price: rules.positiveNumber('Purchase price'),
  purchase_date: rules.notFuture('Purchase date'),
  maturity_date: (v, all) => {
    if (!v) return 'Maturity date is required.';
    if (all.purchase_date && new Date(v) < new Date(all.purchase_date))
      return 'Maturity date must be after purchase date.';
    return '';
  },
};

export default function BondForm({ householdId, onSuccess }) {
  const INIT = {
    bond_name: '', isin: '', issuer_name: '', issuer_type: 'GOVERNMENT',
    face_value: '1000', coupon_rate: '', coupon_frequency: 'SEMI_ANNUAL',
    quantity: '', purchase_price: '', purchase_date: '', maturity_date: '',
    credit_rating: '', credit_agency: '', is_taxfree: false, is_listed: true,
    demat_account: '', notes: '',
  };

  const { values, errors, loading, success, apiError, set, submit } = useAssetForm(INIT, async (v) => {
    await createAsset(householdId, 'BOND', {
      asset_name: v.bond_name,
      quantity: v.quantity,
      purchase_price: v.purchase_price,
      purchase_date: v.purchase_date,
      notes: v.notes,
    }, {
      bond_name: v.bond_name,
      isin: v.isin || null,
      issuer_name: v.issuer_name,
      issuer_type: v.issuer_type,
      face_value: v.face_value,
      coupon_rate: v.coupon_rate,
      coupon_frequency: v.coupon_frequency,
      maturity_date: v.maturity_date,
      credit_rating: v.credit_rating || null,
      is_taxfree: v.is_taxfree,
      is_listed: v.is_listed,
      demat_account: v.demat_account || null,
    });
    onSuccess?.();
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(VALIDATION); }} className="space-y-5">
      <FormSection title="Bond Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bond Name" error={errors.bond_name} required>
            <Input value={values.bond_name} onChange={(v) => set('bond_name', v)} placeholder="e.g. GOI 7.26% 2033" />
          </Field>
          <Field label="Issuer Name">
            <Input value={values.issuer_name} onChange={(v) => set('issuer_name', v)} placeholder="Government of India" />
          </Field>
          <Field label="Issuer Type">
            <Select value={values.issuer_type} onChange={(v) => set('issuer_type', v)} options={ISSUER_TYPES} />
          </Field>
          <Field label="ISIN" hint="Required for listed bonds">
            <Input value={values.isin} onChange={(v) => set('isin', v.toUpperCase())} placeholder="IN0020210027" />
          </Field>
          <Field label="Face Value (₹ per bond)">
            <Input type="number" value={values.face_value} onChange={(v) => set('face_value', v)} placeholder="1000" min="1" />
          </Field>
          <Field label="Coupon Rate (% p.a.)">
            <Input type="number" value={values.coupon_rate} onChange={(v) => set('coupon_rate', v)} placeholder="7.26" step="0.01" min="0" max="30" />
          </Field>
          <Field label="Coupon Frequency">
            <Select value={values.coupon_frequency} onChange={(v) => set('coupon_frequency', v)} options={COUPON_FREQS} />
          </Field>
          <Field label="Credit Rating" hint="e.g. AAA, AA+, A">
            <Input value={values.credit_rating} onChange={(v) => set('credit_rating', v)} placeholder="AAA" />
          </Field>
          <Field label="Demat Account">
            <Input value={values.demat_account} onChange={(v) => set('demat_account', v)} placeholder="e.g. Zerodha 12345678" />
          </Field>
        </div>
        <div className="flex gap-6">
          <Checkbox checked={values.is_taxfree} onChange={(v) => set('is_taxfree', v)} label="Tax-free bond" />
          <Checkbox checked={values.is_listed} onChange={(v) => set('is_listed', v)} label="Listed on exchange" />
        </div>
      </FormSection>

      <FormSection title="Purchase Details">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="No. of Bonds" error={errors.quantity} required>
            <Input type="number" value={values.quantity} onChange={(v) => set('quantity', v)} placeholder="5" min="1" step="1" />
          </Field>
          <Field label="Purchase Price (₹ per bond)" error={errors.purchase_price} required>
            <Input type="number" value={values.purchase_price} onChange={(v) => set('purchase_price', v)} placeholder="10000" min="1" step="0.01" />
          </Field>
          <Field label="Purchase Date" error={errors.purchase_date} required>
            <Input type="date" value={values.purchase_date} onChange={(v) => set('purchase_date', v)} max={new Date().toISOString().split('T')[0]} />
          </Field>
          <Field label="Maturity Date" error={errors.maturity_date} required>
            <Input type="date" value={values.maturity_date} onChange={(v) => set('maturity_date', v)} />
          </Field>
        </div>
        <TotalCost quantity={values.quantity} price={values.purchase_price} label="Total invested" />
      </FormSection>

      <SubmitRow loading={loading} success={success} apiError={apiError} label="Add Bond" />
    </form>
  );
}
