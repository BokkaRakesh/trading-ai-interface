// ============================================
// Dashboard Page - Main Trading Dashboard
// Features resizable Trading Chart and AI Chat panels
// ============================================

import { ResizablePanel } from '../components/ui';
import { TradingDashboard } from '../components/chart';
import { ChatWindow } from '../components/chat';

export function DashboardPage() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <ResizablePanel
        leftPanel={<TradingDashboard />}
        rightPanel={<ChatWindow />}
        defaultLeftWidth={55}
        minLeftWidth={30}
        maxLeftWidth={70}
      />
    </div>
  );
}
