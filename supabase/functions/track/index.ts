/**
 * POST /track  { visitorId, sessionId, context?, events: [{ name, route?, props?, at? }] }
 * Analítica propia del panel privado (/admin). Sin IP ni geolocalización: el país sale de la zona
 * horaria del dispositivo. Acepta peticiones sin sesión (visitas antes de la puerta 18+); si llega
 * el JWT de una cuenta (o invitado), la sesión queda asociada a ese usuario.
 * "ping" solo actualiza la última actividad (tiempo en la app); no se guarda como evento.
 */
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { admin } from '../_shared/supabase.ts';
import { countryFromTimezone } from '../_shared/tzCountry.ts';

interface Body {
  visitorId?: string;
  sessionId?: string;
  context?: {
    timezone?: string;
    language?: string;
    platform?: string;
    device?: string;
    referrer?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    route?: string;
  };
  events?: { name?: string; route?: string; props?: Record<string, unknown> }[];
}

const ID = /^[A-Za-z0-9_-]{8,64}$/;
const NAME = /^[a-z_]{2,40}$/;
const str = (v: unknown, max = 120) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Usuario del JWT, si es de una cuenta (el anon key no tiene "sub"). */
async function userFrom(req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload?.sub) return null;
  } catch {
    return null;
  }
  const { data } = await admin.auth.getUser(token);
  return data.user?.id ?? null;
}

serve(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido');
  const body = await readJson<Body>(req);
  const visitorId = str(body.visitorId, 64);
  const sessionId = str(body.sessionId, 64);
  if (!visitorId || !sessionId || !ID.test(visitorId) || !ID.test(sessionId)) throw new HttpError(400, 'Identificadores no válidos');
  const events = (Array.isArray(body.events) ? body.events : []).slice(0, 50);
  const userId = await userFrom(req);
  const ctx = body.context ?? {};

  // Sesión: se crea la primera vez (con su contexto) y después solo se actualiza.
  const { data: existing } = await admin.from('analytics_sessions').select('id, user_id, screens').eq('id', sessionId).maybeSingle();
  const views = events.filter((e) => e?.name === 'screen_view').length;
  if (!existing) {
    const language = str(ctx.language, 20);
    const timezone = str(ctx.timezone, 60);
    const { error } = await admin.from('analytics_sessions').insert({
      id: sessionId,
      visitor_id: visitorId,
      user_id: userId,
      timezone,
      language,
      country: countryFromTimezone(timezone, language),
      platform: str(ctx.platform, 12),
      device: str(ctx.device, 60),
      referrer: str(ctx.referrer, 120),
      utm_source: str(ctx.utm_source, 80),
      utm_medium: str(ctx.utm_medium, 80),
      utm_campaign: str(ctx.utm_campaign, 80),
      entry_route: str(ctx.route, 120),
      screens: views,
    });
    // Otra petición de la misma sesión pudo crearla a la vez: se sigue como actualización.
    if (error && error.code !== '23505') throw error;
  } else {
    await admin
      .from('analytics_sessions')
      .update({ last_seen_at: new Date().toISOString(), screens: (existing.screens ?? 0) + views, ...(userId && !existing.user_id ? { user_id: userId } : {}) })
      .eq('id', sessionId);
  }

  const rows = events
    .filter((e) => e && typeof e.name === 'string' && NAME.test(e.name) && e.name !== 'ping')
    .map((e) => {
      const props = e.props && typeof e.props === 'object' && !Array.isArray(e.props) ? e.props : {};
      return { session_id: sessionId, visitor_id: visitorId, name: e.name as string, route: str(e.route, 120), props: JSON.stringify(props).length <= 1000 ? props : {} };
    });
  if (rows.length) {
    const { error } = await admin.from('analytics_events').insert(rows);
    if (error) throw error;
  }
  return json({ ok: true });
});
