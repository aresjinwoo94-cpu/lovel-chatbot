import { generateReply, loadHistory, maybeUpdateMemory } from './claude.ts';
import { consumeFreeMessage, type QuotaState } from './quota.ts';
import { background } from './runtime.ts';
import { admin, type AvatarRow, type ProfileRow } from './supabase.ts';
import { buildCompanionSystemPrompt } from './systemPrompts.tsx';

/** Pide a Claude la respuesta del avatar con su personalidad y situación. */
export async function replyAsAvatar(opts: { avatar: AvatarRow; profile: ProfileRow; userText: string; voice?: boolean }) {
  const { avatar, profile } = opts;
  const system = buildCompanionSystemPrompt({
    avatar,
    userName: profile.display_name,
    language: profile.language,
    memoryEnabled: profile.is_pro,
  });
  const history = await loadHistory(avatar.id);
  return generateReply({ system, history, userText: opts.userText, voice: opts.voice, language: profile.language });
}

interface NewMessage {
  role: 'user' | 'avatar';
  kind: 'text' | 'voice';
  content: string;
  audio_path?: string | null;
  audio_duration_ms?: number | null;
}

/**
 * Guarda el mensaje del usuario y la respuesta del avatar (en ese orden),
 * descuenta el periodo gratuito y actualiza la memoria en segundo plano.
 */
export async function saveExchange(opts: {
  avatar: AvatarRow;
  profile: ProfileRow;
  conversationId: string;
  user: NewMessage;
  reply: NewMessage;
}): Promise<{ userMessage: unknown; avatarMessage: unknown; quota: QuotaState }> {
  const base = { conversation_id: opts.conversationId, avatar_id: opts.avatar.id, user_id: opts.profile.id };
  const { data: userMessage, error: e1 } = await admin
    .from('messages')
    .insert({ ...base, ...opts.user })
    .select('*')
    .single();
  if (e1) throw e1;
  const { data: avatarMessage, error: e2 } = await admin
    .from('messages')
    .insert({ ...base, ...opts.reply })
    .select('*')
    .single();
  if (e2) throw e2;

  const quota = await consumeFreeMessage(opts.profile);
  background(maybeUpdateMemory(opts.avatar, opts.profile.is_pro));
  return { userMessage, avatarMessage, quota };
}
