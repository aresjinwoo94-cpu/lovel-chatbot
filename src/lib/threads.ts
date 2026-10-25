import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { type AvatarThread, fetchAvatarThreads } from './data';
import { supabase } from './supabase';
import type { Avatar } from './types';

/**
 * Copia local de la lista (por usuario): al abrir la app, Inicio se pinta al instante con ella
 * y se actualiza cuando responde el servidor (WP-9: Inicio usable ≤ 2 s).
 */
const CACHE_KEY = 'lovel.threads.v1';
async function currentUserId() {
  return (await supabase.auth.getSession()).data.session?.user.id ?? null;
}
export async function cachedThreads(userId?: string | null): Promise<AvatarThread[] | null> {
  try {
    const uid = userId ?? (await currentUserId());
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!uid || !raw) return null;
    const saved = JSON.parse(raw) as { uid: string; threads: AvatarThread[] };
    return saved.uid === uid ? saved.threads : null;
  } catch {
    return null;
  }
}
async function saveThreads(threads: AvatarThread[]) {
  const uid = await currentUserId();
  if (uid) AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ uid, threads })).catch(() => {});
}

/**
 * Lista de historias compartida por la barra lateral y el inicio: una sola
 * consulta y todos los componentes se actualizan a la vez.
 */
type State = { threads: AvatarThread[]; loaded: boolean; failed: boolean; fromCache?: boolean };
let state: State = { threads: [], loaded: false, failed: false };
const listeners = new Set<() => void>();
const set = (s: Partial<State>) => {
  state = { ...state, ...s };
  listeners.forEach((l) => l());
};

let inflight: Promise<void> | null = null;
export function refreshThreads(): Promise<void> {
  // mientras llega la lista del servidor, la copia local (solo si aún no hay nada pintado)
  if (!state.loaded && !inflight)
    cachedThreads().then((threads) => {
      if (threads?.length && !state.loaded) set({ threads, loaded: true, failed: false, fromCache: true });
    });
  inflight ??= fetchAvatarThreads()
    .then((threads) => {
      set({ threads, loaded: true, failed: false, fromCache: false });
      saveThreads(threads);
    })
    .catch(() => set({ loaded: true, failed: !state.threads.length }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Personajes recién creados (aún no están en la lista): el chat los pinta al instante. */
const primed = new Map<string, Avatar>();
export function primeAvatar(a: Avatar) {
  primed.set(a.id, a);
}
/** El personaje ya conocido (lista de historias o recién creado), sin esperar a la base de datos. */
export function peekAvatar(id: string | null | undefined): Avatar | null {
  if (!id) return null;
  return state.threads.find((t) => t.id === id) ?? primed.get(id) ?? null;
}

/** Al cerrar sesión. */
export function resetThreads() {
  AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
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
