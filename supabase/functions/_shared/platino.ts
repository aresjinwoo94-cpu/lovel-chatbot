import { HttpError } from './http.ts';
import { admin } from './supabase.ts';

/**
 * Platino (WP-11): la moneda de la app. Mantener sincronizado con src/lib/platino.ts.
 * Saldos y reglas viven en la base de datos (supabase/migrations/0012_platino.sql):
 * diario 40 (cuentas, se renueva a medianoche local, no se acumula) → suscripción Pro
 * 1.500/mes → regalo de invitado 15 → comprado (no caduca).
 */
export const PLATINO_COST = { text: 1, voice: 8 } as const;
export type PlatinoKind = keyof typeof PLATINO_COST;

/** Lo que se vende. Los importes son los que ve la persona al pagar (USD). */
export const PRODUCTS = {
  pro: { kind: 'subscription', cents: 990, platinoPerMonth: 1500, name: 'Lovel House Pro' },
  pack_400: { kind: 'pack', cents: 199, platino: 400, name: 'Paquete de prueba · 400 Platino' },
  pack_1200: { kind: 'pack', cents: 499, platino: 1200, name: 'Paquete mediano · 1.200 Platino' },
} as const;
export type ProductId = keyof typeof PRODUCTS;
export const isPack = (id: string): id is 'pack_400' | 'pack_1200' => id === 'pack_400' || id === 'pack_1200';

export interface PlatinoState {
  daily: number;
  sub: number;
  gift: number;
  bought: number;
  total: number;
  dailyAmount: number;
  dailyOn: string | null;
  subUntil: string | null;
  timezone: string;
  isPro: boolean;
  guest: boolean;
}

export async function platinoState(userId: string): Promise<PlatinoState> {
  const { data, error } = await admin.rpc('platino_state', { p_user: userId });
  if (error) throw error;
  return data as PlatinoState;
}

const EMPTY_MESSAGE = {
  guest: 'Se terminó tu Platino de prueba. Crea tu cuenta gratis y cada día tendrás 40 Platino.',
  account: 'Te quedaste sin Platino por hoy.',
};

/**
 * Gasta ANTES de llamar a la IA (atómico en SQL): la respuesta del personaje nunca se corta a
 * mitad. Si no alcanza: 402 PLATINO_EMPTY (o 403 NEEDS_ACCOUNT si es invitado) con el saldo.
 */
export async function spendPlatino(userId: string, kind: PlatinoKind, guest: boolean): Promise<{ ledgerId: number; state: PlatinoState }> {
  const { data, error } = await admin.rpc('platino_spend', { p_user: userId, p_amount: PLATINO_COST[kind], p_reason: kind });
  if (error) throw error;
  const r = data as { ok: boolean; ledgerId?: number; state: PlatinoState };
  if (!r.ok) {
    throw guest
      ? new HttpError(403, EMPTY_MESSAGE.guest, 'NEEDS_ACCOUNT', { platino: r.state, cost: PLATINO_COST[kind] })
      : new HttpError(402, EMPTY_MESSAGE.account, 'PLATINO_EMPTY', { platino: r.state, cost: PLATINO_COST[kind] });
  }
  return { ledgerId: r.ledgerId!, state: r.state };
}

/** Si la respuesta falló, la persona recupera su Platino (una sola vez por gasto). */
export async function refundPlatino(ledgerId: number): Promise<PlatinoState | null> {
  const { data, error } = await admin.rpc('platino_refund', { p_ledger: ledgerId });
  if (error) {
    console.error('refund', error);
    return null;
  }
  return data as PlatinoState | null;
}
