import type { Profile } from './types';

/**
 * Platino (WP-11), la moneda de Lovel House. Mismas reglas que el servidor
 * (supabase/functions/_shared/platino.ts y supabase/migrations/0012_platino.sql):
 * los saldos y descuentos se hacen allí; aquí solo se muestran.
 */
export const PLATINO_COST = { text: 1, voice: 8 } as const;
export type PlatinoKind = keyof typeof PLATINO_COST;
export const DAILY_PLATINO = 40;
export const GUEST_PLATINO = 15;
export const PRO_MONTHLY_PLATINO = 1500;

/** Lo que se vende, con su precio real en dólares (lo que se cobra). */
export const PRO = { id: 'pro' as const, usd: 9.9, platinoPerMonth: PRO_MONTHLY_PLATINO };
export const PACKS = [
  { id: 'pack_400' as const, platino: 400, usd: 1.99, kind: 'trial' as const },
  { id: 'pack_1200' as const, platino: 1200, usd: 4.99, kind: 'medium' as const },
];
export type ProductId = 'pro' | (typeof PACKS)[number]['id'];

export const formatUsd = (n: number) => `$${n.toFixed(2)} USD`;
/** 1.500 / 1,500: siempre con separador de miles (es-ES no agrupa las cifras de 4 dígitos). */
export const formatPlatino = (n: number, lang: 'es' | 'en' = 'es') =>
  String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : '.');

/** Lo que devuelve el servidor tras cada gasto. */
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

/** Día de hoy (AAAA-MM-DD) en una zona horaria. */
export function todayIn(tz: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/**
 * Saldo que se ve, a partir del perfil: si el diario es de otro día, ya se ha renovado
 * (el servidor lo renueva en el próximo gasto); si la suscripción venció, ya no cuenta.
 */
export function platinoFromProfile(p: Profile | null, guest: boolean, now = new Date()): PlatinoState | null {
  if (!p) return null;
  const tz = p.timezone || 'UTC';
  const dailyOn = p.platino_daily_on ?? null;
  const daily = guest ? 0 : !dailyOn || dailyOn < todayIn(tz, now) ? DAILY_PLATINO : (p.platino_daily ?? 0);
  const subActive = !p.platino_sub_until || new Date(p.platino_sub_until).getTime() > now.getTime();
  const sub = subActive ? (p.platino_sub ?? 0) : 0;
  const gift = p.platino_gift ?? 0;
  const bought = p.platino_bought ?? 0;
  return { daily, sub, gift, bought, total: daily + sub + gift + bought, dailyAmount: guest ? 0 : DAILY_PLATINO, dailyOn, subUntil: p.platino_sub_until ?? null, timezone: tz, isPro: p.is_pro, guest };
}

/** Si ya pasó la medianoche desde ese saldo, el diario está renovado (el servidor lo hará en el próximo gasto). */
export function rollover(s: PlatinoState, now = new Date()): PlatinoState {
  if (s.guest || (s.dailyOn && s.dailyOn >= todayIn(s.timezone, now))) return s;
  const daily = DAILY_PLATINO;
  return { ...s, daily, total: s.total - s.daily + daily };
}

/** Lo más reciente entre el perfil y la última respuesta del servidor. */
export function freshest(fromProfile: PlatinoState | null, fromServer: PlatinoState | null, now = new Date()): PlatinoState | null {
  if (!fromServer) return fromProfile;
  if (!fromProfile) return rollover(fromServer, now);
  // la respuesta del servidor es de esta sesión: manda, salvo que el perfil ya sea de un día posterior
  if (fromProfile.dailyOn && fromServer.dailyOn && fromProfile.dailyOn > fromServer.dailyOn) return fromProfile;
  return rollover({ ...fromServer, isPro: fromServer.isPro || fromProfile.isPro }, now);
}

/** Cuánto falta para la próxima medianoche (cuando se renueva el diario), en minutos. */
export function minutesToReset(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(1, Math.round((next.getTime() - now.getTime()) / 60000));
}

export function resetIn(lang: 'es' | 'en', now = new Date()): string {
  const m = minutesToReset(now);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (lang === 'en') return h ? `${h} h ${mm} min` : `${mm} min`;
  return h ? `${h} h ${mm} min` : `${mm} min`;
}

export const canAfford = (s: PlatinoState | null, kind: PlatinoKind) => !s || s.total >= PLATINO_COST[kind];

/** Zona horaria del dispositivo (para que el diario se renueve a su medianoche). */
export function deviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
