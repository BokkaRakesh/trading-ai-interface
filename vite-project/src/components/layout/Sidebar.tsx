// ============================================
// Sidebar Component - Navigation
// ============================================

import { 
  LayoutDashboard, 
  MessageCircle, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet
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
  { icon: Settings, label: 'Settings', page: 'settings' },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, currentPage, setCurrentPage } = useUIStore();

  return (
    <aside
      className={cn(
        'sticky top-0 h-screen bg-gray-900 border-r border-gray-800 shrink-0',
        'flex flex-col transition-all duration-300 z-50',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {sidebarOpen && (
          <span className="text-xl font-bold text-white tracking-tight">TradingAI</span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
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
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  currentPage === item.page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {sidebarOpen && (
        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center font-medium">
            © 2024 TradingAI
          </p>
        </div>
      )}
    </aside>
  );
}
