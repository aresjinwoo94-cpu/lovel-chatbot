/**
 * POST /proactive-tick (pg_cron, cada hora; cabecera x-proactive-secret)
 * WP-12: decide qué personajes escriben primero ahora y lo envía al chat + notificación.
 * No gasta Platino. Cuerpo opcional solo para pruebas: { now, dryRun, avatarId, force }.
 */
import { writeFirst } from '../_shared/companion.ts';
import { HttpError, json, serve } from '../_shared/http.ts';
import { type Candidate, decide, type ProactiveMode } from '../_shared/proactive.ts';
import { offToken, sendPush } from '../_shared/push.ts';
import { admin, type AvatarRow, getConversationId, getProfile } from '../_shared/supabase.ts';

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
}

/** Envíos por pasada (cada uno llama a la IA): el resto, en la próxima hora. */
const MAX_SENDS = 20;

const OFF_LABEL = { es: 'Que no me escriba', en: 'Stop writing first' };

serve(async (req) => {
  const secret = Deno.env.get('PROACTIVE_SECRET');
  if (!secret || req.headers.get('x-proactive-secret') !== secret) throw new HttpError(401, 'No autorizado');
  const opts = (await req.json().catch(() => ({}))) as { now?: string; dryRun?: boolean; avatarId?: string; force?: boolean };
  const now = opts.now ? new Date(opts.now) : new Date();

  const { data, error } = await admin.rpc('proactive_candidates');
  if (error) throw error;
  const rows = ((data ?? []) as Row[]).filter((r) => !opts.avatarId || r.avatar_id === opts.avatarId);
  const seenUsers = new Set<string>();
  const results: Record<string, unknown>[] = [];

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
    };
    // Como mucho un personaje por persona en cada pasada (nunca dos avisos a la vez).
    const d = opts.force ? ({ send: true } as const) : seenUsers.has(r.user_id) ? ({ send: false, reason: 'ya escribió otro personaje' } as const) : decide(c, now, Math.random());
    if (!d.send) {
      results.push({ avatar: r.avatar_id, send: false, reason: d.reason });
      continue;
    }
    if (seenUsers.size >= MAX_SENDS) {
      results.push({ avatar: r.avatar_id, send: false, reason: 'cupo de esta pasada' });
      continue;
    }
    seenUsers.add(r.user_id);
    try {
      const [{ data: avatar }, profile] = await Promise.all([admin.from('avatars').select('*').eq('id', r.avatar_id).single(), getProfile(r.user_id)]);
      const hoursSilent = c.lastAt ? (now.getTime() - c.lastAt.getTime()) / 3600_000 : 24;
      const { text, rejected } = await writeFirst({ avatar: avatar as AvatarRow, profile, hoursSilent });
      if (rejected.length) console.warn(JSON.stringify({ proactive_rejected: rejected }));
      if (!text) {
        results.push({ avatar: r.avatar_id, send: false, reason: 'sin mensaje válido', rejected });
        continue;
      }
      if (opts.dryRun) {
        results.push({ avatar: r.avatar_id, send: true, dryRun: true, text, rejected });
        continue;
      }
      const conversationId = await getConversationId(r.avatar_id);
      const { error: e2 } = await admin
        .from('messages')
        .insert({ conversation_id: conversationId, avatar_id: r.avatar_id, user_id: r.user_id, role: 'avatar', kind: 'text', content: text, proactive: true });
      if (e2) throw e2;
      const lang = profile.language === 'en' ? 'en' : 'es';
      const plain = text.replace(/\*[^*]+\*/g, ' ').replace(/\s+/g, ' ').trim() || text;
      const push = await sendPush(r.user_id, {
        title: (avatar as AvatarRow).name,
        body: plain.length > 140 ? `${plain.slice(0, 137)}…` : plain,
        url: `/chat/${r.avatar_id}`,
        offUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/proactive-off?t=${await offToken(r.avatar_id)}`,
        offLabel: OFF_LABEL[lang],
        tag: `proactive-${r.avatar_id}`,
      });
      console.log(JSON.stringify({ proactive_sent: { avatar: r.avatar_id, push } }));
      results.push({ avatar: r.avatar_id, send: true, push });
    } catch (e) {
      console.error('proactive', r.avatar_id, e);
      results.push({ avatar: r.avatar_id, send: false, reason: 'error' });
    }
  }
  return json({ now: now.toISOString(), candidates: rows.length, results });
});
