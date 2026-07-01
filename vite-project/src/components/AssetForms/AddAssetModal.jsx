import { useState } from 'react';
import { X } from 'lucide-react';
import StockForm from './StockForm';
import MutualFundForm from './MutualFundForm';
import ETFForm from './ETFForm';
import REITForm from './REITForm';
import GoldForm from './GoldForm';
import SilverForm from './SilverForm';
import RealEstateForm from './RealEstateForm';
import BondForm from './BondForm';
import FixedDepositForm from './FixedDepositForm';
import OtherAssetForm from './OtherAssetForm';

const ASSET_TYPES = [
  { value: 'STOCK',       label: 'Stock',           icon: '📈', desc: 'NSE/BSE listed equity shares' },
  { value: 'MF',          label: 'Mutual Fund',     icon: '📊', desc: 'Equity, debt, hybrid schemes' },
  { value: 'ETF',         label: 'ETF',             icon: '🏦', desc: 'Exchange traded funds' },
  { value: 'REIT',        label: 'REIT',            icon: '🏢', desc: 'Real estate investment trusts' },
  { value: 'GOLD',        label: 'Gold',            icon: '🥇', desc: 'Physical, digital, SGB, ETF' },
  { value: 'SILVER',      label: 'Silver',          icon: '🥈', desc: 'Bullion, coins, ETF' },
  { value: 'REAL_ESTATE', label: 'Real Estate',     icon: '🏠', desc: 'Property, land, commercial' },
  { value: 'BOND',        label: 'Bond',            icon: '📜', desc: 'Govt, PSU, corporate bonds' },
  { value: 'FD',          label: 'Fixed Deposit',   icon: '🏛️', desc: 'Bank FD, post office schemes' },
  { value: 'OTHER',       label: 'Other Asset',     icon: '💼', desc: 'PPF, NPS, crypto, unlisted equity' },
];

const FORM_MAP = {
  STOCK: StockForm,
  MF: MutualFundForm,
  ETF: ETFForm,
  REIT: REITForm,
  GOLD: GoldForm,
  SILVER: SilverForm,
  REAL_ESTATE: RealEstateForm,
  BOND: BondForm,
  FD: FixedDepositForm,
  OTHER: OtherAssetForm,
};

/**
 * AddAssetModal
 *
 * Props:
 *   householdId  — string (required)
 *   onClose      — () => void
 *   onSuccess    — () => void  (called after successful submission)
 */
export default function AddAssetModal({ householdId, onClose, onSuccess }) {
  const [selectedType, setSelectedType] = useState(null);

  const FormComponent = selectedType ? FORM_MAP[selectedType] : null;
  const typeInfo = ASSET_TYPES.find((t) => t.value === selectedType);

  function handleSuccess() {
    onSuccess?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gray-850 border border-gray-700 rounded-2xl shadow-2xl
        w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
        style={{ backgroundColor: '#111827' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 rounded-t-2xl px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-white">
              {selectedType ? `Add ${typeInfo?.label}` : 'Add Asset'}
            </h2>
            {selectedType && (
              <p className="text-xs text-gray-400 mt-0.5">{typeInfo?.desc}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedType && (
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded-md hover:bg-gray-700 transition-colors"
              >
                ← Change type
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Type selector */}
          {!selectedType && (
            <div>
              <p className="text-sm text-gray-400 mb-4">Select the type of asset you want to add:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ASSET_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setSelectedType(t.value)}
                    className="flex flex-col items-start p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700
                      hover:border-blue-600 rounded-xl transition-all text-left group"
                  >
                    <span className="text-2xl mb-1.5">{t.icon}</span>
                    <span className="text-sm font-semibold text-white group-hover:text-blue-300">
                      {t.label}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5 leading-tight">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected form */}
          {FormComponent && (
            <FormComponent
              householdId={householdId}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
