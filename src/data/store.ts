import { create } from 'zustand';

// Versión por tabla: cada escritura local la incrementa y los hooks que leen esa tabla se refrescan.
type DataVersionState = {
  versions: Record<string, number>;
  bump: (tables: string[]) => void;
};

export const useDataVersion = create<DataVersionState>((set) => ({
  versions: {},
  bump: (tables) =>
    set((s) => {
      const versions = { ...s.versions };
      for (const t of tables) versions[t] = (versions[t] ?? 0) + 1;
      return { versions };
    }),
}));

export function bumpTables(...tables: string[]) {
  useDataVersion.getState().bump(tables);
}

// Estado de sincronización para el banner.
type SyncState = {
  pending: number;
  lastSyncAt: number | null;
  syncing: boolean;
  lastError: string | null;
  set: (p: Partial<Omit<SyncState, 'set'>>) => void;
};

export const useSyncState = create<SyncState>((set) => ({
  pending: 0,
  lastSyncAt: null,
  syncing: false,
  lastError: null,
  set: (p) => set(p),
}));
