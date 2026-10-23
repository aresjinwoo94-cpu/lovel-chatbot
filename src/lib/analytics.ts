/**
 * Analítica propia para el panel privado (/admin): quién entra, desde dónde, cuánto tiempo se
 * queda y hasta dónde llega (embudo hasta el checkout). Sin IP ni geolocalización: un id
 * aleatorio por dispositivo, la zona horaria (país aproximado) y lo que se hace en la app.
 * Los eventos se agrupan y se envían cada pocos segundos a la función `track`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/constants/supabaseConfig';
import { supabase } from './supabase';

/** Pasos del embudo (mismo orden que el panel) y otros eventos. */
export type AnalyticsEvent =
  | 'screen_view'
  | 'age_confirmed'
  | 'welcome_started'
  | 'character_created'
  | 'message_sent'
  | 'voice_sent'
  | 'account_created'
  | 'paywall_shown'
  | 'pro_viewed'
  | 'checkout_started'
  | 'checkout_completed'
  | 'ping';

const ENDPOINT = `${SUPABASE_URL}/functions/v1/track`;
const VISITOR_KEY = 'lovel.visitor.v1';
const FLUSH_MS = 8000;
const PING_MS = 30000;
/** Tras 30 min en segundo plano, volver cuenta como una sesión nueva. */
const SESSION_GAP_MS = 30 * 60 * 1000;

const randomId = () => {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, '');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 32);
};

let visitorId: string | null = null;
let sessionId = randomId();
let sessionSent = false;
let lastRoute: string | null = null;
let hiddenAt = 0;
let queue: { name: string; route?: string | null; props?: Record<string, unknown> }[] = [];
let started = false;

function context() {
  const ctx: Record<string, string | undefined> = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: (typeof navigator !== 'undefined' && navigator.language) || Intl.DateTimeFormat().resolvedOptions().locale,
    platform: Platform.OS,
    route: lastRoute ?? undefined,
  };
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const w = window.innerWidth;
    ctx.device = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : w < 1100 && /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : 'desktop';
    try {
      const ref = document.referrer ? new URL(document.referrer).hostname : '';
      if (ref && ref !== window.location.hostname) ctx.referrer = ref.replace(/^www\./, '');
      const q = new URLSearchParams(window.location.search);
      ctx.utm_source = q.get('utm_source') ?? undefined;
      ctx.utm_medium = q.get('utm_medium') ?? undefined;
      ctx.utm_campaign = q.get('utm_campaign') ?? undefined;
    } catch {
      // sin referrer válido
    }
  } else {
    ctx.device = Platform.OS === 'ios' && (Platform as { isPad?: boolean }).isPad ? 'tablet' : 'mobile';
  }
  return ctx;
}

async function ensureVisitor() {
  if (visitorId) return visitorId;
  try {
    visitorId = await AsyncStorage.getItem(VISITOR_KEY);
  } catch {
    visitorId = null;
  }
  if (!visitorId) {
    visitorId = randomId();
    AsyncStorage.setItem(VISITOR_KEY, visitorId).catch(() => undefined);
  }
  return visitorId;
}

async function flush(useBeacon = false) {
  if (!queue.length && sessionSent) return;
  const events = queue;
  queue = [];
  const body = JSON.stringify({ visitorId: await ensureVisitor(), sessionId, context: sessionSent ? undefined : context(), events });
  sessionSent = true;
  // Al cerrar la pestaña: sendBeacon (sin cabeceras; la función acepta peticiones sin sesión).
  if (useBeacon && Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, body);
    return;
  }
  try {
    const { data } = await supabase.auth.getSession();
    await fetch(ENDPOINT, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${data.session?.access_token ?? SUPABASE_ANON_KEY}` },
      body,
    });
  } catch {
    // sin conexión: se pierden estos eventos (la analítica nunca bloquea la app)
  }
}

/** Registra un evento (no hace nada en desarrollo, para no ensuciar las cifras). */
export function track(name: AnalyticsEvent, props?: Record<string, unknown>) {
  if (__DEV__ && !process.env.EXPO_PUBLIC_ANALYTICS_IN_DEV) return;
  queue.push({ name, route: lastRoute, props });
}

/** Pantalla vista (lo llama la navegación raíz con la ruta actual). */
export function trackScreen(route: string) {
  if (route === lastRoute) return;
  lastRoute = route;
  track('screen_view');
}

/** Arranca el envío periódico y el "sigo aquí" que mide el tiempo en la app. Una sola vez. */
export function startAnalytics() {
  if (started || (__DEV__ && !process.env.EXPO_PUBLIC_ANALYTICS_IN_DEV)) return;
  started = true;
  setInterval(() => void flush(), FLUSH_MS);
  setInterval(() => {
    if (AppState.currentState === 'active') {
      track('ping');
      void flush();
    }
  }, PING_MS);
  const onHide = () => {
    hiddenAt = Date.now();
    void flush(true);
  };
  const onShow = () => {
    if (hiddenAt && Date.now() - hiddenAt > SESSION_GAP_MS) {
      sessionId = randomId();
      sessionSent = false;
    }
    hiddenAt = 0;
  };
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? onHide() : onShow()));
  } else {
    AppState.addEventListener('change', (s) => (s === 'active' ? onShow() : onHide()));
  }
  void flush();
}
