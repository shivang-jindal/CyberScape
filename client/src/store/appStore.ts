import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SortOrder = 'name' | 'risk';
export type Density = 'comfortable' | 'compact';

export interface CatalogFilters {
  q: string;
  category: string;
  region: string;
  status: string;
  sort: SortOrder;
}

export interface SimulationPrefill {
  action?: string;
  targetId?: string;
}

interface AppState {
  filters: CatalogFilters;
  selectedId: string | null;
  density: Density;
  reduceMotion: boolean;
  favoriteIds: string[];
  simulationPrefill: SimulationPrefill | null;
  setFilters: (patch: Partial<CatalogFilters>) => void;
  resetFilters: () => void;
  select: (id: string | null) => void;
  setDensity: (density: Density) => void;
  setReduceMotion: (reduceMotion: boolean) => void;
  toggleFavorite: (id: string) => void;
  setSimulationPrefill: (prefill: SimulationPrefill | null) => void;
  resetWorkspace: () => void;
}

const DEFAULT_FILTERS: CatalogFilters = {
  q: '',
  category: '',
  region: '',
  status: '',
  sort: 'name'
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      filters: DEFAULT_FILTERS,
      selectedId: null,
      density: 'comfortable',
      reduceMotion: false,
      favoriteIds: [],
      simulationPrefill: null,

      setFilters: (patch) =>
        set((state) => ({
          filters: {
            ...state.filters,
            ...patch
          }
        })),

      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      select: (id) => set({ selectedId: id }),

      setDensity: (density) => set({ density }),

      setReduceMotion: (reduceMotion) => set({ reduceMotion }),

      toggleFavorite: (id) =>
        set((state) => ({
          favoriteIds: state.favoriteIds.includes(id)
            ? state.favoriteIds.filter((favorite) => favorite !== id)
            : [...state.favoriteIds, id]
        })),

      setSimulationPrefill: (simulationPrefill) => set({ simulationPrefill }),

      resetWorkspace: () =>
        set({
          filters: DEFAULT_FILTERS,
          selectedId: null,
          density: 'comfortable',
          reduceMotion: false,
          favoriteIds: [],
          simulationPrefill: null
        })
    }),
    {
      name: 'cyberscape-workspace',
      partialize: (state) => ({
        density: state.density,
        reduceMotion: state.reduceMotion,
        favoriteIds: state.favoriteIds
      })
    }
  )
);
