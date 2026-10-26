import { admin } from './supabase.ts';

/**
 * Notificaciones (WP-12): push del navegador (Web Push con VAPID) y, en Android/iOS,
 * el servicio de Expo (necesita una build nativa con expo-notifications).
 * Las suscripciones caducadas (404/410) se borran solas.
 */
// web-push se carga solo si hay a quién enviar (es pesado y la pasada horaria debe ser ligera).
type WebPush = typeof import('npm:web-push@3.6.7').default;
let webpush: WebPush | null = null;
async function getWebPush(): Promise<WebPush> {
  if (webpush) return webpush;
  const pub = Deno.env.get('VAPID_PUBLIC_KEY');
  const priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub || !priv) throw new Error('VAPID sin configurar');
  const wp = (await import('npm:web-push@3.6.7')).default;
  wp.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'https://lovel-house.expo.app', pub, priv);
  return (webpush = wp);
}

export interface PushPayload {
  title: string;
  body: string;
  /** Ruta de la app que se abre al tocar (p. ej. /chat/<id>). */
  url: string;
  /** URL que desactiva los mensajes por su cuenta de ese personaje (acción de la notificación). */
  offUrl: string;
  offLabel: string;
  tag: string;
}

export async function sendPush(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const { data: subs } = await admin.from('push_subscriptions').select('id, kind, endpoint, p256dh, auth').eq('user_id', userId);
  let sent = 0;
  let failed = 0;
  for (const s of subs ?? []) {
    try {
      if (s.kind === 'web') {
        await (await getWebPush()).sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh ?? '', auth: s.auth ?? '' } }, JSON.stringify(payload), { TTL: 6 * 3600, urgency: 'normal' });
      } else {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ to: s.endpoint, title: payload.title, body: payload.body, data: payload, categoryId: 'proactive', sound: 'default' }),
        });
        const out = await res.json().catch(() => ({}));
        if (out?.data?.status === 'error' && out.data.details?.error === 'DeviceNotRegistered') throw Object.assign(new Error('gone'), { statusCode: 410 });
        if (!res.ok) throw new Error(`expo ${res.status}`);
      }
      sent++;
      await admin.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', s.id);
    } catch (e) {
      failed++;
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('id', s.id);
      else console.error('push', s.kind, (e as Error).message);
    }
  }
  return { sent, failed };
}

/** Firma para el enlace "dejar de escribirme" (sin sesión: viene de una notificación). */
async function hmac(text: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(Deno.env.get('PROACTIVE_SECRET') ?? ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 32);
}
export async function offToken(avatarId: string): Promise<string> {
  return `${avatarId}.${await hmac(`off:${avatarId}`)}`;
}
export async function checkOffToken(token: string): Promise<string | null> {
  const [id, sig] = token.split('.');
  if (!id || !sig) return null;
  return (await hmac(`off:${id}`)) === sig ? id : null;
}
