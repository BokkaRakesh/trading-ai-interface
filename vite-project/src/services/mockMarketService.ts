// ============================================
// Mock Market Data Service - Implements IMarketDataService
// Single Responsibility: Generate mock market data
// ============================================

import type { IMarketDataService, ChartDataPoint, ChartTimeframe } from '../types';
import { formatChartDate, randomBetween } from '../utils/helpers';

/**
 * Generates realistic-looking mock chart data
 */
const generateMockData = (
  days: number,
  basePrice: number,
  volatility: number
): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  let currentPrice = basePrice;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Generate OHLC data with realistic relationships
    const change = (Math.random() - 0.5) * volatility * currentPrice;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * volatility * currentPrice * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * currentPrice * 0.3;
    const volume = Math.floor(randomBetween(1000000, 5000000));

    data.push({
      date: formatChartDate(date),
      price: close,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  return data;
};

/**
 * Maps timeframe to number of days
 */
const timeframeToDays: Record<ChartTimeframe, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
};

/**
 * Mock Market Data Service Implementation
 */
class MockMarketService implements IMarketDataService {
  private basePrice = 45000; // Starting price (like BTC)
  private currentPriceValue = 45000;

  async getMarketData(
    _symbol: string,
    timeframe: ChartTimeframe
  ): Promise<ChartDataPoint[]> {
    const days = timeframeToDays[timeframe];
    const volatility = timeframe === '1D' ? 0.02 : 0.05;
    
    const data = generateMockData(days, this.basePrice, volatility);
    
    // Update current price based on last data point
    if (data.length > 0) {
      this.currentPriceValue = data[data.length - 1].price;
    }
    
    return data;
  }

  async getCurrentPrice(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _symbol: string
  ): Promise<{ price: number; change: number; changePercent: number }> {
    // Add some random fluctuation
    const fluctuation = (Math.random() - 0.5) * 100;
    const newPrice = this.currentPriceValue + fluctuation;
    const change = newPrice - this.basePrice;
    const changePercent = (change / this.basePrice) * 100;

    return {
      price: newPrice,
      change,
      changePercent,
    };
  }
}

// Export singleton instance
export const mockMarketService: IMarketDataService = new MockMarketService();
