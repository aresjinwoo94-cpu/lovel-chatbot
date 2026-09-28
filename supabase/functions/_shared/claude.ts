import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';

import { requireEnv } from './http.ts';
import type { ChatTurn, GenerateResult, JsonSchema } from './llm.ts';

/**
 * Integración con Claude (Anthropic).
 * Modelo por defecto: Claude Opus 5 (configurable con CLAUDE_MODEL).
 * - Pensamiento adaptativo + esfuerzo "low" por defecto: respuestas rápidas
 *   para un chat fluido (sube CLAUDE_EFFORT a "medium" si prefieres más matiz).
 * - `fallbacks: "default"`: si los clasificadores de seguridad rechazan una
 *   petición, la API la reintenta en el modelo recomendado automáticamente.
 * - El prompt de sistema se cachea (cache_control) para abaratar y acelerar.
 */
export const CLAUDE_MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-opus-5';
const EFFORT = (Deno.env.get('CLAUDE_EFFORT') ?? 'low') as 'low' | 'medium' | 'high';

// El cliente se crea al primer uso, así las funciones arrancan aunque se use Gemini.
let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') }));

const textOf = (content: Anthropic.Beta.BetaContentBlock[]) =>
  content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

/** Conversación. `extraSystem` va como mensaje de sistema a mitad de conversación (no rompe la caché). */
export async function claudeGenerate(opts: {
  system: string;
  turns: ChatTurn[];
  extraSystem?: string;
  maxTokens: number;
  cache?: boolean;
}): Promise<GenerateResult> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [...opts.turns];
  if (opts.extraSystem) messages.push({ role: 'system', content: opts.extraSystem });

  const response = await anthropic().beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: EFFORT },
    system: opts.cache ? [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }] : opts.system,
    messages,
  });
  if (response.stop_reason === 'refusal') return { text: '', refused: true };
  return { text: textOf(response.content), refused: false };
}

/** Imagen + instrucción → JSON que cumple el esquema (salida estructurada). */
export async function claudeImageJson(opts: {
  prompt: string;
  imageBase64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  schema: JsonSchema;
}): Promise<unknown | null> {
  const response = await anthropic().beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low', format: { type: 'json_schema', schema: { ...opts.schema, additionalProperties: false } } },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: opts.mediaType, data: opts.imageBase64 } },
          { type: 'text', text: opts.prompt },
        ],
      },
    ],
  });
  if (response.stop_reason === 'refusal') return null;
  try {
    return JSON.parse(textOf(response.content));
  } catch {
    return null;
  }
}
