// ============================================
// Services Index - Dependency Inversion Pattern
// Exports service instances through interfaces
// Easy to swap implementations (mock → real API)
// ============================================

export { mockAIService } from './mockAIService';
export { mockMarketService } from './mockMarketService';

// Re-export types for convenience
export type { IAIService, IMarketDataService } from '../types';
