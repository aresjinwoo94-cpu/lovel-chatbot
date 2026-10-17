import { createClient } from 'npm:@supabase/supabase-js@2';

import { HttpError, requireEnv } from './http.ts';

/**
 * Cliente con service role (salta RLS). Solo se usa en el backend, siempre
 * filtrando explícitamente por el usuario autenticado.
 */
export const admin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  language: 'es' | 'en';
  is_pro: boolean;
  stripe_customer_id: string | null;
  trial_started_at: string | null;
  free_messages_used: number;
  free_voice_used: number;
  store_voice: boolean;
  adult_confirmed_at: string | null;
}

export interface AvatarRow {
  id: string;
  user_id: string;
  name: string;
  gender: 'female' | 'male' | 'other';
  age: number;
  appearance: Record<string, unknown>;
  appearance_description: string | null;
  situation_description: string;
  avatar_image_url: string | null;
  voice_id: string | null;
  memory: string | null;
  traits: string[] | null;
  scenario_id: string | null;
}

/** Valida el JWT de Supabase que envía la app y devuelve el usuario. */
export async function requireUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'No autenticado');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Sesión inválida');
  return data.user;
}

export async function getProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await admin.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) throw new HttpError(404, 'Perfil no encontrado');
  return data as ProfileRow;
}

/**
 * Lovel House es solo para mayores de 18. La app manda `adultConfirmed: true`
 * cuando la persona pasó la puerta 18+ en ese dispositivo; la primera vez se
 * guarda en el perfil. Sin confirmación (ni guardada ni enviada) se rechaza.
 */
export async function requireAdult(profile: ProfileRow, claimed: unknown): Promise<void> {
  if (profile.adult_confirmed_at) return;
  if (claimed !== true) throw new HttpError(403, 'Lovel House es solo para mayores de 18 años.', 'AGE_REQUIRED');
  const now = new Date().toISOString();
  await admin.from('profiles').update({ adult_confirmed_at: now }).eq('id', profile.id).is('adult_confirmed_at', null);
  profile.adult_confirmed_at = now;
}

export async function getOwnedAvatar(userId: string, avatarId: string): Promise<AvatarRow> {
  const { data, error } = await admin.from('avatars').select('*').eq('id', avatarId).eq('user_id', userId).single();
  if (error || !data) throw new HttpError(404, 'Avatar no encontrado');
  return data as AvatarRow;
}

export async function getConversationId(avatarId: string): Promise<string> {
  const { data, error } = await admin.from('conversations').select('id').eq('avatar_id', avatarId).single();
  if (error || !data) throw new HttpError(404, 'Conversación no encontrada');
  return data.id as string;
}
