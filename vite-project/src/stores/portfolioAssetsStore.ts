// Session-added assets (e.g. via "Add with AI") merged into the
// mock portfolio so new holdings appear immediately in the UI.

import { create } from 'zustand';

export interface AddedAssetRecord {
  asset_id: string;
  asset_type: string;
  asset_name: string;
  quantity: number;
  purchase_price: number;
  purchase_value: number;
  purchase_date: string;
  current_price: number;
  current_value: number;
  gain_loss: number;
  roi_percent: number;
  broker?: string;
}

interface PortfolioAssetsState {
  addedAssets: AddedAssetRecord[];
  /** IDs of seed/mock assets the user deleted this session. */
  removedIds: string[];
  addAsset: (asset: AddedAssetRecord) => void;
  removeAsset: (assetId: string) => void;
}

export const usePortfolioAssetsStore = create<PortfolioAssetsState>((set) => ({
  addedAssets: [],
  removedIds: [],
  addAsset: (asset) => set((s) => ({ addedAssets: [...s.addedAssets, asset] })),
  removeAsset: (assetId) =>
    set((s) =>
      s.addedAssets.some((a) => a.asset_id === assetId)
        ? { addedAssets: s.addedAssets.filter((a) => a.asset_id !== assetId) }
        : { removedIds: [...s.removedIds, assetId] },
    ),
}));
