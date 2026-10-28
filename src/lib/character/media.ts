import type { ImageSourcePropType } from 'react-native';

import { SUPABASE_URL } from '@/constants/supabaseConfig';

import { ageRange, applyAge } from './ageRanges';
import { PRESETS } from './catalog';
import type { CharacterLook } from './types';

/** Modelos VRM base (bucket público de Supabase, texturas optimizadas para móvil). */
// v2: texturas re-codificadas, geometría con EXT_meshopt_compression y peinados "solo pelo"
// (scripts/optimize-vrm.cjs, make-hair-vrm.cjs, meshopt-vrm.cjs). Las versiones antiguas de la app
// siguen leyendo la raíz del bucket, que no cambia.
export const MODEL_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/vrm-models/v2`;

/** Retratos generados con scripts/render-characters.mjs a partir del 3D real. */
const PRESET_PORTRAITS: Record<string, ImageSourcePropType> = {
  nyx: require('@/assets/characters/presets/nyx.jpg'),
  kai: require('@/assets/characters/presets/kai.jpg'),
  sol: require('@/assets/characters/presets/sol.jpg'),
  ren: require('@/assets/characters/presets/ren.jpg'),
  irene: require('@/assets/characters/presets/irene.jpg'),
  dante: require('@/assets/characters/presets/dante.jpg'),
  hana: require('@/assets/characters/presets/hana.jpg'),
  sora: require('@/assets/characters/presets/sora.jpg'),
  zoe: require('@/assets/characters/presets/zoe.jpg'),
  elio: require('@/assets/characters/presets/elio.jpg'),
  vera: require('@/assets/characters/presets/vera.jpg'),
  vita: require('@/assets/characters/presets/vita.jpg'),
  // WP-13, lote 1 (ocultos hasta validar)
  lucia: require('@/assets/characters/presets/lucia.jpg'),
  carla: require('@/assets/characters/presets/carla.jpg'),
  paula: require('@/assets/characters/presets/paula.jpg'),
  hugo: require('@/assets/characters/presets/hugo.jpg'),
  gael: require('@/assets/characters/presets/gael.jpg'),
  bruno: require('@/assets/characters/presets/bruno.jpg'),
};

const PRESET_FACES: Record<string, ImageSourcePropType> = {
  nyx: require('@/assets/characters/faces/nyx.jpg'),
  kai: require('@/assets/characters/faces/kai.jpg'),
  sol: require('@/assets/characters/faces/sol.jpg'),
  ren: require('@/assets/characters/faces/ren.jpg'),
  irene: require('@/assets/characters/faces/irene.jpg'),
  dante: require('@/assets/characters/faces/dante.jpg'),
  hana: require('@/assets/characters/faces/hana.jpg'),
  sora: require('@/assets/characters/faces/sora.jpg'),
  zoe: require('@/assets/characters/faces/zoe.jpg'),
  elio: require('@/assets/characters/faces/elio.jpg'),
  vera: require('@/assets/characters/faces/vera.jpg'),
  vita: require('@/assets/characters/faces/vita.jpg'),
  // WP-13, lote 1 (ocultos hasta validar)
  lucia: require('@/assets/characters/faces/lucia.jpg'),
  carla: require('@/assets/characters/faces/carla.jpg'),
  paula: require('@/assets/characters/faces/paula.jpg'),
  hugo: require('@/assets/characters/faces/hugo.jpg'),
  gael: require('@/assets/characters/faces/gael.jpg'),
  bruno: require('@/assets/characters/faces/bruno.jpg'),
};

const MODEL_PORTRAITS: Record<string, ImageSourcePropType> = {
  bibi: require('@/assets/characters/models/bibi.jpg'),
  noir: require('@/assets/characters/models/noir.jpg'),
  victoria: require('@/assets/characters/models/victoria.jpg'),
  vita: require('@/assets/characters/models/vita.jpg'),
  hair_f: require('@/assets/characters/models/hair_f.jpg'),
  shibu: require('@/assets/characters/models/shibu.jpg'),
  mei: require('@/assets/characters/models/mei.jpg'),
  aria: require('@/assets/characters/models/aria.jpg'),
  fumiriya: require('@/assets/characters/models/fumiriya.jpg'),
  hair_m: require('@/assets/characters/models/hair_m.jpg'),
};

/** Fotos de perfil (solo la cara) de los modelos base, para personajes sin captura propia. */
const MODEL_FACES: Record<string, ImageSourcePropType> = {
  noir: require('@/assets/characters/model-faces/noir.jpg'),
  victoria: require('@/assets/characters/model-faces/victoria.jpg'),
  vita: require('@/assets/characters/model-faces/vita.jpg'),
  hair_f: require('@/assets/characters/model-faces/hair_f.jpg'),
  shibu: require('@/assets/characters/model-faces/shibu.jpg'),
  mei: require('@/assets/characters/model-faces/mei.jpg'),
  aria: require('@/assets/characters/model-faces/aria.jpg'),
  fumiriya: require('@/assets/characters/model-faces/fumiriya.jpg'),
  hair_m: require('@/assets/characters/model-faces/hair_m.jpg'),
};

export const presetPortrait = (id: string) => PRESET_PORTRAITS[id];
export const modelPortrait = (id: string) => MODEL_PORTRAITS[id];

/** Peinados de cuerpos retirados: se muestran con un personaje adulto que lo lleva. */
const HAIR_ONLY_PORTRAITS: Record<string, ImageSourcePropType> = { shino: require('@/assets/characters/models/shino.jpg') };
export const hairPortrait = (id: string) => MODEL_PORTRAITS[id] ?? HAIR_ONLY_PORTRAITS[id];

/** Si el aspecto coincide exactamente con un personaje listo, su retrato. */
// Comparación sin depender del orden de las claves (la base de datos guarda el JSON reordenado).
const canonical = (v: unknown): string =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? `{${Object.keys(v as Record<string, unknown>).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`
    : Array.isArray(v) ? `[${v.map(canonical).join(',')}]` : JSON.stringify(v ?? null);
// La edad no cuenta para reconocer el aspecto, pero el retrato solo vale si el rango de edad
// es el mismo que el del personaje listo (WP-10: el rostro y la ropa cambian con la edad).
const withoutAge = ({ age: _age, ...rest }: CharacterLook) => rest;
// el personaje listo tal y como se ve con su edad (maquillaje, rubor…)
const PRESET_KEYS = new Map(PRESETS.map((p) => [canonical(withoutAge(applyAge(p.look, p.age, p.gender))), p]));
function presetFor(look: CharacterLook) {
  const p = PRESET_KEYS.get(canonical(withoutAge(look)));
  return p && (look.age == null || ageRange(look.age).id === ageRange(p.age).id) ? p : undefined;
}

/** ¿Tiene retrato propio del catálogo? (si no, su foto sale de su 3D). */
export const isPresetLook = (look: CharacterLook) => !!presetFor(look);

/**
 * Imagen que se ve al instante en el escenario mientras carga el 3D (luego se funde):
 * el retrato del personaje listo, o su foto de perfil.
 */
export function stagePoster(opts: { imageUrl?: string | null; look: CharacterLook }): ImageSourcePropType {
  const preset = presetFor(opts.look);
  if (preset) return PRESET_PORTRAITS[preset.id];
  return faceImage(opts);
}

/**
 * Foto de perfil de un personaje (cuadrada, primer plano):
 * la captura guardada al crearlo o personalizarlo, o el retrato de cara del personaje listo / del modelo base.
 */
export function faceImage(opts: { imageUrl?: string | null; look: CharacterLook }): ImageSourcePropType {
  if (opts.imageUrl) return { uri: opts.imageUrl };
  const preset = presetFor(opts.look);
  if (preset) return PRESET_FACES[preset.id];
  return MODEL_FACES[opts.look.model] ?? PRESET_FACES.nyx;
}
