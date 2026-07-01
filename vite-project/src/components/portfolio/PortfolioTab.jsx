import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, RefreshCw, AlertTriangle } from 'lucide-react';
import PortfolioHeader from './PortfolioHeader';
import AllocationTable from './AllocationTable';
import AssetList from './AssetList';
import PerformanceChart from './PerformanceChart';
import TopPerformers from './TopPerformers';
import { AddAssetModal } from '../AssetForms';
import { useMockPortfolio } from '../../services/mockPortfolioData';

/**
 * PortfolioTab
 *
 * Props:
 *   householdId    — string, defaults to 'household_rakesh'
 *   onAssetClick   — (assetId: string) => void  (for routing to detail page)
 */
export default function PortfolioTab({ householdId = 'household_rakesh', onAssetClick }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Use mock data until the API is live.
  // To use real API: replace useMockPortfolio() with an API-backed hook.
  const { summary, assets, performance } = useMockPortfolio();

  function refresh() { setRefreshTick((t) => t + 1); }

  function handleDelete(assetId) {
    if (!window.confirm('Delete this asset? This action cannot be undone.')) return;
    // TODO: call portfolioApi.deleteAsset(assetId).then(refresh)
    alert(`Asset ${assetId} would be deleted (API not connected yet).`);
  }

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Holdings</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {assets?.length ?? 0} asset{assets?.length !== 1 ? 's' : ''} across {
              new Set(assets?.map((a) => a.asset_type)).size
            } categories
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400
              hover:text-white hover:bg-gray-700 border border-gray-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => alert('Statement upload — API integration pending.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400
              hover:text-white hover:bg-gray-700 border border-gray-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Statement
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium
              bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Asset
          </button>
        </div>
      </div>

      {/* Header summary */}
      <PortfolioHeader summary={summary} />

      {/* Top performers */}
      <TopPerformers topGainers={summary?.top_gainers} topLosers={summary?.top_losers} />

      {/* Allocation breakdown table */}
      <AllocationTable
        breakdown={summary?.asset_class_breakdown}
        assets={assets}
        onAssetClick={onAssetClick}
      />

      {/* Full asset list */}
      <AssetList
        assets={assets}
        onAssetClick={onAssetClick}
        onDelete={handleDelete}
      />

      {/* Performance chart */}
      <PerformanceChart performance={performance} />

      {/* Add asset modal */}
      {showAddModal && (
        <AddAssetModal
          householdId={householdId}
          onClose={() => setShowAddModal(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
