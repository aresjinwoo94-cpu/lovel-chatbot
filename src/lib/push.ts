import { supabase } from './supabase';

/**
 * Avisos en web (WP-12): Web Push con el service worker /sw.js. Funciona en Chrome, Edge y
 * Firefox, y en Safari de iPhone solo si la web está añadida a la pantalla de inicio.
 * En Android/iOS nativo se usa push.native.ts (expo-notifications, build de desarrollo).
 */
const VAPID_PUBLIC_KEY = 'BLaT3hbAi3CFHKnUtxyyG8cg9KFzhAoiIyTqzJKYb04ps9zlY-lkgrMeTDjhwxlG_EykkblqTr26AUy--yDQuTE';

export type PushState = 'unsupported' | 'denied' | 'off' | 'on';
/** Los textos de "bloqueado" y "no disponible" hablan del navegador en web y del móvil en nativo. */
export const PUSH_SURFACE = 'browser' as const;

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Activado = este navegador tiene permiso, suscripción y está guardada para ESTA cuenta. */
export async function pushState(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await currentSubscription();
  if (!sub || Notification.permission !== 'granted') return 'off';
  const { data } = await supabase.from('push_subscriptions').select('id').eq('endpoint', sub.endpoint).maybeSingle();
  return data ? 'on' : 'off';
}

/**
 * Pide permiso y guarda la suscripción de este navegador para la cuenta con sesión. Llamar
 * directamente desde el toque (sin esperas antes): Safari y Firefox piden ese gesto.
 */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON();
  // Si este navegador estaba con otra cuenta, la suscripción pasa a esta (lo hace el servidor).
  const { error } = await supabase.rpc('claim_push_subscription', { p_kind: 'web', p_endpoint: sub.endpoint, p_p256dh: json.keys?.p256dh ?? null, p_auth: json.keys?.auth ?? null });
  if (error) throw error;
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  const sub = await currentSubscription();
  if (sub) {
    await supabase.rpc('release_push_subscription', { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
  return 'off';
}

/** Al cerrar sesión: este navegador deja de recibir avisos de la cuenta. */
export async function releasePush() {
  if (!supported()) return;
  const sub = await currentSubscription();
  if (sub) await supabase.rpc('release_push_subscription', { p_endpoint: sub.endpoint });
}

/** En web no hay nada que preparar al arrancar (el service worker se registra al activar). */
export function usePushResponses() {}
