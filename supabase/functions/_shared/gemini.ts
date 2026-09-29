import { HttpError, requireEnv } from './http.ts';
import type { ChatTurn, GenerateResult } from './llm.ts';

/**
 * Integración con Google Gemini (API REST, sin SDK).
 * Modelo por defecto: Gemini 3.5 Flash-Lite (responde en ~1 s, ideal para chat).
 * Configurable con GEMINI_MODEL. Si Google responde que el
 * modelo está saturado (429/500/503), probamos automáticamente con el siguiente.
 */
const API = 'https://generativelanguage.googleapis.com/v1beta/models';

function modelChain(): string[] {
  const preferred = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite';
  return [...new Set([preferred, 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-flash-latest'])];
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code: number; message: string };
}

const BLOCKED = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION']);

async function callGemini(body: Record<string, unknown>): Promise<GenerateResult> {
  let lastError = '';
  for (const model of modelChain()) {
    const res = await fetch(`${API}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': requireEnv('GEMINI_API_KEY'), 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as GeminiResponse;
    if (!res.ok) {
      lastError = `${res.status} ${data.error?.message ?? ''}`;
      // Saturado o límite gratuito: probamos el siguiente modelo.
      if (res.status === 429 || res.status >= 500 || res.status === 404) continue;
      throw new HttpError(502, `Gemini: ${lastError}`);
    }
    if (data.promptFeedback?.blockReason) return { text: '', refused: true };
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason && BLOCKED.has(candidate.finishReason)) return { text: '', refused: true };
    const text = (candidate?.content?.parts ?? [])
      .filter((p) => !p.thought && p.text)
      .map((p) => p.text)
      .join('')
      .trim();
    return { text, refused: false };
  }
  if (lastError.startsWith('429')) {
    throw new HttpError(503, 'Hay mucha demanda en este momento. Inténtalo de nuevo en un minuto.', 'AI_BUSY');
  }
  throw new HttpError(502, `Gemini no disponible: ${lastError}`, 'AI_BUSY');
}

/** Conversación: system prompt + historial alternado. */
export function geminiGenerate(opts: { system: string; turns: ChatTurn[]; maxTokens: number }): Promise<GenerateResult> {
  return callGemini({
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.turns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
    generationConfig: { maxOutputTokens: opts.maxTokens },
  });
}
