import { HttpError } from './http.ts';
import { admin, type ProfileRow } from './supabase.ts';

/**
 * Periodo gratuito: 5 mensajes o 2 minutos de conversación (lo que ocurra primero).
 * Después, la app muestra el modal de Pro y el backend responde 402 PAYWALL.
 * Mantener sincronizado con src/lib/billing.ts.
 */
export const FREE_MESSAGE_LIMIT = 5;
export const FREE_SECONDS = 120;

export interface QuotaState {
  isPro: boolean;
  messagesUsed: number;
  messagesLimit: number;
  trialStartedAt: string | null;
  secondsLimit: number;
  exhausted: boolean;
}

export function quotaState(p: ProfileRow): QuotaState {
  const elapsed = p.trial_started_at ? (Date.now() - new Date(p.trial_started_at).getTime()) / 1000 : 0;
  return {
    isPro: p.is_pro,
    messagesUsed: p.free_messages_used,
    messagesLimit: FREE_MESSAGE_LIMIT,
    trialStartedAt: p.trial_started_at,
    secondsLimit: FREE_SECONDS,
    exhausted: !p.is_pro && (p.free_messages_used >= FREE_MESSAGE_LIMIT || elapsed >= FREE_SECONDS),
  };
}

/** Lanza 402 si la prueba gratuita terminó. */
export function assertCanChat(p: ProfileRow) {
  if (quotaState(p).exhausted) {
    throw new HttpError(402, '¿Quieres continuar hablando ilimitadamente con este avatar?', 'PAYWALL');
  }
}

/** Cuenta un mensaje gratuito (atómico en SQL) y devuelve el estado actualizado. */
export async function consumeFreeMessage(p: ProfileRow): Promise<QuotaState> {
  if (p.is_pro) return quotaState(p);
  const { data, error } = await admin.rpc('consume_free_message', { p_user: p.id });
  if (error) throw error;
  return quotaState(data as ProfileRow);
}
