// ============================================
// UI Store - Global UI State
// ============================================

import { create } from 'zustand';

export type PageType = 'dashboard' | 'charts' | 'chat' | 'portfolio' | 'settings';

interface UIStore {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  currentPage: PageType;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setCurrentPage: (page: PageType) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  mobileMenuOpen: false,
  currentPage: 'dashboard',
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  
  setMobileMenuOpen: (open: boolean) => set({ mobileMenuOpen: open }),
  
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  
  setCurrentPage: (page: PageType) => set({ currentPage: page, mobileMenuOpen: false }),
}));
