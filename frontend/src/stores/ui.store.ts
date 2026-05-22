import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar:    () => void;
  activeModal:      string | null;
  openModal:        (name: string) => void;
  closeModal:       () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  toggleSidebar:    () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  activeModal:      null,
  openModal:        (name) => set({ activeModal: name }),
  closeModal:       () => set({ activeModal: null }),
}));
