import { useEffect, useSyncExternalStore } from 'react';

import { type AvatarThread, fetchAvatarThreads } from './data';

/**
 * Lista de historias compartida por la barra lateral y el inicio: una sola
 * consulta y todos los componentes se actualizan a la vez.
 */
type State = { threads: AvatarThread[]; loaded: boolean; failed: boolean };
let state: State = { threads: [], loaded: false, failed: false };
const listeners = new Set<() => void>();
const set = (s: Partial<State>) => {
  state = { ...state, ...s };
  listeners.forEach((l) => l());
};

let inflight: Promise<void> | null = null;
export function refreshThreads(): Promise<void> {
  inflight ??= fetchAvatarThreads()
    .then((threads) => set({ threads, loaded: true, failed: false }))
    .catch(() => set({ loaded: true, failed: true }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Al cerrar sesión. */
export function resetThreads() {
  set({ threads: [], loaded: false, failed: false });
}

export function useThreads(autoload = true) {
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
  useEffect(() => {
    if (autoload && !state.loaded) refreshThreads();
  }, [autoload]);
  return { ...s, refresh: refreshThreads };
}
