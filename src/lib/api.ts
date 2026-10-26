import { FunctionsHttpError } from '@supabase/supabase-js';

import { adultConfirmedHere } from './ageStore';
import { supabase } from './supabase';

/** Error de una Edge Function con su código (p. ej. PAYWALL, AVATAR_LIMIT). */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    /** Cuerpo completo de la respuesta (p. ej. el saldo de Platino al quedarse sin él). */
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Funciones del chat: el servidor exige la confirmación 18+ (ver requireAdult). */
const ADULT_ONLY = new Set(['chat', 'start-chat', 'voice-chat']);

/**
 * Llama a una Edge Function de Supabase con el token del usuario.
 * Todas las claves secretas (Claude, ElevenLabs, Leonardo, Stripe) viven allí.
 */
export async function callFunction<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const payload = ADULT_ONLY.has(name) ? { ...body, adultConfirmed: await adultConfirmedHere() } : (body ?? {});
  const { data, error } = await supabase.functions.invoke(name, { body: payload });
  if (error) {
    let status = 0;
    let code: string | undefined;
    let data: Record<string, unknown> | undefined;
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      status = error.context.status;
      try {
        const payload = await error.context.json();
        code = payload.code;
        data = payload;
        message = payload.message ?? payload.error ?? message;
      } catch {
        // cuerpo no JSON: dejamos el mensaje original
      }
    }
    throw new ApiError(message, status, code, data);
  }
  return data as T;
}

/** Sin Platino suficiente (el servidor manda el saldo en `data.platino`). */
export const isPlatinoEmpty = (e: unknown) => e instanceof ApiError && e.code === 'PLATINO_EMPTY';
