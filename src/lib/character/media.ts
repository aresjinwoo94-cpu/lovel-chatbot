import type { ImageSourcePropType } from 'react-native';

import { SUPABASE_URL } from '@/constants/supabaseConfig';

import { PRESETS } from './catalog';
import type { CharacterLook } from './types';

/** Modelos VRM base (bucket público de Supabase, texturas optimizadas para móvil). */
export const MODEL_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/vrm-models`;

/** Retratos generados con scripts/render-characters.mjs a partir del 3D real. */
const PRESET_PORTRAITS: Record<string, ImageSourcePropType> = {
  aiko: require('@/assets/characters/presets/aiko.jpg'),
  kai: require('@/assets/characters/presets/kai.jpg'),
  mei: require('@/assets/characters/presets/mei.jpg'),
  ren: require('@/assets/characters/presets/ren.jpg'),
  nyx: require('@/assets/characters/presets/nyx.jpg'),
  luna: require('@/assets/characters/presets/luna.jpg'),
  dante: require('@/assets/characters/presets/dante.jpg'),
  victoria: require('@/assets/characters/presets/victoria.jpg'),
  zoe: require('@/assets/characters/presets/zoe.jpg'),
  vita: require('@/assets/characters/presets/vita.jpg'),
  hana: require('@/assets/characters/presets/hana.jpg'),
  sora: require('@/assets/characters/presets/sora.jpg'),
};

const PRESET_FACES: Record<string, ImageSourcePropType> = {
  aiko: require('@/assets/characters/faces/aiko.jpg'),
  kai: require('@/assets/characters/faces/kai.jpg'),
  mei: require('@/assets/characters/faces/mei.jpg'),
  ren: require('@/assets/characters/faces/ren.jpg'),
  nyx: require('@/assets/characters/faces/nyx.jpg'),
  luna: require('@/assets/characters/faces/luna.jpg'),
  dante: require('@/assets/characters/faces/dante.jpg'),
  victoria: require('@/assets/characters/faces/victoria.jpg'),
  zoe: require('@/assets/characters/faces/zoe.jpg'),
  vita: require('@/assets/characters/faces/vita.jpg'),
  hana: require('@/assets/characters/faces/hana.jpg'),
  sora: require('@/assets/characters/faces/sora.jpg'),
};

const MODEL_PORTRAITS: Record<string, ImageSourcePropType> = {
  bibi: require('@/assets/characters/models/bibi.jpg'),
  shino: require('@/assets/characters/models/shino.jpg'),
  noir: require('@/assets/characters/models/noir.jpg'),
  victoria: require('@/assets/characters/models/victoria.jpg'),
  vita: require('@/assets/characters/models/vita.jpg'),
  hair_f: require('@/assets/characters/models/hair_f.jpg'),
  shibu: require('@/assets/characters/models/shibu.jpg'),
  mei: require('@/assets/characters/models/mei.jpg'),
  sample_b: require('@/assets/characters/models/sample_b.jpg'),
  aria: require('@/assets/characters/models/aria.jpg'),
  fumiriya: require('@/assets/characters/models/fumiriya.jpg'),
  hair_m: require('@/assets/characters/models/hair_m.jpg'),
  base_f: require('@/assets/characters/models/base_f.jpg'),
  base_m: require('@/assets/characters/models/base_m.jpg'),
};

export const presetPortrait = (id: string) => PRESET_PORTRAITS[id];
export const modelPortrait = (id: string) => MODEL_PORTRAITS[id];

/** Si el aspecto coincide exactamente con un personaje listo, su retrato. */
function presetFor(look: CharacterLook) {
  const key = JSON.stringify(look);
  return PRESETS.find((p) => JSON.stringify(p.look) === key);
}

/**
 * Foto de perfil de un personaje (cuadrada, primer plano):
 * la captura guardada al crearlo, o el retrato del personaje listo / del modelo base.
 */
export function faceImage(opts: { imageUrl?: string | null; look: CharacterLook }): ImageSourcePropType {
  if (opts.imageUrl) return { uri: opts.imageUrl };
  const preset = presetFor(opts.look);
  if (preset) return PRESET_FACES[preset.id];
  return MODEL_PORTRAITS[opts.look.model] ?? PRESET_FACES.aiko;
}
