import { useSyncExternalStore } from 'react';

import { useAuth } from './auth';
import { freshest, platinoFromProfile, type PlatinoState } from './platino';

/**
 * Saldo de Platino compartido por el chat, la barra lateral y el perfil: el del perfil
 * (servidor) y, por encima, el último que devolvió un gasto en esta sesión, hasta que el
 * perfil se vuelve a cargar (entonces el perfil ya lo incluye y manda: p. ej. tras comprar).
 */
let latest: { uid: string; state: PlatinoState; profile: unknown } | null = null;
const listeners = new Set<() => void>();

export function setPlatino(uid: string | undefined, state: PlatinoState | null | undefined, profileNow: unknown) {
  if (!uid || !state) return;
  latest = { uid, state, profile: profileNow };
  listeners.forEach((l) => l());
}

export function usePlatino(): PlatinoState | null {
  const { profile, isGuest, session } = useAuth();
  const server = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => latest,
    () => latest,
  );
  const uid = session?.user.id;
  const current = server && server.uid === uid && server.profile === profile ? server.state : null;
  return freshest(platinoFromProfile(profile, isGuest), current);
}
