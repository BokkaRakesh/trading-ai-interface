// ============================================
// Price Chart Component - Single Responsibility
// Renders the interactive price chart
// ============================================

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useEffect, useState } from 'react';
import type { ChartDataPoint } from '../../types';
import { formatCurrency } from '../../utils/helpers';

interface PriceChartProps {
  data: ChartDataPoint[];
  type?: 'line' | 'area';
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-gray-400 text-xs">{label}</p>
        <p className="text-white font-semibold">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export function PriceChart({ data, type = 'area' }: PriceChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        {data.length === 0 ? 'No data available' : ''}
      </div>
    );
  }

  // Determine if trend is positive
  const isPositive = data.length > 1 
    ? data[data.length - 1].price >= data[0].price 
    : true;

  const chartColor = isPositive ? '#22c55e' : '#ef4444';
  const gradientId = 'priceGradient';

  if (type === 'line') {
    return (
      <div style={{ width: '100%', minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 1, height: 280 }}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280" 
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#6b7280" 
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="price"
            stroke={chartColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: chartColor }}
          />
        </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 1, height: 280 }}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280" 
          fontSize={12}
          tickLine={false}
        />
        <YAxis 
          stroke="#6b7280" 
          fontSize={12}
          tickLine={false}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="price"
          stroke={chartColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          activeDot={{ r: 4, fill: chartColor }}
        />
      </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
