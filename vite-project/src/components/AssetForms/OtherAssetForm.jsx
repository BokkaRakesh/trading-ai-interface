import { Field, Input, Select, FormSection, SubmitRow, useAssetForm, createAsset, rules } from './formHelpers';

const SUB_TYPES = [
  { value: 'PPF', label: 'PPF (Public Provident Fund)' },
  { value: 'NSC', label: 'NSC (National Savings Certificate)' },
  { value: 'SUKANYA_SAMRIDDHI', label: 'Sukanya Samriddhi Yojana' },
  { value: 'EPF', label: 'EPF (Employee Provident Fund)' },
  { value: 'NPS', label: 'NPS (National Pension System)' },
  { value: 'SAVINGS_ACCOUNT', label: 'High-yield Savings Account' },
  { value: 'CRYPTO', label: 'Cryptocurrency' },
  { value: 'UNLISTED_EQUITY', label: 'Unlisted / Pre-IPO Equity' },
  { value: 'STARTUP_INVESTMENT', label: 'Startup Investment (Angel / VC)' },
  { value: 'OTHER', label: 'Other' },
];

const VALIDATION = {
  asset_name: rules.required('Asset name'),
  sub_type: rules.required('Category'),
  quantity: (v) => (!v || isNaN(v) || Number(v) <= 0 ? 'Quantity must be > 0' : ''),
  purchase_price: rules.nonNegative('Value / price'),
  purchase_date: rules.notFuture('Date'),
};

export default function OtherAssetForm({ householdId, onSuccess }) {
  const INIT = {
    asset_name: '', sub_type: 'PPF', institution_name: '', account_number: '',
    quantity: '1', purchase_price: '', purchase_date: '',
    interest_rate: '', maturity_date: '', lock_in_years: '',
    token_symbol: '', wallet_or_exchange: '', notes: '',
  };

  const { values, errors, loading, success, apiError, set, submit } = useAssetForm(INIT, async (v) => {
    await createAsset(householdId, 'OTHER', {
      asset_name: v.asset_name,
      quantity: v.quantity,
      purchase_price: v.purchase_price,
      purchase_date: v.purchase_date,
      notes: v.notes,
    }, {
      sub_type: v.sub_type,
      institution_name: v.institution_name || null,
      account_number: v.account_number || null,
      interest_rate: v.interest_rate || null,
      maturity_date: v.maturity_date || null,
      lock_in_years: v.lock_in_years ? parseInt(v.lock_in_years) : null,
      token_symbol: v.token_symbol || null,
      wallet_or_exchange: v.wallet_or_exchange || null,
    });
    onSuccess?.();
  });

  const isCrypto = values.sub_type === 'CRYPTO';
  const hasMaturity = ['NSC', 'SUKANYA_SAMRIDDHI', 'PPF', 'NPS'].includes(values.sub_type);
  const hasInterest = ['PPF', 'NSC', 'SUKANYA_SAMRIDDHI', 'SAVINGS_ACCOUNT'].includes(values.sub_type);
  const hasLockIn = ['PPF', 'ELSS', 'NSC', 'SUKANYA_SAMRIDDHI'].includes(values.sub_type);

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(VALIDATION); }} className="space-y-5">
      <FormSection title="Asset Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Category" error={errors.sub_type} required>
            <Select value={values.sub_type} onChange={(v) => set('sub_type', v)} options={SUB_TYPES} />
          </Field>
          <Field label="Asset Name" error={errors.asset_name} required>
            <Input value={values.asset_name} onChange={(v) => set('asset_name', v)} placeholder="e.g. SBI PPF Account, Bitcoin, Ola Electric Series B" />
          </Field>
          {!isCrypto && (
            <>
              <Field label="Institution / Platform">
                <Input value={values.institution_name} onChange={(v) => set('institution_name', v)} placeholder="e.g. SBI, Groww, AngelList" />
              </Field>
              <Field label="Account / Reference Number">
                <Input value={values.account_number} onChange={(v) => set('account_number', v)} placeholder="Account or folio number" />
              </Field>
            </>
          )}
          {isCrypto && (
            <>
              <Field label="Token Symbol">
                <Input value={values.token_symbol} onChange={(v) => set('token_symbol', v.toUpperCase())} placeholder="BTC, ETH, SOL" />
              </Field>
              <Field label="Exchange / Wallet">
                <Input value={values.wallet_or_exchange} onChange={(v) => set('wallet_or_exchange', v)} placeholder="CoinDCX, WazirX, MetaMask wallet" />
              </Field>
            </>
          )}
        </div>
      </FormSection>

      <FormSection title="Value Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Quantity / Units" error={errors.quantity} required>
            <Input type="number" value={values.quantity} onChange={(v) => set('quantity', v)} placeholder="1" step="0.000001" min="0.000001" />
          </Field>
          <Field label="Current / Purchase Value (₹)" error={errors.purchase_price} required>
            <Input type="number" value={values.purchase_price} onChange={(v) => set('purchase_price', v)} placeholder="150000" min="0" />
          </Field>
          <Field label="Date of Investment / Opening" error={errors.purchase_date} required>
            <Input type="date" value={values.purchase_date} onChange={(v) => set('purchase_date', v)} max={new Date().toISOString().split('T')[0]} />
          </Field>
          {hasInterest && (
            <Field label="Interest Rate (% p.a.)">
              <Input type="number" value={values.interest_rate} onChange={(v) => set('interest_rate', v)} placeholder="7.1" step="0.01" min="0" max="25" />
            </Field>
          )}
          {hasMaturity && (
            <Field label="Maturity Date">
              <Input type="date" value={values.maturity_date} onChange={(v) => set('maturity_date', v)} />
            </Field>
          )}
          {hasLockIn && (
            <Field label="Lock-in Period (years)">
              <Input type="number" value={values.lock_in_years} onChange={(v) => set('lock_in_years', v)} placeholder="15" min="0" max="50" step="1" />
            </Field>
          )}
        </div>
      </FormSection>

      <FormSection>
        <Field label="Notes">
          <textarea
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            placeholder="Any additional details…"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white
              text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </Field>
      </FormSection>

      <SubmitRow loading={loading} success={success} apiError={apiError} label="Add Asset" />
    </form>
  );
}
