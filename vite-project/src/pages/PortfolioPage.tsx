// ============================================
// Portfolio Page - Asset Management View
// ============================================

import { useState } from 'react';
import { 
  Wallet, 
  Lightbulb,
} from 'lucide-react';
// @ts-ignore — JS component, no type declarations
import InvestmentAdvisor from '../components/InvestmentAdvisor';
// @ts-ignore
import PortfolioTab from '../components/portfolio/PortfolioTab';

// Mock portfolio data — no longer needed (PortfolioTab uses mockPortfolioData.js)

export function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'advisor'>('portfolio');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Portfolio</h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">Track assets and optimise your spending</p>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-xl p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'portfolio' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            Holdings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advisor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'advisor' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Invest Smarter
          </button>
        </div>
      </div>

      {activeTab === 'advisor' && <InvestmentAdvisor />}

      {/* Portfolio tab content */}
      {activeTab === 'portfolio' && (
        // @ts-ignore
        <PortfolioTab householdId="household_rakesh" />
      )}
    </div>
  );
}
