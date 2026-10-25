import { hairAllowed } from './catalog';
import type { CharacterLook } from './types';

/**
 * Coherencia con la edad (WP-10). Cada rango define rostro, proporciones, ropa, peinados
 * permitidos, accesorios y voz; siempre adultos. Lo usan el cuestionario, Personalizar y el
 * catálogo: las opciones que no encajan con la edad no se ofrecen, y `applyAge` corrige un
 * aspecto que no encaje (p. ej. al cambiar la edad).
 *
 * El rostro lo dibuja el escenario 3D (avatar-stage/stage.html, AGE_FACE) a partir de
 * `look.age`: párpado, iris, ojos "naturales", tamaño de cabeza y sombreado de la cara.
 * La forma de hablar por rango está en el prompt del servidor
 * (supabase/functions/_shared/systemPrompts.tsx, ageSpeech) y la voz automática en pickVoice.
 */
export type AgeRangeId = '18-22' | '23-27' | '28-34' | '35+';

export interface AgeRange {
  id: AgeRangeId;
  min: number;
  max: number;
  label: { es: string; en: string };
  /** Corto, sin "años" ("18–22", "35+"). */
  short: string;
  /** Edad que se guarda al elegir el rango en el cuestionario. */
  typical: number;
  /** Lo mismo que AGE_FACE en el escenario (para documentarlo y probarlo). */
  face: { lid: number; iris: number; head: number; contour: number };
  /** Cuerpos (ropa) que no encajan con la edad. */
  bodiesDenied: string[];
  /** Peinados que no encajan con la edad. */
  hairDenied: string[];
  /** Accesorios que no encajan con la edad. */
  accessoriesDenied: string[];
  /** Ropa lisa obligatoria (estilo más cuidado). */
  plainOutfit: boolean;
  /** Rubor máximo (el rubor fuerte aniña) y maquillaje adulto discreto si no se eligió otro. */
  makeup: { blushMax: number; lip: string | null; eyeshadow: string | null };
  /** Voces adecuadas (ids de VOICES); la primera es la automática. */
  voices: { female: string[]; male: string[] };
}

const V = {
  sarah: 'EXAVITQu4vr4xnSDxMaL',
  laura: 'FGY2WhTYpPnrIDTdsKH5',
  jessica: 'cgSgspJ2msm6clMCkdW9',
  matilda: 'XrExE9yKIg1WjnnlVkGX',
  alice: 'Xb7hH8MSUJpSbSDYk0k2',
  lily: 'pFZP5JQG7iQjIQuC4Bku',
  liam: 'TX3LPaxmHKxFdv7VOQHJ',
  will: 'bIHbv24MWmeRgasZH58o',
  eric: 'cjVigY5qzO86Huf0OWal',
  chris: 'iP95p4xoKVk53GoZ742B',
  brian: 'nPczCjzI2devNBz1zQrb',
  callum: 'N2lVS1w4EtoT3dr4eOWO',
  george: 'JBFqnCBsd6RMkjVDRZzb',
  daniel: 'onwK4e9ZLuTAKqWW03F9',
};
/** Voz neutra: vale para cualquier edad. */
export const NEUTRAL_VOICE = 'SAz9YHcvj6GT2YYXdXww';

/** Accesorios de estilo infantil o "kawaii": fuera a partir de los 28. */
const CUTE = ['cat_ears', 'bunny_ears', 'bow', 'star_clip'];

export const AGE_RANGES: AgeRange[] = [
  {
    id: '18-22',
    min: 18,
    max: 22,
    label: { es: '18–22 años', en: '18–22' },
    short: '18–22',
    typical: 21,
    face: { lid: 0, iris: 1.03, head: 1.03, contour: 0 },
    bodiesDenied: [],
    hairDenied: [],
    accessoriesDenied: [],
    plainOutfit: false,
    makeup: { blushMax: 1, lip: null, eyeshadow: null },
    voices: { female: [V.sarah, V.laura, V.jessica, V.lily], male: [V.liam, V.chris, V.will, V.eric] },
  },
  {
    id: '23-27',
    min: 23,
    max: 27,
    label: { es: '23–27 años', en: '23–27' },
    short: '23–27',
    typical: 25,
    face: { lid: 0.1, iris: 0.95, head: 1, contour: 0.25 },
    bodiesDenied: [],
    hairDenied: [],
    accessoriesDenied: [],
    plainOutfit: false,
    makeup: { blushMax: 0.5, lip: null, eyeshadow: null },
    voices: { female: [V.sarah, V.jessica, V.alice, V.laura, V.lily], male: [V.liam, V.will, V.eric, V.chris, V.callum] },
  },
  {
    id: '28-34',
    min: 28,
    max: 34,
    label: { es: '28–34 años', en: '28–34' },
    short: '28–34',
    typical: 31,
    face: { lid: 0.2, iris: 0.9, head: 0.96, contour: 0.55 },
    // "Gatita": ropa y orejas de estilo juvenil
    bodiesDenied: ['hair_f'],
    hairDenied: ['hair_f', 'bibi'],
    accessoriesDenied: CUTE,
    plainOutfit: true,
    makeup: { blushMax: 0.2, lip: '#B0646C', eyeshadow: '#B79A9A' },
    voices: { female: [V.alice, V.lily, V.matilda, V.jessica], male: [V.eric, V.callum, V.brian, V.george, V.will] },
  },
  {
    id: '35+',
    min: 35,
    max: 99,
    label: { es: '35 años o más', en: '35+' },
    short: '35+',
    typical: 38,
    face: { lid: 0.36, iris: 0.86, head: 0.93, contour: 1 },
    // solo ropa de persona adulta y cuidada: fuera la princesa con volantes, la gatita, la ciencia
    // ficción, la sudadera urbana y la camiseta básica
    bodiesDenied: ['hair_f', 'victoria', 'vita', 'hair_m', 'mei'],
    hairDenied: ['hair_f', 'bibi', 'vita'],
    accessoriesDenied: [...CUTE, 'fox_ears', 'flower_crown', 'fairy_wings', 'flower'],
    plainOutfit: true,
    makeup: { blushMax: 0.1, lip: '#A0525E', eyeshadow: '#A88A8C' },
    voices: { female: [V.matilda, V.alice, V.lily], male: [V.brian, V.george, V.daniel, V.callum] },
  },
];

