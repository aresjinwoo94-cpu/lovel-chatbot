import { useEffect, useState, useSyncExternalStore } from 'react';

import { useAuth } from './auth';
import { freshest, minutesToReset, platinoFromProfile, type PlatinoState } from './platino';

/**
 * Saldo de Platino compartido por el chat, la barra lateral y el perfil: el del perfil
 * (servidor) y, por encima, el último que devolvió un gasto en esta sesión, hasta que el
 * perfil se vuelve a cargar (entonces el perfil ya lo incluye y manda: p. ej. tras comprar).
 * A medianoche se recalcula solo (el diario renovado), aunque la pantalla siga abierta.
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
  // Fecha de referencia: cambia al pasar la medianoche para renovar el diario en pantalla.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // tramos de una hora como mucho (Android avisa de temporizadores largos)
    const id = setTimeout(() => setNow(new Date()), Math.min(minutesToReset(now) * 60000 + 5000, 3600000));
    return () => clearTimeout(id);
  }, [now]);
  const uid = session?.user.id;
  const current = server && server.uid === uid && server.profile === profile ? server.state : null;
  return freshest(platinoFromProfile(profile, isGuest, now), current, now);
}
