// ============================================
// Timeframe Selector Component - Single Responsibility
// Allows switching between chart timeframes
// ============================================

import type { ChartTimeframe } from '../../types';
import { cn } from '../../utils/helpers';

interface TimeframeSelectorProps {
  selected: ChartTimeframe;
  onSelect: (timeframe: ChartTimeframe) => void;
}

const timeframes: ChartTimeframe[] = ['1D', '1W', '1M', '3M', '1Y'];

export function TimeframeSelector({ selected, onSelect }: TimeframeSelectorProps) {
  return (
    <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
      {timeframes.map((tf) => (
        <button
          key={tf}
          onClick={() => onSelect(tf)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            selected === tf
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          )}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