export function ageRange(age: number | null | undefined): AgeRange {
  const a = Math.max(18, Math.round(+(age ?? 0)) || 25);
  return AGE_RANGES.find((r) => a >= r.min && a <= r.max) ?? AGE_RANGES[1];
}

export const bodyAllowedForAge = (model: string, age: number) => !ageRange(age).bodiesDenied.includes(model);
export const hairAllowedForAge = (hair: string, age: number) => !ageRange(age).hairDenied.includes(hair);
export const accessoryAllowedForAge = (id: string, age: number) => !ageRange(age).accessoriesDenied.includes(id);

/** Voces que encajan con la edad y el género (la neutra siempre). */
export function voicesForAge(age: number, gender: string): string[] {
  const r = ageRange(age);
  const own = gender === 'male' ? r.voices.male : gender === 'female' ? r.voices.female : [...r.voices.female, ...r.voices.male];
  return [...own, NEUTRAL_VOICE];
}
export const voiceAllowedForAge = (id: string | null, age: number, gender: string) => !id || voicesForAge(age, gender).includes(id);

/**
 * Color de pelo original de los cuerpos que la edad puede cambiar: al cambiar de cuerpo, el
 * personaje conserva su color de pelo (si no tenía uno elegido, el de su cuerpo anterior).
 */
const ORIGINAL_HAIR: Record<string, string> = { hair_m: '#2B2A3A', hair_f: '#2B2A3A', vita: '#3A4A6A', victoria: '#D9AE6A' };

/** Peinados largos (si hay que cambiarlos, mejor por otro largo). */
const LONG_HAIR = new Set(['victoria', 'hair_f', 'mei', 'shino', 'noir']);

/** Cuerpo adulto de repuesto si el elegido no encaja con la edad. */
const BODY_FALLBACK: Record<string, string> = { female: 'shibu', male: 'fumiriya' };

/**
 * Aspecto coherente con la edad: guarda `age` (para el rostro del escenario) y cambia lo que
 * no encaje por lo más parecido que sí. No toca nada que ya encaje.
 */
export function applyAge(look: CharacterLook, age: number, gender: string = 'female'): CharacterLook {
  const r = ageRange(age);
  const out: CharacterLook = { ...look, age: Math.max(18, Math.round(age)) };
  if (r.bodiesDenied.includes(out.model)) {
    // el peinado de antes se conserva si encaja (los cuerpos VRoid comparten esqueleto)
    const keepHair = out.hair ?? out.model;
    if (!out.hairColor && ORIGINAL_HAIR[keepHair]) out.hairColor = ORIGINAL_HAIR[keepHair];
    out.model = BODY_FALLBACK[gender] ?? 'mei';
    if (keepHair !== out.model && !r.hairDenied.includes(keepHair) && hairAllowed(out.model, keepHair)) out.hair = keepHair;
    else {
      // un peinado parecido que encaje en el cuerpo nuevo (melena larga antes que un bob)
      const similar = (LONG_HAIR.has(keepHair) ? ['mei', 'shino'] : []).find((h) => h !== out.model && !r.hairDenied.includes(h) && hairAllowed(out.model, h));
      out.hair = similar ?? null;
    }
  }
  if (out.hair && r.hairDenied.includes(out.hair)) out.hair = null;
  if (out.accessories.some((a) => r.accessoriesDenied.includes(a))) out.accessories = out.accessories.filter((a) => !r.accessoriesDenied.includes(a));
  if (r.plainOutfit) out.plainOutfit = true;
  if (out.blush > r.makeup.blushMax) out.blush = r.makeup.blushMax;
  // maquillaje discreto de persona adulta (solo en cuerpos femeninos y si no se eligió otro)
  // (el automático de otro rango se cambia por el de este; si se baja la edad, se quita)
  const autoLip = AGE_RANGES.map((x) => x.makeup.lip).filter(Boolean);
  const autoShadow = AGE_RANGES.map((x) => x.makeup.eyeshadow).filter(Boolean);
  if (gender === 'female') {
    if (!out.lipColor || autoLip.includes(out.lipColor)) out.lipColor = r.makeup.lip;
    if (!out.eyeshadow || autoShadow.includes(out.eyeshadow)) out.eyeshadow = r.makeup.eyeshadow;
  }
  if (out.voice?.id && !voiceAllowedForAge(out.voice.id, age, gender)) out.voice = { ...out.voice, id: null };
  return out;
}

/** Voz automática para la edad y el género (si no se eligió ninguna). */
export function autoVoice(age: number, gender: string): string {
  return voicesForAge(age, gender)[0];
}
