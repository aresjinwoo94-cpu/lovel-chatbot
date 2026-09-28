import { SUPABASE_URL } from '@/constants/supabaseConfig';

import type { AvatarAppearance, Gender } from './types';

/**
 * Opciones de personalización de los avatares VRM (estilo VTuber).
 * Los colores de pelo/ojos/piel/ropa se aplican sobre las texturas del modelo
 * conservando sus luces y sombras, como en VRoid Studio.
 */

/** Modelos base (VRoid, ver avatar-stage/MODELS.md). */
export const BASE_MODELS = [
  { id: 'shibu', labelKey: 'model.shibu', thumb: require('@/assets/models/shibu.jpg') },
  { id: 'shino', labelKey: 'model.shino', thumb: require('@/assets/models/shino.jpg') },
  { id: 'mei', labelKey: 'model.mei', thumb: require('@/assets/models/mei.jpg') },
  { id: 'aria', labelKey: 'model.aria', thumb: require('@/assets/models/aria.jpg') },
] as const;

export type BaseModelId = (typeof BASE_MODELS)[number]['id'];

export const MODEL_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/vrm-models`;

/** Miniatura estática para un modelo (base o propio). */
export function modelThumb(model: string) {
  return BASE_MODELS.find((m) => m.id === model)?.thumb ?? BASE_MODELS[0].thumb;
}

// Mismo orden y valores que supabase/functions/_shared/palette.ts (análisis de fotos).
export const HAIR_COLORS = ['#5A2A2E', '#15121A', '#2A1D24', '#5A3A2E', '#D9B26F', '#B8452F', '#B9B6C2', '#E79AB8', '#4A6FB5'];
export const EYE_COLORS = ['#C2366B', '#6B3F2A', '#4F8A5B', '#4F78B5', '#8A6A3A', '#8E5BC8'];
export const SKIN_TONES = ['#FCEAE0', '#F7D9C6', '#EFC3A4', '#D69E78', '#A8704B', '#7A4A2E'];
export const OUTFIT_COLORS = ['#1E1B22', '#F4EDE4', '#E7B7B3', '#A9C0D9', '#B9CDB4', '#6B4E8C', '#8C2F3E'];

/** Escenas de fondo: [cielo arriba, cielo medio, horizonte]. */
export const BACKGROUNDS: string[][] = [
  ['#2E1446', '#C8284F', '#F7923A'], // atardecer (referencia)
  ['#0E1433', '#2B2F6B', '#7A62B0'], // noche
  ['#5B4C8C', '#B58BC4', '#F4C3C8'], // lavanda
  ['#F0A7BF', '#F7CDC6', '#FCE9CF'], // amanecer rosa
  ['#5AA7E0', '#9FD0F0', '#EAF5F7'], // día
];

/**
 * Avatar de referencia de Lovel House: pelo castaño rojizo, ojos rosados,
 * top negro de cuello alto y atardecer de fondo.
 */
export const DEFAULT_APPEARANCE: AvatarAppearance = {
  model: 'shibu',
  hairColor: '#5A2A2E',
  eyeColor: '#C2366B',
  skinTone: '#FCEAE0',
  outfitColor: '#1E1B22',
  background: BACKGROUNDS[0],
};

export function defaultAppearanceFor(_gender: Gender): AvatarAppearance {
  return { ...DEFAULT_APPEARANCE };
}

/** Normaliza avatares guardados con versiones anteriores de la app. */
export function normalizeAppearance(a: Partial<AvatarAppearance> | null | undefined): AvatarAppearance {
  return {
    model: a?.model || DEFAULT_APPEARANCE.model,
    hairColor: a?.hairColor || DEFAULT_APPEARANCE.hairColor,
    eyeColor: a?.eyeColor || DEFAULT_APPEARANCE.eyeColor,
    skinTone: a?.skinTone || DEFAULT_APPEARANCE.skinTone,
    outfitColor: a?.outfitColor || DEFAULT_APPEARANCE.outfitColor,
    background: a?.background?.length ? a.background : DEFAULT_APPEARANCE.background,
  };
}
