// ============================================
// Trading Dashboard Component - Composition
// Composes all trading-related components
// ============================================

import { useEffect } from 'react';
import { useTradingStore } from '../../stores';
import { Card } from '../ui';
import { PriceDisplay } from './PriceDisplay';
import { PriceChart } from './PriceChart';
import { TimeframeSelector } from './TimeframeSelector';
import { BarChart3 } from 'lucide-react';

export function TradingDashboard() {
  const {
    symbol,
    currentPrice,
    priceChange,
    priceChangePercent,
    chartData,
    timeframe,
    setTimeframe,
    refreshData,
  } = useTradingStore();

  // Fetch initial data
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-white">Trading Dashboard</h2>
        </div>
        <TimeframeSelector selected={timeframe} onSelect={setTimeframe} />
      </div>

      {/* Price Info */}
      <div className="px-4 py-4 border-b border-gray-700">
        <PriceDisplay
          symbol={symbol}
          price={currentPrice}
          change={priceChange}
          changePercent={priceChangePercent}
        />
      </div>

      {/* Chart */}
      <div className="flex-1 px-4 py-4">
        <PriceChart data={chartData} />
      </div>
    </Card>
  );
}
