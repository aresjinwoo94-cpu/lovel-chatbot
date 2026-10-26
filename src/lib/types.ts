import type { PlatinoState } from './platino';

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
  /** Personaje del catálogo del que parte (null si se creó desde cero). */
  preset_id: string | null;
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
  store_voice: boolean;
  // Platino (WP-11): saldos por tipo, los gasta y acredita solo el servidor
  platino_daily: number;
  platino_daily_on: string | null;
  platino_sub: number;
  platino_sub_until: string | null;
  platino_gift: number;
  platino_bought: number;
  /** Zona horaria (IANA) para la medianoche del Platino diario. */
  timezone: string;
  /** Cuándo confirmó que es mayor de 18 (puerta 18+). */
  adult_confirmed_at: string | null;
  created_at: string;
}

export interface ChatResponse {
  userMessage: Message;
  avatarMessage: Message;
  /** Saldo de Platino tras el gasto. */
  platino: PlatinoState;
}

export interface VoiceChatResponse extends ChatResponse {
  /** MP3 de la respuesta en base64 (null si la voz falló y respondió por escrito). */
  replyAudioBase64: string | null;
}

export interface StartChatResponse {
  message: Message | null;
  platino: PlatinoState;
}
