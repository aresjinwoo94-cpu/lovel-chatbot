import type { CharacterLook } from './character/types';

/**
 * Tipos de dominio de Lovel House.
 * Reflejan exactamente las tablas de supabase/migrations/0001_init.sql.
 */

export type Gender = 'female' | 'male' | 'other';

/** Aspecto del personaje 2D por capas (ver src/lib/character). */
export type { CharacterLook as AvatarAppearance } from './character/types';

export type Expression = 'neutral' | 'smile' | 'thinking' | 'talking';

export interface Avatar {
  id: string;
  user_id: string;
  name: string;
  gender: Gender;
  age: number;
  appearance: CharacterLook;
  appearance_description: string | null;
  situation_description: string;
  avatar_image_url: string | null;
  use_portrait: boolean;
  voice_id: string | null;
  memory: string | null;
  traits: string[];
  scenario_id: string | null;
  created_at: string;
  last_message_at: string | null;
}

export type MessageRole = 'user' | 'avatar';
export type MessageKind = 'text' | 'voice';

export interface Message {
  id: string;
  conversation_id: string;
  avatar_id: string;
  user_id: string;
  role: MessageRole;
  kind: MessageKind;
  content: string;
  audio_path: string | null;
  audio_duration_ms: number | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  avatar_id: string;
  user_id: string;
  started_at: string;
  updated_at: string;
}

export type Language = 'es' | 'en';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  language: Language;
  is_pro: boolean;
  subscription_status: string | null;
  current_period_end: string | null;
  trial_started_at: string | null;
  free_messages_used: number;
  free_voice_used: number;
  store_voice: boolean;
  created_at: string;
}

/** Cupo del plan gratuito que devuelven las Edge Functions. */
export interface QuotaState {
  isPro: boolean;
  textUsed: number;
  textLimit: number;
  voiceUsed: number;
  voiceLimit: number;
}

export interface ChatResponse {
  userMessage: Message;
  avatarMessage: Message;
  quota: QuotaState;
}

export interface VoiceChatResponse extends ChatResponse {
  /** MP3 de la respuesta en base64 (null si la voz falló y respondió por escrito). */
  replyAudioBase64: string | null;
}

export interface StartChatResponse {
  message: Message | null;
  quota: QuotaState;
}
