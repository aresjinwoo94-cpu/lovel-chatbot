import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { supabase } from './supabase';

/**
 * Puerta 18+. Lovel House es solo para personas adultas.
 *  - La respuesta se guarda en el dispositivo (AsyncStorage), también para invitados.
 *  - Con sesión (invitado o cuenta), la confirmación se guarda además en
 *    `profiles.adult_confirmed_at`, así una cuenta ya confirmada no vuelve a verla.
 *  - "Soy menor" bloquea el acceso en este dispositivo.
 */
export type AgeStatus = 'loading' | 'unknown' | 'adult' | 'minor';

const KEY = 'lovel.ageGate.v1';

interface AgeGateState {
  status: AgeStatus;
  confirmAdult: () => Promise<void>;
  declareMinor: () => Promise<void>;
}

const AgeGateContext = createContext<AgeGateState | null>(null);

export function AgeGateProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  const [stored, setStored] = useState<AgeStatus>('loading');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setStored(v === 'adult' || v === 'minor' ? v : 'unknown'))
      .catch(() => setStored('unknown'));
  }, []);

  const mine = !!session && !!profile && profile.id === session.user.id;
  const profileConfirmed = mine && !!profile?.adult_confirmed_at;
  // Una cuenta ya confirmada no repite la puerta en otro dispositivo.
  const status: AgeStatus = stored === 'unknown' && profileConfirmed ? 'adult' : stored;

  // Sincroniza: la confirmación hecha antes de tener sesión se guarda en el perfil en
  // cuanto la hay; la del perfil se recuerda también en el dispositivo.
  useEffect(() => {
    if (!mine || !session) return;
    if (stored === 'adult' && !profileConfirmed) {
      supabase
        .from('profiles')
        .update({ adult_confirmed_at: new Date().toISOString() })
        .eq('id', session.user.id)
        .then(() => undefined, () => undefined);
    } else if (stored === 'unknown' && profileConfirmed) {
      AsyncStorage.setItem(KEY, 'adult').catch(() => undefined);
    }
  }, [mine, session, stored, profileConfirmed]);

  const confirmAdult = useCallback(async () => {
    await AsyncStorage.setItem(KEY, 'adult').catch(() => undefined);
    setStored('adult');
  }, []);

  const declareMinor = useCallback(async () => {
    await AsyncStorage.setItem(KEY, 'minor').catch(() => undefined);
    setStored('minor');
  }, []);

  const value = useMemo(() => ({ status, confirmAdult, declareMinor }), [status, confirmAdult, declareMinor]);
  return <AgeGateContext.Provider value={value}>{children}</AgeGateContext.Provider>;
}

export function useAgeGate() {
  const ctx = useContext(AgeGateContext);
  if (!ctx) throw new Error('useAgeGate debe usarse dentro de <AgeGateProvider>');
  return ctx;
}
