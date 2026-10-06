import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/constants/supabaseConfig';

import { supabase } from './supabase';
import type { Profile } from './types';

WebBrowser.maybeCompleteAuthSession();

interface AuthValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<Profile | null>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: (scope?: 'global' | 'local') => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** URL a la que vuelve el navegador tras Google / enlaces de correo. */
export const authRedirectUrl = (next?: string) => {
  const base = Platform.OS === 'web' ? `${window.location.origin}/auth/callback` : Linking.createURL('auth/callback');
  return next ? `${base}?next=${next}` : base;
};

/** Errores de login con un código que la interfaz traduce. */
export class AuthFlowError extends Error {
  constructor(public code: 'GOOGLE_DISABLED' | 'CANCELLED') {
    super(code);
  }
}

/**
 * ¿Está activado Google en Supabase? (Authentication → Providers → Google).
 * Si no lo está, Supabase muestra una página de error en JSON; lo comprobamos antes.
 */
async function googleEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } });
    if (!res.ok) return true; // ante la duda, intentamos igualmente
    const data = (await res.json()) as { external?: { google?: boolean } };
    return data.external?.google !== false;
  } catch {
    return true;
  }
}

/** Lee ?error_description= o #error_description= de una URL de retorno. */
export function authErrorFromUrl(url: string): string | null {
  const m = url.match(/[?#&]error_description=([^&#]+)/);
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
}

/** Intercambia el ?code= (PKCE) de una URL de retorno por una sesión. */
export async function completeAuthFromUrl(url: string) {
  const { queryParams } = Linking.parse(url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  const errorDescription = authErrorFromUrl(url);
  if (errorDescription) throw new Error(errorDescription);
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile((data as Profile) ?? null);
    return (data as Profile) ?? null;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Importante: no consultar Supabase dentro de este callback (bloquea el cliente).
      // Lo diferimos al siguiente ciclo, como recomienda supabase-js.
      if (next) setTimeout(() => loadProfile(next.user.id), 0);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Mantiene el perfil al día (p. ej. cuando Stripe activa Pro vía webhook).
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`profile-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
        (payload) => setProfile(payload.new as Profile),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const refreshProfile = useCallback(async () => {
    if (!session) return null;
    return loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    if (!(await googleEnabled())) throw new AuthFlowError('GOOGLE_DISABLED');
    const redirectTo = authRedirectUrl();
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) throw error;
      return;
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') throw new AuthFlowError('CANCELLED');
    await completeAuthFromUrl(result.url);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl('password') });
    if (error) throw error;
  }, []);

  /** `local`: tras borrar la cuenta el servidor ya no reconoce la sesión; basta con olvidarla aquí. */
  const signOut = useCallback(async (scope: 'global' | 'local' = 'global') => {
    await supabase.auth.signOut({ scope });
  }, []);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      refreshProfile,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset,
      signOut,
    }),
    [session, profile, loading, refreshProfile, signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
