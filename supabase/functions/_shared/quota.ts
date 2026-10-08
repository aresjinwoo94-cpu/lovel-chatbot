import { HttpError } from './http.ts';
import { admin, type ProfileRow } from './supabase.ts';

/**
 * Plan gratuito: 25 mensajes de texto + 3 notas de voz por cuenta.
 * Los contadores viven en la base de datos (no se reinician al recargar ni
 * borrando personajes) y solo el backend puede cambiarlos.
 * Mantener sincronizado con src/lib/billing.ts.
 */
export const FREE_TEXT_LIMIT = 25;
export const FREE_VOICE_LIMIT = 3;
/** Invitados (sesión anónima, sin cuenta): pueden probar la historia; para seguir, cuenta gratis. */
export const GUEST_TEXT_LIMIT = 10;
export const GUEST_VOICE_LIMIT = 0;

export type QuotaKind = 'text' | 'voice';

export interface QuotaState {
  isPro: boolean;
  textUsed: number;
  textLimit: number;
  voiceUsed: number;
  voiceLimit: number;
}

export function quotaState(p: ProfileRow, guest = false): QuotaState {
  return {
    isPro: p.is_pro,
    textUsed: p.free_messages_used ?? 0,
    textLimit: guest ? GUEST_TEXT_LIMIT : FREE_TEXT_LIMIT,
    voiceUsed: p.free_voice_used ?? 0,
    voiceLimit: guest ? GUEST_VOICE_LIMIT : FREE_VOICE_LIMIT,
  };
}

const GUEST_MESSAGE: Record<QuotaKind, string> = {
  text: 'Crea tu cuenta gratis para seguir la historia.',
  voice: 'Crea tu cuenta gratis para enviar notas de voz.',
};

const PAYWALL_MESSAGE: Record<QuotaKind, string> = {
  text: 'Usaste tus 25 mensajes gratis. Con Pro la historia sigue sin límites.',
  voice: 'Usaste tus 3 notas de voz gratis. Con Pro puedes hablar sin límites.',
};

/**
 * Reserva el mensaje ANTES de llamar a la IA, de forma atómica en SQL:
 * si no queda cupo responde 402 PAYWALL. Pro no consume nada.
 */
export async function reserveFree(p: ProfileRow, kind: QuotaKind, guest = false): Promise<QuotaState> {
  if (p.is_pro) return quotaState(p, guest);
  const limit = guest ? (kind === 'voice' ? GUEST_VOICE_LIMIT : GUEST_TEXT_LIMIT) : kind === 'voice' ? FREE_VOICE_LIMIT : FREE_TEXT_LIMIT;
  const { data, error } = await admin.rpc('reserve_free_message', { p_user: p.id, p_kind: kind, p_limit: limit });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as ProfileRow | undefined;
  if (!row) throw guest ? new HttpError(403, GUEST_MESSAGE[kind], 'NEEDS_ACCOUNT') : new HttpError(402, PAYWALL_MESSAGE[kind], 'PAYWALL');
  return quotaState(row, guest);
}

/** Si la respuesta falló, devolvemos el cupo (la persona no pierde su mensaje). */
export async function refundFree(p: ProfileRow, kind: QuotaKind) {
  if (p.is_pro) return;
  await admin.rpc('refund_free_message', { p_user: p.id, p_kind: kind });
}
