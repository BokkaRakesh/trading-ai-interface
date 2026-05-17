// ============================================
// Main Layout Component - Composition
// Provides the overall page structure
// ============================================

import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar - part of flex flow, not fixed */}
      <Sidebar />

      {/* Main Content Area - flex-1 takes remaining space */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
