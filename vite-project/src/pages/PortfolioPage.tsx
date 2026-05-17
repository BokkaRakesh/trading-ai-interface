// ============================================
// Portfolio Page - Asset Management View
// ============================================

import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Percent
} from 'lucide-react';
import { Card, Badge } from '../components/ui';
import { formatCurrency, formatPercent, cn } from '../utils/helpers';

// Mock portfolio data
const portfolioAssets = [
  { symbol: 'BTC', name: 'Bitcoin', amount: 0.5234, value: 23456.78, change: 5.67, allocation: 45 },
  { symbol: 'ETH', name: 'Ethereum', amount: 4.5678, value: 11234.56, change: -2.34, allocation: 25 },
  { symbol: 'SOL', name: 'Solana', amount: 45.234, value: 4456.78, change: 8.92, allocation: 12 },
  { symbol: 'XRP', name: 'Ripple', amount: 5000, value: 2617.00, change: -0.45, allocation: 8 },
  { symbol: 'ADA', name: 'Cardano', amount: 3500, value: 1598.50, change: 3.21, allocation: 5 },
  { symbol: 'USDT', name: 'Tether', amount: 2000, value: 2000.00, change: 0, allocation: 5 },
];

const recentTransactions = [
  { type: 'buy', symbol: 'BTC', amount: 0.1, value: 4523.45, date: 'May 17, 2026' },
  { type: 'sell', symbol: 'ETH', amount: 1.5, value: 3678.90, date: 'May 16, 2026' },
  { type: 'buy', symbol: 'SOL', amount: 10, value: 985.60, date: 'May 15, 2026' },
  { type: 'buy', symbol: 'ADA', amount: 500, value: 228.50, date: 'May 14, 2026' },
];

const totalValue = portfolioAssets.reduce((acc, asset) => acc + asset.value, 0);
const totalChange = 3.45; // Mock total change

export function PortfolioPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Portfolio</h1>
        <p className="text-gray-400 text-sm mt-1">Track and manage your assets</p>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Value</p>
              <p className="text-xl font-bold text-white font-mono">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              totalChange >= 0 ? 'bg-green-600/20' : 'bg-red-600/20'
            )}>
              {totalChange >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">24h Change</p>
              <p className={cn(
                'text-xl font-bold font-mono',
                totalChange >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {formatPercent(totalChange)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Assets</p>
              <p className="text-xl font-bold text-white">{portfolioAssets.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Best Performer</p>
              <p className="text-xl font-bold text-green-400">SOL +8.92%</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Assets Table */}
        <div className="col-span-8">
          <Card>
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-500" />
                Your Assets
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase">Asset</th>
                    <th className="text-right p-4 text-xs font-semibold text-gray-400 uppercase">Holdings</th>
                    <th className="text-right p-4 text-xs font-semibold text-gray-400 uppercase">Value</th>
                    <th className="text-right p-4 text-xs font-semibold text-gray-400 uppercase">24h Change</th>
                    <th className="text-right p-4 text-xs font-semibold text-gray-400 uppercase">Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioAssets.map((asset) => (
                    <tr key={asset.symbol} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white">
                            {asset.symbol.charAt(0)}
                          </div>
                          <div>
                            <p className="text-white font-medium">{asset.symbol}</p>
                            <p className="text-xs text-gray-500">{asset.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-white font-mono">{asset.amount.toLocaleString()}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-white font-mono">{formatCurrency(asset.value)}</span>
                      </td>
                      <td className="p-4 text-right">
                        <Badge variant={asset.change >= 0 ? 'success' : 'danger'}>
                          {asset.change >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                          {formatPercent(asset.change)}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${asset.allocation}%` }}
                            />
                          </div>
                          <span className="text-gray-400 text-sm font-mono w-10">{asset.allocation}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Recent Transactions */}
        <div className="col-span-4">
          <Card className="h-full">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Recent Transactions
              </h3>
            </div>
            <div className="p-2">
              {recentTransactions.map((tx, i) => (
                <div key={i} className="p-3 hover:bg-gray-800 rounded-lg transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        tx.type === 'buy' ? 'bg-green-600/20' : 'bg-red-600/20'
                      )}>
                        {tx.type === 'buy' ? (
                          <ArrowDownRight className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {tx.type === 'buy' ? 'Bought' : 'Sold'} {tx.symbol}
                        </p>
                        <p className="text-xs text-gray-500">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'text-sm font-mono font-medium',
                        tx.type === 'buy' ? 'text-green-400' : 'text-red-400'
                      )}>
                        {tx.type === 'buy' ? '+' : '-'}{tx.amount} {tx.symbol}
                      </p>
                      <p className="text-xs text-gray-500">{formatCurrency(tx.value)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
