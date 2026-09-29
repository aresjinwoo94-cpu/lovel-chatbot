import { generateOpening, generateReply, loadHistory, maybeUpdateMemory } from './llm.ts';
import type { QuotaState } from './quota.ts';
import { background } from './runtime.ts';
import { admin, type AvatarRow, type ProfileRow } from './supabase.ts';
import { buildCompanionSystemPrompt, buildOpeningInstruction } from './systemPrompts.tsx';

const systemFor = (avatar: AvatarRow, profile: ProfileRow) =>
  buildCompanionSystemPrompt({
    avatar,
    userName: profile.display_name,
    language: profile.language,
    memoryEnabled: profile.is_pro,
  });

/** Respuesta del personaje (Gemini o Claude) según su personalidad y la escena. */
export async function replyAsAvatar(opts: { avatar: AvatarRow; profile: ProfileRow; userText: string; voice?: boolean }) {
  const history = await loadHistory(opts.avatar.id);
  return generateReply({
    system: systemFor(opts.avatar, opts.profile),
    history,
    userText: opts.userText,
    voice: opts.voice,
    language: opts.profile.language,
  });
}

const FALLBACK_OPENING = {
  es: (name: string) => `*${name} levanta la vista y te sonríe, como si llevara un rato esperándote.* Por fin llegas… ¿Tienes un momento? Hay algo que quiero contarte.`,
  en: (name: string) => `*${name} looks up and smiles, as if they had been waiting for you.* You're finally here… Do you have a minute? There's something I want to tell you.`,
};

/**
 * Primer mensaje: el personaje abre la escena. Solo si la conversación está vacía
 * (idempotente) y no cuenta para el plan gratuito.
 */
export async function openScene(opts: { avatar: AvatarRow; profile: ProfileRow; conversationId: string }) {
  const { count } = await admin.from('messages').select('id', { count: 'exact', head: true }).eq('avatar_id', opts.avatar.id);
  if (count) return null;
  let text: string | null = null;
  try {
    text = await generateOpening({ system: systemFor(opts.avatar, opts.profile), instruction: buildOpeningInstruction(opts.avatar) });
  } catch (e) {
    console.error('opening', e);
  }
  // Si la IA no responde, el personaje abre igualmente con una frase propia (nunca pantalla vacía).
  const content = text ?? FALLBACK_OPENING[opts.profile.language === 'en' ? 'en' : 'es'](opts.avatar.name);
  // Otra petición pudo abrir la escena mientras tanto.
  const { count: again } = await admin.from('messages').select('id', { count: 'exact', head: true }).eq('avatar_id', opts.avatar.id);
  if (again) return null;
  const { data, error } = await admin
    .from('messages')
    .insert({ conversation_id: opts.conversationId, avatar_id: opts.avatar.id, user_id: opts.profile.id, role: 'avatar', kind: 'text', content })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

interface NewMessage {
  role: 'user' | 'avatar';
  kind: 'text' | 'voice';
  content: string;
  audio_path?: string | null;
  audio_duration_ms?: number | null;
}

/**
 * Guarda el mensaje de la persona y la respuesta del personaje (en ese orden)
 * y actualiza la memoria en segundo plano. El cupo gratuito ya se reservó antes.
 */
export async function saveExchange(opts: {
  avatar: AvatarRow;
  profile: ProfileRow;
  conversationId: string;
  user: NewMessage;
  reply: NewMessage;
  quota: QuotaState;
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

  background(maybeUpdateMemory(opts.avatar, opts.profile.is_pro));
  return { userMessage, avatarMessage, quota: opts.quota };
}
