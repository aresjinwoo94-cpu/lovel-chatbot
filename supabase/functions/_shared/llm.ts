import { claudeGenerate, claudeImageJson } from './claude.ts';
import { geminiGenerate, geminiImageJson } from './gemini.ts';
import { admin } from './supabase.ts';
import { buildMemoryPrompt, VOICE_REPLY_NOTE } from './systemPrompts.tsx';

/**
 * Capa única de IA: elige el proveedor con el secreto AI_PROVIDER.
 *   AI_PROVIDER=gemini     → Google Gemini (tiene plan gratuito)
 *   AI_PROVIDER=anthropic  → Claude
 * Si no se define, usa Anthropic cuando existe ANTHROPIC_API_KEY y, si no, Gemini.
 */
export type Provider = 'anthropic' | 'gemini';

export function provider(): Provider {
  const explicit = Deno.env.get('AI_PROVIDER')?.toLowerCase();
  if (explicit === 'gemini' || explicit === 'anthropic') return explicit;
  return Deno.env.get('ANTHROPIC_API_KEY') ? 'anthropic' : 'gemini';
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export interface GenerateResult {
  text: string;
  refused: boolean;
}
export interface JsonSchema {
  type: 'object' | 'string' | 'boolean' | 'number';
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: string[];
}

/** Mensajes previos de la conversación (alternando user/assistant, empezando por user). */
export async function loadHistory(avatarId: string, limit = 40): Promise<ChatTurn[]> {
  const { data, error } = await admin
    .from('messages')
    .select('role, kind, content')
    .eq('avatar_id', avatarId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const turns: ChatTurn[] = [];
  for (const m of (data ?? []).reverse()) {
    const role = m.role === 'user' ? 'user' : 'assistant';
    const content = m.kind === 'voice' && m.role === 'user' ? `(nota de voz) ${m.content}` : (m.content as string);
    if (!content.trim()) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n${content}`;
    else turns.push({ role, content });
  }
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns;
}

const SOFT_DECLINE = {
  es: 'Prefiero que no vayamos por ahí… pero sigo aquí contigo. ¿Me cuentas un poco más de cómo te sientes?',
  en: "I'd rather not go there… but I'm still here with you. Tell me a bit more about how you're feeling?",
};

/** Genera la respuesta del avatar con el proveedor configurado. */
export async function generateReply(opts: {
  system: string;
  history: ChatTurn[];
  userText: string;
  voice?: boolean;
  language: 'es' | 'en';
}): Promise<string> {
  const turns: ChatTurn[] = [...opts.history, { role: 'user', content: opts.userText }];
  const result =
    provider() === 'anthropic'
      ? await claudeGenerate({ system: opts.system, turns, extraSystem: opts.voice ? VOICE_REPLY_NOTE : undefined, maxTokens: 8000, cache: true })
      : await geminiGenerate({ system: opts.voice ? `${opts.system}\n\n## Ahora mismo\n${VOICE_REPLY_NOTE}` : opts.system, turns, maxTokens: 8000 });
  if (result.refused || !result.text) return SOFT_DECLINE[opts.language];
  return result.text;
}

/**
 * Memoria de largo plazo (Pro): cada 8 mensajes resume lo importante para que
 * el avatar "recuerde" en futuras conversaciones.
 */
export async function maybeUpdateMemory(avatar: { id: string; name: string; memory: string | null }, isPro: boolean) {
  if (!isPro) return;
  const { count } = await admin.from('messages').select('id', { count: 'exact', head: true }).eq('avatar_id', avatar.id);
  if (!count || count % 8 !== 0) return;

  const history = await loadHistory(avatar.id, 30);
  const transcript = history.map((t) => `${t.role === 'user' ? 'Persona' : avatar.name}: ${t.content}`).join('\n');
  const system = buildMemoryPrompt(avatar.name, avatar.memory);
  const turns: ChatTurn[] = [{ role: 'user', content: `Mensajes recientes:\n${transcript}` }];
  const result =
    provider() === 'anthropic'
      ? await claudeGenerate({ system, turns, maxTokens: 4000 })
      : await geminiGenerate({ system, turns, maxTokens: 4000 });
  if (!result.refused && result.text) await admin.from('avatars').update({ memory: result.text }).eq('id', avatar.id);
}

/** Imagen → JSON estructurado (para "Desde una foto" en el creador de avatar). */
export function analyzeImageToJson(opts: {
  prompt: string;
  imageBase64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  schema: JsonSchema;
}): Promise<unknown | null> {
  return provider() === 'anthropic' ? claudeImageJson(opts) : geminiImageJson(opts);
}
