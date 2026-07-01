import { useState } from 'react';
import { Field, Input, Select, Checkbox, FormSection, SubmitRow, useAssetForm, createAsset, rules, formatINR } from './formHelpers';

const PROPERTY_TYPES = [
  { value: 'RESIDENTIAL', label: 'Residential (Flat / House / Villa)' },
  { value: 'COMMERCIAL', label: 'Commercial (Office / Shop)' },
  { value: 'LAND', label: 'Land / Plot' },
  { value: 'INDUSTRIAL', label: 'Industrial / Warehouse' },
  { value: 'AGRICULTURAL', label: 'Agricultural Land' },
];

const STEPS = ['Location', 'Property Details', 'Financials', 'Review'];

export default function RealEstateForm({ householdId, onSuccess }) {
  const [step, setStep] = useState(0);

  const INIT = {
    property_type: 'RESIDENTIAL', address_line1: '', address_line2: '', city: '',
    state: '', country: 'India', pincode: '', total_area_sqft: '', built_up_area_sqft: '',
    carpet_area_sqft: '', registration_number: '', purchase_price: '', purchase_date: '',
    current_value: '', is_under_loan: false, loan_outstanding: '', loan_emi: '',
    loan_interest_rate: '', loan_maturity_date: '', lender_name: '',
    is_rented: false, monthly_rent: '', notes: '',
  };

  const STEP_RULES = [
    {
      city: rules.required('City'),
      state: rules.required('State'),
      address_line1: rules.required('Address'),
    },
    {
      property_type: rules.required('Property type'),
    },
    {
      purchase_price: rules.positiveNumber('Purchase price'),
      purchase_date: rules.notFuture('Purchase date'),
    },
    {},
  ];

  const { values, errors, loading, success, apiError, set, submit } = useAssetForm(INIT, async (v) => {
    const label = [v.property_type, v.city, v.state].filter(Boolean).join(', ');
    await createAsset(householdId, 'REAL_ESTATE', {
      asset_name: label,
      quantity: '1',
      purchase_price: v.purchase_price,
      purchase_date: v.purchase_date,
      notes: v.notes,
    }, {
      re_property_type: v.property_type,
      address_line1: v.address_line1,
      address_line2: v.address_line2,
      city: v.city,
      state: v.state,
      country: v.country || 'India',
      pincode: v.pincode,
      total_area_sqft: v.total_area_sqft || null,
      built_up_area_sqft: v.built_up_area_sqft || null,
      registration_number: v.registration_number || null,
      is_under_loan: v.is_under_loan,
      loan_outstanding: v.is_under_loan ? v.loan_outstanding : null,
      loan_emi: v.is_under_loan ? v.loan_emi : null,
      loan_interest_rate: v.is_under_loan ? v.loan_interest_rate : null,
      loan_maturity_date: v.is_under_loan ? v.loan_maturity_date : null,
      lender_name: v.is_under_loan ? v.lender_name : null,
      is_rented: v.is_rented,
      monthly_rent: v.is_rented ? v.monthly_rent : null,
    });
    onSuccess?.();
  });

  function nextStep(e) {
    e.preventDefault();
    // validate current step
    const hasError = Object.keys(STEP_RULES[step]).some((field) => {
      const rule = STEP_RULES[step][field];
      return !!rule(values[field], values);
    });
    if (!hasError) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function finalSubmit(e) {
    e.preventDefault();
    submit(STEP_RULES[2]);
  }

  return (
    <form onSubmit={step < STEPS.length - 1 ? nextStep : finalSubmit} className="space-y-5">
      {/* Step indicators */}
      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => i < step && setStep(i)}
            className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors
              ${i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-green-700 text-white cursor-pointer' : 'bg-gray-800 text-gray-500 cursor-default'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Step 0 — Location */}
      {step === 0 && (
        <FormSection title="Location">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Address Line 1" error={errors.address_line1} required>
              <Input value={values.address_line1} onChange={(v) => set('address_line1', v)} placeholder="Flat/House No, Society name" />
            </Field>
            <Field label="Address Line 2">
              <Input value={values.address_line2} onChange={(v) => set('address_line2', v)} placeholder="Street, Locality" />
            </Field>
            <Field label="City" error={errors.city} required>
              <Input value={values.city} onChange={(v) => set('city', v)} placeholder="Hyderabad" />
            </Field>
            <Field label="State" error={errors.state} required>
              <Input value={values.state} onChange={(v) => set('state', v)} placeholder="Telangana" />
            </Field>
            <Field label="PIN Code">
              <Input value={values.pincode} onChange={(v) => set('pincode', v)} placeholder="500001" maxLength={6} />
            </Field>
            <Field label="Country">
              <Input value={values.country} onChange={(v) => set('country', v)} placeholder="India" />
            </Field>
          </div>
        </FormSection>
      )}

      {/* Step 1 — Property details */}
      {step === 1 && (
        <FormSection title="Property Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Property Type" error={errors.property_type} required>
              <Select value={values.property_type} onChange={(v) => set('property_type', v)} options={PROPERTY_TYPES} />
            </Field>
            <Field label="Registration Number">
              <Input value={values.registration_number} onChange={(v) => set('registration_number', v)} placeholder="Sale deed registration no." />
            </Field>
            <Field label="Total Area (sqft)">
              <Input type="number" value={values.total_area_sqft} onChange={(v) => set('total_area_sqft', v)} placeholder="1200" min="1" />
            </Field>
            <Field label="Built-up Area (sqft)">
              <Input type="number" value={values.built_up_area_sqft} onChange={(v) => set('built_up_area_sqft', v)} placeholder="950" min="1" />
            </Field>
          </div>
        </FormSection>
      )}

      {/* Step 2 — Financials */}
      {step === 2 && (
        <>
          <FormSection title="Purchase Financials">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Purchase Price (₹)" error={errors.purchase_price} required>
                <Input type="number" value={values.purchase_price} onChange={(v) => set('purchase_price', v)} placeholder="5000000" min="1" />
              </Field>
              <Field label="Purchase Date" error={errors.purchase_date} required>
                <Input type="date" value={values.purchase_date} onChange={(v) => set('purchase_date', v)} max={new Date().toISOString().split('T')[0]} />
              </Field>
              <Field label="Current Estimated Value (₹)" hint="Leave blank if unknown">
                <Input type="number" value={values.current_value} onChange={(v) => set('current_value', v)} placeholder="6500000" min="0" />
              </Field>
            </div>
          </FormSection>
          <FormSection title="Loan Details">
            <Checkbox checked={values.is_under_loan} onChange={(v) => set('is_under_loan', v)} label="This property has an active home loan" />
            {values.is_under_loan && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <Field label="Loan Outstanding (₹)">
                  <Input type="number" value={values.loan_outstanding} onChange={(v) => set('loan_outstanding', v)} placeholder="3000000" min="0" />
                </Field>
                <Field label="Monthly EMI (₹)">
                  <Input type="number" value={values.loan_emi} onChange={(v) => set('loan_emi', v)} placeholder="28500" min="0" />
                </Field>
                <Field label="Interest Rate (%)" >
                  <Input type="number" value={values.loan_interest_rate} onChange={(v) => set('loan_interest_rate', v)} placeholder="8.5" step="0.01" min="0" max="25" />
                </Field>
                <Field label="Loan Maturity Date">
                  <Input type="date" value={values.loan_maturity_date} onChange={(v) => set('loan_maturity_date', v)} />
                </Field>
                <Field label="Lender Name">
                  <Input value={values.lender_name} onChange={(v) => set('lender_name', v)} placeholder="HDFC Bank" />
                </Field>
              </div>
            )}
          </FormSection>
          <FormSection title="Rental Income">
            <Checkbox checked={values.is_rented} onChange={(v) => set('is_rented', v)} label="This property is currently rented out" />
            {values.is_rented && (
              <div className="mt-3">
                <Field label="Monthly Rent (₹)">
                  <Input type="number" value={values.monthly_rent} onChange={(v) => set('monthly_rent', v)} placeholder="25000" min="0" />
                </Field>
              </div>
            )}
          </FormSection>
        </>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <FormSection title="Review">
          <div className="space-y-2 text-sm">
            {[
              ['Type', values.property_type],
              ['Location', [values.address_line1, values.city, values.state].filter(Boolean).join(', ')],
              ['Area', values.total_area_sqft ? `${values.total_area_sqft} sqft` : '—'],
              ['Purchase Price', values.purchase_price ? `₹${formatINR(values.purchase_price)}` : '—'],
              ['Purchase Date', values.purchase_date || '—'],
              ['Loan', values.is_under_loan ? `₹${formatINR(values.loan_outstanding)} outstanding` : 'None'],
              ['Rented', values.is_rented ? `₹${formatINR(values.monthly_rent)}/mo` : 'No'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">{label}</span>
                <span className="text-white font-medium">{val}</span>
              </div>
            ))}
          </div>
          <Field label="Notes (optional)" hint="Condition, plans, remarks">
            <textarea
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="e.g. Society maintenance ₹3,500/month. Planning to sell in 2028."
              rows={3}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm
                placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </Field>
        </FormSection>
      )}

      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors">
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors">
            Next: {STEPS[step + 1]}
          </button>
        ) : (
          <SubmitRow loading={loading} success={success} apiError={apiError} label="Add Property" />
        )}
      </div>
    </form>
  );
}
