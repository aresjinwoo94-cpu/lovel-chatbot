/**
 * POST /proactive-tick (pg_cron, cada hora; cabecera x-proactive-secret)
 * WP-12: decide qué personajes escriben primero ahora y lo envía al chat + notificación.
 * No gasta Platino. Cuerpo opcional solo para pruebas: { now, dryRun, avatarId, force }.
 */
import { writeFirst } from '../_shared/companion.ts';
import { HttpError, json, serve } from '../_shared/http.ts';
import { type Candidate, DAILY_LIMIT, decide, type ProactiveMode, secondsUntilQuiet } from '../_shared/proactive.ts';
import { offToken, sendPush } from '../_shared/push.ts';
import { admin, type AvatarRow, getProfile } from '../_shared/supabase.ts';

interface Row {
  avatar_id: string;
  user_id: string;
  mode: ProactiveMode;
  is_pro: boolean;
  timezone: string;
  quiet_start: number;
  quiet_end: number;
  language: string;
  last_role: 'user' | 'avatar' | null;
  last_proactive: boolean | null;
  last_at: string | null;
  user_messages: number;
  sent_today: number;
  user_pending: boolean;
}

/** Envíos por pasada (cada uno llama a la IA) y cuántos a la vez: el resto, la próxima hora. */
const MAX_SENDS = 60;
const PARALLEL = 6;

const OFF_LABEL = { es: 'Que no me escriba', en: 'Stop writing first' };

serve(async (req) => {
  const secret = Deno.env.get('PROACTIVE_SECRET');
  if (!secret || req.headers.get('x-proactive-secret') !== secret) throw new HttpError(401, 'No autorizado');
  const opts = (await req.json().catch(() => ({}))) as { now?: string; dryRun?: boolean; avatarId?: string; force?: boolean };
  const now = opts.now ? new Date(opts.now) : new Date();

  const { data, error } = await admin.rpc('proactive_candidates');
  if (error) throw error;
  // Orden al azar: si hay más candidatos que envíos por pasada, nadie queda siempre al final.
  const rows = ((data ?? []) as Row[]).filter((r) => !opts.avatarId || r.avatar_id === opts.avatarId).sort(() => Math.random() - 0.5);
  const results: Record<string, unknown>[] = [];

  // 1) Decidir (barato, sin red). Como mucho un personaje por persona en cada pasada.
  const chosen: { r: Row; c: Candidate }[] = [];
  const seenUsers = new Set<string>();
  for (const r of rows) {
    const c: Candidate = {
      mode: r.mode,
      isPro: r.is_pro,
      timezone: r.timezone,
      quietStart: r.quiet_start,
      quietEnd: r.quiet_end,
      lastRole: r.last_role,
      lastProactive: !!r.last_proactive,
      lastAt: r.last_at ? new Date(r.last_at) : null,
      userMessages: Number(r.user_messages),
      sentToday: Number(r.sent_today),
      userPending: !!r.user_pending,
    };
    const d = opts.force ? ({ send: true } as const) : seenUsers.has(r.user_id) ? ({ send: false, reason: 'ya escribió otro personaje' } as const) : decide(c, now, Math.random());
    if (!d.send) results.push({ avatar: r.avatar_id, send: false, reason: d.reason });
    else if (chosen.length >= MAX_SENDS) results.push({ avatar: r.avatar_id, send: false, reason: 'cupo de esta pasada' });
    else {
      seenUsers.add(r.user_id);
      chosen.push({ r, c });
    }
  }

  // 2) Escribir y enviar, varios a la vez.
  const send = async ({ r, c }: { r: Row; c: Candidate }) => {
    try {
      const [{ data: avatar }, profile] = await Promise.all([admin.from('avatars').select('*').eq('id', r.avatar_id).single(), getProfile(r.user_id)]);
      const { text, rejected, waited } = await writeFirst({ avatar: avatar as AvatarRow, profile, now, lastAt: c.lastAt });
      if (rejected.length) console.warn(JSON.stringify({ proactive_rejected: rejected }));
      if (!text) return { avatar: r.avatar_id, send: false, reason: waited ? 'el personaje prefiere esperar' : 'sin mensaje válido', rejected };
      if (opts.dryRun) return { avatar: r.avatar_id, send: true, dryRun: true, text, rejected };
      // Guardado atómico: vuelve a comprobar activado, sin respuesta pendiente y límite diario.
      const { data: messageId, error: e2 } = await admin.rpc('proactive_insert', {
        p_avatar: r.avatar_id,
        p_content: text,
        p_limit: opts.force ? 99 : r.is_pro ? DAILY_LIMIT.pro : DAILY_LIMIT.free,
      });
      if (e2) throw e2;
      if (!messageId) return { avatar: r.avatar_id, send: false, reason: 'otra pasada ya lo envió' };
      const lang = profile.language === 'en' ? 'en' : 'es';
      const plain = text.replace(/\*[^*]+\*/g, ' ').replace(/\s+/g, ' ').trim() || text;
      const push = await sendPush(
        r.user_id,
        {
          title: (avatar as AvatarRow).name,
          body: plain.length > 140 ? `${plain.slice(0, 137)}…` : plain,
          url: `/chat/${r.avatar_id}`,
          offUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/proactive-off?t=${await offToken(r.avatar_id)}&lang=${lang}`,
          offLabel: OFF_LABEL[lang],
          tag: `proactive-${r.avatar_id}`,
        },
        // un aviso que no se pudo entregar caduca antes de que empiece el silencio
        secondsUntilQuiet(now, r.timezone, r.quiet_start, r.quiet_end),
      );
      console.log(JSON.stringify({ proactive_sent: { avatar: r.avatar_id, push } }));
      return { avatar: r.avatar_id, send: true, push };
    } catch (e) {
      console.error('proactive', r.avatar_id, e);
      return { avatar: r.avatar_id, send: false, reason: 'error' };
    }
  };
  for (let i = 0; i < chosen.length; i += PARALLEL) results.push(...(await Promise.all(chosen.slice(i, i + PARALLEL).map(send))));

  return json({ now: now.toISOString(), candidates: rows.length, results });
});
