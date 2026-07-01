// ============================================
// Sidebar Component - Navigation
// Responsive: Drawer on mobile, sidebar on desktop
// ============================================

import { 
  LayoutDashboard, 
  MessageCircle, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet,
  ReceiptText,
  X
} from 'lucide-react';
import { useUIStore, type PageType } from '../../stores/uiStore';
import { cn } from '../../utils/helpers';

interface NavItem {
  icon: React.ElementType;
  label: string;
  page: PageType;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', page: 'dashboard' },
  { icon: BarChart3, label: 'Charts', page: 'charts' },
  { icon: MessageCircle, label: 'AI Chat', page: 'chat' },
  { icon: Wallet, label: 'Portfolio', page: 'portfolio' },
  { icon: ReceiptText, label: 'Expenses', page: 'expenses' },
  { icon: Settings, label: 'Settings', page: 'settings' },
];

export function Sidebar() {
  const { sidebarOpen, mobileMenuOpen, toggleSidebar, setMobileMenuOpen, currentPage, setCurrentPage } = useUIStore();

  return (
    <aside
      className={cn(
        'bg-gray-900 border-r border-gray-800 shrink-0',
        'flex flex-col transition-all duration-300 z-50',
        // Mobile: fixed drawer
        'fixed inset-y-0 left-0 lg:sticky lg:top-0 lg:h-screen',
        // Mobile visibility
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        // Width
        'w-64 lg:w-64',
        sidebarOpen ? 'lg:w-64' : 'lg:w-16'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {(sidebarOpen || mobileMenuOpen) && (
          <span className="text-xl font-bold text-white tracking-tight">TradingAI</span>
        )}
        {/* Close button for mobile */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
        {/* Toggle button for desktop */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:block p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => setCurrentPage(item.page)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg transition-colors',
                  currentPage === item.page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {(sidebarOpen || mobileMenuOpen) && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {(sidebarOpen || mobileMenuOpen) && (
        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center font-medium">
            © 2026 TradingAI
          </p>
        </div>
      )}
    </aside>
  );
}
