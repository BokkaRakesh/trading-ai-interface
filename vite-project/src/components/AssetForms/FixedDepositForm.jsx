import { Field, Input, Select, Checkbox, FormSection, SubmitRow, useAssetForm, createAsset, rules, formatINR } from './formHelpers';

const INSTITUTION_TYPES = [
  { value: 'BANK', label: 'Bank' },
  { value: 'POST_OFFICE', label: 'Post Office' },
  { value: 'COMPANY', label: 'Company FD (NBFC/Corporate)' },
  { value: 'NBFC', label: 'NBFC' },
];
const COMPOUNDING = [
  { value: 'QUARTERLY', label: 'Quarterly (Most common)' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'SEMI_ANNUAL', label: 'Half-yearly' },
  { value: 'ANNUAL', label: 'Annually' },
  { value: 'SIMPLE', label: 'Simple Interest' },
];

/** Calculate maturity amount for a bank FD. */
function calcMaturityAmount(principal, rate, depositDate, maturityDate, frequency) {
  if (!principal || !rate || !depositDate || !maturityDate) return null;
  const p = parseFloat(principal);
  const r = parseFloat(rate) / 100;
  const start = new Date(depositDate);
  const end = new Date(maturityDate);
  const years = (end - start) / (365.25 * 24 * 3600 * 1000);
  if (years <= 0) return null;

  const nMap = { QUARTERLY: 4, MONTHLY: 12, SEMI_ANNUAL: 2, ANNUAL: 1, SIMPLE: null };
  const n = nMap[frequency];
  if (!n) {
    // Simple interest
    return (p * (1 + r * years)).toFixed(2);
  }
  return (p * Math.pow(1 + r / n, n * years)).toFixed(2);
}

export default function FixedDepositForm({ householdId, onSuccess }) {
  const INIT = {
    institution_name: '', institution_type: 'BANK', fd_account_number: '',
    principal_amount: '', interest_rate: '', compounding_frequency: 'QUARTERLY',
    deposit_date: '', maturity_date: '', is_auto_renew: false, is_tax_saver: false,
    tds_applicable: true, form_15g_submitted: false, nominee_name: '', notes: '',
  };

  const VALIDATION = {
    institution_name: rules.required('Institution name'),
    principal_amount: rules.positiveNumber('Principal amount'),
    interest_rate: rules.range('Interest rate', 0.01, 25),
    deposit_date: rules.notFuture('Deposit / opening date'),
    maturity_date: (v, all) => {
      if (!v) return 'Maturity date is required.';
      if (all.deposit_date && new Date(v) <= new Date(all.deposit_date))
        return 'Maturity date must be after deposit date.';
      return '';
    },
  };

  const { values, errors, loading, success, apiError, set, submit } = useAssetForm(INIT, async (v) => {
    const label = `${v.institution_name} FD${v.is_tax_saver ? ' (Tax Saver)' : ''}`;
    await createAsset(householdId, 'FD', {
      asset_name: label,
      quantity: '1',
      purchase_price: v.principal_amount,
      purchase_value: v.principal_amount,
      purchase_date: v.deposit_date,
      notes: v.notes,
    }, {
      institution_name: v.institution_name,
      institution_type: v.institution_type,
      fd_account_number: v.fd_account_number || null,
      interest_rate: v.interest_rate,
      compounding_frequency: v.compounding_frequency,
      deposit_date: v.deposit_date,
      fd_maturity_date: v.maturity_date,
      maturity_amount: calcMaturityAmount(
        v.principal_amount, v.interest_rate, v.deposit_date, v.maturity_date, v.compounding_frequency
      ),
      is_auto_renew: v.is_auto_renew,
      is_tax_saver: v.is_tax_saver,
      tds_applicable: v.tds_applicable,
      form_15g_submitted: v.form_15g_submitted,
      nominee_name: v.nominee_name || null,
    });
    onSuccess?.();
  });

  const estimated = calcMaturityAmount(
    values.principal_amount, values.interest_rate,
    values.deposit_date, values.maturity_date, values.compounding_frequency
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(VALIDATION); }} className="space-y-5">
      <FormSection title="Institution Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Institution / Bank Name" error={errors.institution_name} required>
            <Input value={values.institution_name} onChange={(v) => set('institution_name', v)} placeholder="e.g. State Bank of India" />
          </Field>
          <Field label="Institution Type">
            <Select value={values.institution_type} onChange={(v) => set('institution_type', v)} options={INSTITUTION_TYPES} />
          </Field>
          <Field label="FD Account / Reference Number">
            <Input value={values.fd_account_number} onChange={(v) => set('fd_account_number', v)} placeholder="FD202601001234" />
          </Field>
          <Field label="Nominee Name">
            <Input value={values.nominee_name} onChange={(v) => set('nominee_name', v)} placeholder="Full name of nominee" />
          </Field>
        </div>
      </FormSection>

      <FormSection title="FD Terms">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Principal Amount (₹)" error={errors.principal_amount} required>
            <Input type="number" value={values.principal_amount} onChange={(v) => set('principal_amount', v)} placeholder="100000" min="1000" />
          </Field>
          <Field label="Interest Rate (% p.a.)" error={errors.interest_rate} required>
            <Input type="number" value={values.interest_rate} onChange={(v) => set('interest_rate', v)} placeholder="6.8" step="0.01" min="0.01" max="25" />
          </Field>
          <Field label="Compounding Frequency">
            <Select value={values.compounding_frequency} onChange={(v) => set('compounding_frequency', v)} options={COMPOUNDING} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Opening / Deposit Date" error={errors.deposit_date} required>
            <Input type="date" value={values.deposit_date} onChange={(v) => set('deposit_date', v)} max={new Date().toISOString().split('T')[0]} />
          </Field>
          <Field label="Maturity Date" error={errors.maturity_date} required>
            <Input type="date" value={values.maturity_date} onChange={(v) => set('maturity_date', v)} />
          </Field>
        </div>
        {estimated && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-400">Estimated maturity amount: </span>
            <span className="text-blue-300 font-semibold">₹{formatINR(estimated)}</span>
            <span className="text-gray-500 ml-2">(approx.)</span>
          </div>
        )}
      </FormSection>

      <FormSection title="Options">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Checkbox checked={values.is_auto_renew} onChange={(v) => set('is_auto_renew', v)} label="Auto-renew on maturity" />
          <Checkbox checked={values.is_tax_saver} onChange={(v) => set('is_tax_saver', v)} label="Tax saver FD (80C)" />
          <Checkbox checked={values.tds_applicable} onChange={(v) => set('tds_applicable', v)} label="TDS applicable" />
          <Checkbox checked={values.form_15g_submitted} onChange={(v) => set('form_15g_submitted', v)} label="Form 15G/15H submitted" />
        </div>
      </FormSection>

      <SubmitRow loading={loading} success={success} apiError={apiError} label="Add Fixed Deposit" />
    </form>
  );
}
