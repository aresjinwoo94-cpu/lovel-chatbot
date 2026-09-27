import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';

import { requireEnv } from './http.ts';
import { admin } from './supabase.ts';
import { buildMemoryPrompt, VOICE_REPLY_NOTE } from './systemPrompts.tsx';

/**
 * Integración con Claude (Anthropic).
 * Modelo por defecto: Claude Opus 5 (configurable con CLAUDE_MODEL).
 * - Pensamiento adaptativo + esfuerzo "low" por defecto: respuestas rápidas
 *   para un chat fluido (sube CLAUDE_EFFORT a "medium" si prefieres más matiz).
 * - `fallbacks: "default"`: si los clasificadores de seguridad rechazan una
 *   petición, la API la reintenta en el modelo recomendado automáticamente.
 * - El prompt de sistema se cachea (cache_control) para abaratar y acelerar.
 */
export const anthropic = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
export const CLAUDE_MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-opus-5';
const EFFORT = (Deno.env.get('CLAUDE_EFFORT') ?? 'low') as 'low' | 'medium' | 'high';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/** Mensajes previos de la conversación en formato Claude (alternando user/assistant). */
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
    // Fusiona turnos consecutivos del mismo rol para mantener la alternancia.
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n${content}`;
    else turns.push({ role, content });
  }
  // La conversación debe empezar con el usuario.
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns;
}

const SOFT_DECLINE = {
  es: 'Prefiero que no vayamos por ahí… pero sigo aquí contigo. ¿Me cuentas un poco más de cómo te sientes?',
  en: "I'd rather not go there… but I'm still here with you. Tell me a bit more about how you're feeling?",
};

/** Genera la respuesta del avatar. */
export async function generateReply(opts: {
  system: string;
  history: ChatTurn[];
  userText: string;
  voice?: boolean;
  language: 'es' | 'en';
}): Promise<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [...opts.history, { role: 'user', content: opts.userText }];
  // Nota de voz: instrucción a mitad de conversación (no rompe la caché del prompt principal).
  if (opts.voice) messages.push({ role: 'system', content: VOICE_REPLY_NOTE });

  const response = await anthropic.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: EFFORT },
    system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
    messages,
  });

  if (response.stop_reason === 'refusal') return SOFT_DECLINE[opts.language];

  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  return text || SOFT_DECLINE[opts.language];
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
  const response = await anthropic.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: buildMemoryPrompt(avatar.name, avatar.memory),
    messages: [{ role: 'user', content: `Mensajes recientes:\n${transcript}` }],
  });
  if (response.stop_reason === 'refusal') return;
  const memory = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (memory) await admin.from('avatars').update({ memory }).eq('id', avatar.id);
}
