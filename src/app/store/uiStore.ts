import { create } from 'zustand';

const MAX_RECENT_SEARCHES = 5;

interface UIState {
  selectedVenueFilters: { type?: string; city?: string; hasEvent?: boolean };
  setVenueFilters: (f: { type?: string; city?: string; hasEvent?: boolean }) => void;
  authRequiredOpen: boolean;
  openAuthRequired: () => void;
  closeAuthRequired: () => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
  recentSearches: string[];
  addRecentSearch: (q: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedVenueFilters: {},
  setVenueFilters: (f) => set({ selectedVenueFilters: f }),
  authRequiredOpen: false,
  openAuthRequired: () => set({ authRequiredOpen: true }),
  closeAuthRequired: () => set({ authRequiredOpen: false }),
  globalSearchQuery: '',
  setGlobalSearchQuery: (q) => set({ globalSearchQuery: q }),
  recentSearches: [],
  addRecentSearch: (q) =>
    set((s) => {
      const trimmed = q.trim();
      if (!trimmed) return s;
      const next = [trimmed, ...s.recentSearches.filter((x) => x !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
      return { recentSearches: next };
    }),
}));
