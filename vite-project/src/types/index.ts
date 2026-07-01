// ============================================
// Core Type Definitions - Interface Segregation Principle
// Small, specific interfaces for different concerns
// ============================================

// Chat Types
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

// Trading/Chart Types
export type ChartTimeframe = '1D' | '1W' | '1M' | '3M' | '1Y';

export interface MarketDataPoint {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartDataPoint {
  date: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface TradingState {
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  chartData: ChartDataPoint[];
  timeframe: ChartTimeframe;
  symbol: string;
}

// AI Response Types
export interface AIResponse {
  content: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  confidence?: number;
}

// Component Props Interfaces - Dependency Inversion
export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  disabled?: boolean;
  className?: string;
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

// Service Interfaces - Dependency Inversion Principle
export interface IAIService {
  generateResponse(message: string, context?: Message[]): Promise<AIResponse>;
}

export interface IMarketDataService {
  getMarketData(symbol: string, timeframe: ChartTimeframe): Promise<ChartDataPoint[]>;
  getCurrentPrice(symbol: string): Promise<{ price: number; change: number; changePercent: number }>;
}
