// ============================================
// UI Store - Global UI State
// ============================================

import { create } from 'zustand';

export type PageType = 'dashboard' | 'charts' | 'chat' | 'portfolio' | 'settings';

interface UIStore {
  sidebarOpen: boolean;
  currentPage: PageType;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentPage: (page: PageType) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  currentPage: 'dashboard',
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  
  setCurrentPage: (page: PageType) => set({ currentPage: page }),
}));
