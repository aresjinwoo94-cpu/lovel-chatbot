import { supabase } from './supabase';

/**
 * Avisos en web (WP-12): Web Push con el service worker /sw.js. Funciona en Chrome, Edge y
 * Firefox, y en Safari de iPhone solo si la web está añadida a la pantalla de inicio.
 * En Android/iOS nativo se usa push.native.ts (expo-notifications, build de desarrollo).
 */
const VAPID_PUBLIC_KEY = 'BLaT3hbAi3CFHKnUtxyyG8cg9KFzhAoiIyTqzJKYb04ps9zlY-lkgrMeTDjhwxlG_EykkblqTr26AUy--yDQuTE';

export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function pushState(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/** Pide permiso (tras un toque de la persona) y guarda la suscripción de este navegador. */
export async function enablePush(userId: string): Promise<PushState> {
  if (!supported()) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON();
  // Si este navegador estaba con otra cuenta, la suscripción pasa a esta.
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  const { error } = await supabase
    .from('push_subscriptions')
    .insert({ user_id: userId, kind: 'web', endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? null, auth: json.keys?.auth ?? null });
  if (error && error.code !== '23505') throw error;
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }
  return 'off';
}

/** En web no hay nada que preparar al arrancar (el service worker se registra al activar). */
export function usePushResponses() {}
