import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

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

// En web, la URL con la que se abrió la app (antes de que la puerta redirija).
const LAUNCH_URL = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : null;
const NO_RESUME = new Set(['', 'index', 'age-gate', 'terms', 'privacy']);

/** Ruta interna (con su query) a la que iba la persona al abrir un enlace, o null. */
function resumeHref(url: string | null): string | null {
  if (!url) return null;
  try {
    if (Platform.OS === 'web') {
      const u = new URL(url);
      const path = u.pathname.replace(/^\/+|\/+$/g, '');
      return NO_RESUME.has(path) ? null : `/${path}${u.search}`;
    }
    const { path, queryParams } = Linking.parse(url);
    const clean = (path ?? '').replace(/^\/+|\/+$/g, '');
    if (NO_RESUME.has(clean)) return null;
    const qs = new URLSearchParams(
      Object.entries(queryParams ?? {}).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])),
    ).toString();
    return `/${clean}${qs ? `?${qs}` : ''}`;
  } catch {
    return null;
  }
}

interface AgeGateState {
  status: AgeStatus;
  confirmAdult: () => Promise<void>;
  declareMinor: () => Promise<void>;
  /** Tras confirmar en la puerta: la ruta del enlace con el que se llegó (una sola vez). */
  takeResume: () => string | null;
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
      // También en memoria: si luego se cierra sesión, la puerta no reaparece.
      AsyncStorage.setItem(KEY, 'adult')
        .catch(() => undefined)
        .then(() => setStored((cur) => (cur === 'unknown' ? 'adult' : cur)));
    }
  }, [mine, session, stored, profileConfirmed]);

  const resume = useRef<string | null>(null);
  const confirmAdult = useCallback(async () => {
    const launch = LAUNCH_URL ?? (await Linking.getInitialURL().catch(() => null));
    resume.current = resumeHref(launch);
    await AsyncStorage.setItem(KEY, 'adult').catch(() => undefined);
    setStored('adult');
  }, []);
  const takeResume = useCallback(() => {
    const href = resume.current;
    resume.current = null;
    return href;
  }, []);

  const declareMinor = useCallback(async () => {
    await AsyncStorage.setItem(KEY, 'minor').catch(() => undefined);
    setStored('minor');
  }, []);

  const value = useMemo(() => ({ status, confirmAdult, declareMinor, takeResume }), [status, confirmAdult, declareMinor, takeResume]);
  return <AgeGateContext.Provider value={value}>{children}</AgeGateContext.Provider>;
}

export function useAgeGate() {
  const ctx = useContext(AgeGateContext);
  if (!ctx) throw new Error('useAgeGate debe usarse dentro de <AgeGateProvider>');
  return ctx;
}
