// ============================================
// Trading Store - Zustand State Management
// Single Responsibility: Manage trading/chart state
// ============================================

import { create } from 'zustand';
import type { TradingState, ChartTimeframe, IMarketDataService } from '../types';
import { mockMarketService } from '../services';

interface TradingStore extends TradingState {
  // Actions
  setTimeframe: (timeframe: ChartTimeframe) => Promise<void>;
  setSymbol: (symbol: string) => Promise<void>;
  refreshData: () => Promise<void>;
  setMarketService: (service: IMarketDataService) => void;
}

// Store internal state
let marketService: IMarketDataService = mockMarketService;

export const useTradingStore = create<TradingStore>((set, get) => ({
  currentPrice: 45000,
  priceChange: 0,
  priceChangePercent: 0,
  chartData: [],
  timeframe: '1M',
  symbol: 'BTC/USD',

  setTimeframe: async (timeframe: ChartTimeframe) => {
    set({ timeframe });
    await get().refreshData();
  },

  setSymbol: async (symbol: string) => {
    set({ symbol });
    await get().refreshData();
  },

  refreshData: async () => {
    const { symbol, timeframe } = get();
    
    try {
      const [chartData, priceData] = await Promise.all([
        marketService.getMarketData(symbol, timeframe),
        marketService.getCurrentPrice(symbol),
      ]);

      set({
        chartData,
        currentPrice: priceData.price,
        priceChange: priceData.change,
        priceChangePercent: priceData.changePercent,
      });
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  },

  setMarketService: (service: IMarketDataService) => {
    marketService = service;
  },
}));
