// ============================================
// Price Display Component - Single Responsibility
// Shows current price and change
// ============================================

import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatPercent, cn } from '../../utils/helpers';
import { Badge } from '../ui';

interface PriceDisplayProps {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export function PriceDisplay({ symbol, price, change, changePercent }: PriceDisplayProps) {
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white">{symbol}</h2>
        <p className="text-3xl font-bold text-white mt-1">
          {formatCurrency(price)}
        </p>
      </div>
      
      <div className="text-right">
        <Badge variant={isPositive ? 'success' : 'danger'}>
          <TrendIcon className="w-3 h-3 mr-1" />
          {formatPercent(changePercent)}
        </Badge>
        <p
          className={cn(
            'text-sm mt-1',
            isPositive ? 'text-green-400' : 'text-red-400'
          )}
        >
          {isPositive ? '+' : ''}{formatCurrency(change)}
        </p>
      </div>
    </div>
  );
}
