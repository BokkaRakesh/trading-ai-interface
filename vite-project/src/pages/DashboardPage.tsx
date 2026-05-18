// ============================================
// Dashboard Page - Main Trading Dashboard
// Features resizable Trading Chart and AI Chat panels
// Responsive: Stacked on mobile, side-by-side on desktop
// ============================================

import { ResizablePanel } from '../components/ui';
import { TradingDashboard } from '../components/chart';
import { ChatWindow } from '../components/chat';

export function DashboardPage() {
  return (
    <>
      {/* Mobile: Stacked layout with proper scrolling */}
      <div className="flex flex-col gap-4 lg:hidden">
        <div className="flex-shrink-0" style={{ height: '60vh', minHeight: '350px' }}>
          <TradingDashboard />
        </div>
        <div className="flex-shrink-0" style={{ height: '50vh', minHeight: '300px' }}>
          <ChatWindow />
        </div>
      </div>

      {/* Desktop: Resizable panels */}
      <div className="hidden lg:block h-[calc(100vh-8rem)]">
        <ResizablePanel
          leftPanel={<TradingDashboard />}
          rightPanel={<ChatWindow />}
          defaultLeftWidth={55}
          minLeftWidth={30}
          maxLeftWidth={70}
        />
      </div>
    </>
  );
}
