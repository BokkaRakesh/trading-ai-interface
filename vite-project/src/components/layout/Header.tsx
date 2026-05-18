// ============================================
// Header Component - Top Navigation Bar
// Responsive: Hamburger menu on mobile
// ============================================

import { Bell, Search, User, Menu } from 'lucide-react';
import { useUIStore } from '../../stores';

export function Header() {
  const { toggleMobileMenu } = useUIStore();

  return (
    <header className="h-14 sm:h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-3 sm:px-4 md:px-6 shrink-0 w-full gap-2 sm:gap-4">
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search - hidden on small mobile, visible on larger screens */}
      <div className="flex-1 max-w-md min-w-0 hidden sm:block">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search markets, assets..."
            className="w-full pl-4 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
          />
        </div>
      </div>

      {/* Mobile Search Icon */}
      <button className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors sm:hidden">
        <Search className="w-5 h-5" />
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-2 p-1.5 sm:p-2 rounded-lg hover:bg-gray-800 transition-colors">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
        </button>
      </div>
    </header>
  );
}
