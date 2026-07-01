// ============================================
// Charts Page - Advanced Charting View
// Multiple chart types and technical indicators
// ============================================

import { useState } from 'react';
import { 
  BarChart3, 
  CandlestickChart, 
  LineChart, 
  TrendingUp,
  TrendingDown,
  Activity,
  Layers
} from 'lucide-react';
import { Card, Badge, Button } from '../components/ui';
import { PriceChart } from '../components/chart';
import { useTradingStore } from '../stores';
import { formatCurrency, formatPercent, cn } from '../utils/helpers';

type ChartType = 'area' | 'line' | 'candlestick';

const symbols = [
  { name: 'BTC/USD', price: 45234.56, change: 2.34 },
  { name: 'ETH/USD', price: 2456.78, change: -1.23 },
  { name: 'SOL/USD', price: 98.45, change: 5.67 },
  { name: 'XRP/USD', price: 0.5234, change: -0.45 },
  { name: 'ADA/USD', price: 0.4567, change: 3.21 },
];

const indicators = [
  { name: 'RSI', value: '54.32', status: 'neutral' },
  { name: 'MACD', value: '+123.45', status: 'bullish' },
  { name: 'MA(20)', value: '44,892', status: 'bullish' },
  { name: 'MA(50)', value: '43,567', status: 'bearish' },
  { name: 'Volume', value: '2.3B', status: 'neutral' },
];

export function ChartsPage() {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  const { chartData, currentPrice, priceChange, priceChangePercent } = useTradingStore();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Advanced Charts</h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">Technical analysis and market data</p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <Button
            variant={chartType === 'area' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setChartType('area')}
          >
            <Activity className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Area</span>
          </Button>
          <Button
            variant={chartType === 'line' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setChartType('line')}
          >
            <LineChart className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Line</span>
          </Button>
          <Button
            variant={chartType === 'candlestick' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setChartType('candlestick')}
          >
            <CandlestickChart className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Candle</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Symbol List */}
        <div className="md:col-span-1 lg:col-span-3 order-2 md:order-1">
          <Card className="h-full">
            <div className="p-3 sm:p-4 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                Watchlist
              </h3>
            </div>
            <div className="p-2 flex md:block gap-2 overflow-x-auto md:overflow-visible">
              {symbols.map((symbol) => (
                <button
                  key={symbol.name}
                  onClick={() => setSelectedSymbol(symbol.name)}
                  className={cn(
                    'flex-shrink-0 md:w-full p-2 sm:p-3 rounded-lg text-left transition-colors md:mb-1',
                    selectedSymbol === symbol.name
                      ? 'bg-blue-600/20 border border-blue-600/50'
                      : 'hover:bg-gray-800 border border-transparent'
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium text-sm">{symbol.name}</span>
                    <Badge variant={symbol.change >= 0 ? 'success' : 'danger'}>
                      {symbol.change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {formatPercent(symbol.change)}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-xs mt-1 font-mono">
                    {formatCurrency(symbol.price)}
                  </p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Main Chart */}
        <div className="md:col-span-1 lg:col-span-6 order-1 md:order-2">
          <Card className="h-full">
            <div className="p-3 sm:p-4 border-b border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">{selectedSymbol}</h3>
                  <div className="flex items-center gap-2 sm:gap-3 mt-1">
                    <span className="text-lg sm:text-2xl font-bold text-white font-mono">
                      {formatCurrency(currentPrice)}
                    </span>
                    <Badge variant={priceChange >= 0 ? 'success' : 'danger'}>
                      {priceChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {formatPercent(priceChangePercent)}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 overflow-x-auto">
                  {['1D', '1W', '1M', '3M', '1Y'].map((tf) => (
                    <button
                      key={tf}
                      className="px-2 sm:px-3 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors flex-shrink-0"
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-2 sm:p-4 h-[250px] sm:h-[300px] md:h-auto">
              <PriceChart data={chartData} type={chartType === 'candlestick' ? 'line' : chartType} />
            </div>
          </Card>
        </div>

        {/* Indicators Panel */}
        <div className="md:col-span-2 lg:col-span-3 order-3">
          <Card className="h-full">
            <div className="p-3 sm:p-4 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Technical Indicators
              </h3>
            </div>
            <div className="p-3 sm:p-4 grid grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4">
              {indicators.map((indicator) => (
                <div key={indicator.name} className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">{indicator.name}</span>
                  <span
                    className={cn(
                      'font-mono text-sm font-medium',
                      indicator.status === 'bullish' && 'text-green-400',
                      indicator.status === 'bearish' && 'text-red-400',
                      indicator.status === 'neutral' && 'text-gray-300'
                    )}
                  >
                    {indicator.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700">
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Market Sentiment</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 w-[65%]" />
                </div>
                <span className="text-green-400 text-sm font-medium">65%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Bullish sentiment based on indicators</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
