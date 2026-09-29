import { supabase } from './supabase';
import { callFunction } from './api';
import type { Avatar, AvatarAppearance, Gender, Message, StartChatResponse } from './types';

/** Lista de avatares con el último mensaje (vista `avatar_threads`). */
export interface AvatarThread extends Avatar {
  last_content: string | null;
  last_kind: 'text' | 'voice' | null;
  last_role: 'user' | 'avatar' | null;
  message_count: number;
}

export async function fetchAvatarThreads(): Promise<AvatarThread[]> {
  const { data, error } = await supabase
    .from('avatar_threads')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AvatarThread[];
}

export async function fetchAvatar(id: string): Promise<Avatar> {
  const { data, error } = await supabase.from('avatars').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Avatar;
}

export interface NewAvatar {
  name: string;
  gender: Gender;
  age: number;
  appearance: AvatarAppearance;
  appearance_description: string;
  situation_description: string;
  traits: string[];
  scenario_id: string | null;
}

/** Crea el avatar. La conversación se crea sola con un trigger en la base de datos. */
export async function createAvatar(input: NewAvatar): Promise<Avatar> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('No hay sesión');
  const { data, error } = await supabase
    .from('avatars')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single();
  if (error) throw error;
  return data as Avatar;
}

export async function deleteAvatar(id: string) {
  const { error } = await supabase.from('avatars').delete().eq('id', id);
  if (error) throw error;
}

export const PAGE_SIZE = 30;

/**
 * Mensajes paginados del más nuevo al más viejo (scroll infinito hacia arriba).
 * `before` es el created_at del mensaje más antiguo que ya tenemos.
 */
export async function fetchMessages(avatarId: string, before?: string): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('avatar_id', avatarId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Message[];
}

/** Todos los mensajes (para exportar), del más antiguo al más nuevo. */
export async function fetchAllMessages(avatarId: string): Promise<Message[]> {
  const all: Message[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('avatar_id', avatarId)
      .order('created_at', { ascending: true })
      .range(from, from + 499);
    if (error) throw error;
    all.push(...((data ?? []) as Message[]));
    if (!data || data.length < 500) break;
    from += 500;
  }
  return all;
}

/** URL firmada (1 hora) para reproducir un audio privado. */
export async function signedAudioUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('voice-messages').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function countUserMessages(): Promise<number> {
  const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true });
  return count ?? 0;
}

export async function updateProfile(fields: { display_name?: string; language?: string; store_voice?: boolean }) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (error) throw error;
}

/** Pide al personaje su primer mensaje (solo si la conversación está vacía). */
export function startChat(avatarId: string) {
  return callFunction<StartChatResponse>('start-chat', { avatarId });
}
