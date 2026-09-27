import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from './supabase';

/** Error de una Edge Function con su código (p. ej. PAYWALL, AVATAR_LIMIT). */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

/**
 * Llama a una Edge Function de Supabase con el token del usuario.
 * Todas las claves secretas (Claude, ElevenLabs, Leonardo, Stripe) viven allí.
 */
export async function callFunction<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (error) {
    let status = 0;
    let code: string | undefined;
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      status = error.context.status;
      try {
        const payload = await error.context.json();
        code = payload.code;
        message = payload.message ?? payload.error ?? message;
      } catch {
        // cuerpo no JSON: dejamos el mensaje original
      }
    }
    throw new ApiError(message, status, code);
  }
  return data as T;
}

export const isPaywall = (e: unknown) => e instanceof ApiError && e.code === 'PAYWALL';
