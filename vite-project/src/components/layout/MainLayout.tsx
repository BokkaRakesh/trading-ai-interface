// ============================================
// Main Layout Component - Composition
// Provides the overall page structure
// Responsive: Mobile-first with desktop sidebar
// ============================================

import { useUIStore } from '../../stores';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { mobileMenuOpen, setMobileMenuOpen } = useUIStore();

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile, visible on desktop */}
      <Sidebar />

      {/* Main Content Area - flex-1 takes remaining space */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content - responsive padding, scrollable */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
