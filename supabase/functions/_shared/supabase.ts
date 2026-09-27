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
  store_voice: boolean;
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
