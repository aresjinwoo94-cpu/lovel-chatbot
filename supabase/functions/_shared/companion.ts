import { generateFirstMessage, generateOpening, generateReply, loadHistory, maybeUpdateMemory } from './llm.ts';
import { careViolations, detectLanguage, proactiveInstruction, wrongLanguage } from './proactive.ts';
import type { PlatinoState } from './platino.ts';
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
    tier: opts.profile.is_pro ? 'pro' : 'free',
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
    text = await generateOpening({ system: systemFor(opts.avatar, opts.profile), instruction: buildOpeningInstruction(opts.avatar), tier: opts.profile.is_pro ? 'pro' : 'free' });
  } catch (e) {
    console.error('opening', e);
  }
  // Si la IA no responde, el personaje abre igualmente con una frase propia (nunca pantalla vacía).
  // Un solo párrafo (a veces el modelo mete saltos de línea tras la acción).
  if (text) text = text.replace(/\s*\n+\s*/g, ' ').trim();
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
  platino: PlatinoState;
}): Promise<{ userMessage: unknown; avatarMessage: unknown; platino: PlatinoState }> {
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
  return { userMessage, avatarMessage, platino: opts.platino };
}

/**
 * WP-12: mensaje que el personaje escribe por su cuenta. Se comprueba contra las reglas de
 * cuidado y el idioma; si falla se intenta hasta dos veces más y, si sigue fallando, no se envía nada.
 */
export async function writeFirst(opts: { avatar: AvatarRow; profile: ProfileRow; hoursSilent: number }): Promise<{ text: string | null; rejected: string[] }> {
  const history = await loadHistory(opts.avatar.id, 30);
  // Idioma de la conversación (lo último que escribió la persona); si no hay, el del perfil.
  const lastUser = [...history].reverse().find((t) => t.role === 'user')?.content ?? '';
  const language = detectLanguage(lastUser) ?? (opts.profile.language === 'en' ? 'en' : 'es');
  const system = `${systemFor(opts.avatar, opts.profile)}\n\n## Ahora mismo\n${proactiveInstruction(language)}`;
  const rejected: string[] = [];
  for (let i = 0; i < 3; i++) {
    const text = await generateFirstMessage({ system, history, hoursSilent: opts.hoursSilent, language });
    if (!text) continue;
    const bad = careViolations(text);
    if (wrongLanguage(text, language)) bad.push(language === 'en' ? 'idioma (no está en inglés)' : 'idioma (no está en español)');
    if (!bad.length) return { text, rejected };
    rejected.push(`${bad.join(', ')}: ${text}`);
  }
  return { text: null, rejected };
}
