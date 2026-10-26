import { supabase } from './supabase';

/**
 * WP-12: el personaje puede escribirte primero (apagado por defecto). Las reglas viven en
 * el servidor (supabase/functions/_shared/proactive.ts); aquí solo se guardan los ajustes.
 */
export type ProactiveMode = 'off' | 'sometimes' | 'often';
export const PROACTIVE_DAILY = { free: 1, pro: 3 } as const;
export const DEFAULT_QUIET = { start: 22, end: 9 } as const;

export async function setProactiveMode(avatarId: string, mode: ProactiveMode) {
  const { error } = await supabase.from('avatars').update({ proactive_mode: mode }).eq('id', avatarId);
  if (error) throw error;
}

export async function setQuietHours(userId: string, start: number, end: number) {
  const { error } = await supabase.from('profiles').update({ quiet_start: start, quiet_end: end }).eq('id', userId);
  if (error) throw error;
}

export const formatHour = (h: number) => `${String(h).padStart(2, '0')}:00`;
