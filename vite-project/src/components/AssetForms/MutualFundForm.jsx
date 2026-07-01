import { useState } from 'react';
import { Field, Input, Select, Checkbox, FormSection, TotalCost, SubmitRow, useAssetForm, createAsset, rules } from './formHelpers';

const SCHEME_TYPES = [
  { value: 'EQUITY', label: 'Equity' },
  { value: 'DEBT', label: 'Debt' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'ELSS', label: 'ELSS (Tax Saver)' },
  { value: 'INDEX', label: 'Index Fund' },
  { value: 'LIQUID', label: 'Liquid / Overnight' },
  { value: 'INTERNATIONAL', label: 'International' },
  { value: 'GOLD', label: 'Gold Fund' },
  { value: 'FOF', label: 'Fund of Funds' },
];

const SIP_FREQUENCIES = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
];

const VALIDATION = {
  asset_name: rules.required('Scheme name'),
  quantity: rules.positiveNumber('Units'),
  nav_at_purchase: rules.positiveNumber('NAV at purchase'),
  purchase_date: rules.notFuture('Purchase date'),
};

export default function MutualFundForm({ householdId, onSuccess }) {
  const INIT = {
    asset_name: '', scheme_code: '', isin: '', fund_house: '', folio_number: '',
    scheme_type: 'EQUITY', quantity: '', nav_at_purchase: '', purchase_date: '',
    is_sip: false, sip_amount: '', sip_frequency: 'MONTHLY', sip_start_date: '', notes: '',
  };

  const { values, errors, loading, success, apiError, set, submit } = useAssetForm(INIT, async (v) => {
    await createAsset(householdId, 'MF', {
      asset_name: v.asset_name,
      quantity: v.quantity,
      purchase_price: v.nav_at_purchase,
      purchase_date: v.purchase_date,
      purchase_value: v.quantity * v.nav_at_purchase,
      notes: v.notes,
    }, {
      scheme_name: v.asset_name,
      scheme_code: v.scheme_code,
      isin: v.isin,
      fund_house: v.fund_house,
      folio_number: v.folio_number,
      scheme_type: v.scheme_type,
      nav_at_purchase: v.nav_at_purchase,
      sip_status: v.is_sip ? 'ACTIVE' : 'NONE',
      sip_amount: v.is_sip ? v.sip_amount : null,
      sip_frequency: v.is_sip ? v.sip_frequency : null,
      sip_start_date: v.is_sip ? v.sip_start_date : null,
    });
    onSuccess?.();
  });

  const sipRules = values.is_sip ? {
    sip_amount: rules.positiveNumber('SIP amount'),
    sip_start_date: rules.notFuture('SIP start date'),
  } : {};

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit({ ...VALIDATION, ...sipRules }); }} className="space-y-5">
      <FormSection title="Fund Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Scheme Name" error={errors.asset_name} required>
            <Input value={values.asset_name} onChange={(v) => set('asset_name', v)} placeholder="e.g. Parag Parikh Flexi Cap — Direct Growth" />
          </Field>
          <Field label="Fund House">
            <Input value={values.fund_house} onChange={(v) => set('fund_house', v)} placeholder="e.g. PPFAS Mutual Fund" />
          </Field>
          <Field label="AMFI Scheme Code" hint="6-digit code from amfiindia.com">
            <Input value={values.scheme_code} onChange={(v) => set('scheme_code', v)} placeholder="122639" />
          </Field>
          <Field label="ISIN">
            <Input value={values.isin} onChange={(v) => set('isin', v.toUpperCase())} placeholder="INF879O01027" />
          </Field>
          <Field label="Folio Number">
            <Input value={values.folio_number} onChange={(v) => set('folio_number', v)} placeholder="4567890" />
          </Field>
          <Field label="Scheme Type">
            <Select value={values.scheme_type} onChange={(v) => set('scheme_type', v)} options={SCHEME_TYPES} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Purchase Details">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Units" error={errors.quantity} required>
            <Input type="number" value={values.quantity} onChange={(v) => set('quantity', v)} placeholder="32.456" step="0.001" min="0.001" />
          </Field>
          <Field label="NAV at Purchase (₹)" error={errors.nav_at_purchase} required>
            <Input type="number" value={values.nav_at_purchase} onChange={(v) => set('nav_at_purchase', v)} placeholder="92.43" step="0.01" min="0.01" />
          </Field>
          <Field label="Purchase Date" error={errors.purchase_date} required>
            <Input type="date" value={values.purchase_date} onChange={(v) => set('purchase_date', v)} max={new Date().toISOString().split('T')[0]} />
          </Field>
        </div>
        <TotalCost quantity={values.quantity} price={values.nav_at_purchase} label="Total invested" />
      </FormSection>

      <FormSection title="SIP Details">
        <Checkbox checked={values.is_sip} onChange={(v) => set('is_sip', v)} label="This is part of an active SIP" />
        {values.is_sip && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <Field label="Monthly SIP Amount (₹)" error={errors.sip_amount} required>
              <Input type="number" value={values.sip_amount} onChange={(v) => set('sip_amount', v)} placeholder="3000" min="100" />
            </Field>
            <Field label="Frequency">
              <Select value={values.sip_frequency} onChange={(v) => set('sip_frequency', v)} options={SIP_FREQUENCIES} />
            </Field>
            <Field label="SIP Start Date" error={errors.sip_start_date} required>
              <Input type="date" value={values.sip_start_date} onChange={(v) => set('sip_start_date', v)} max={new Date().toISOString().split('T')[0]} />
            </Field>
          </div>
        )}
      </FormSection>

      <SubmitRow loading={loading} success={success} apiError={apiError} label="Add Mutual Fund" />
    </form>
  );
}
