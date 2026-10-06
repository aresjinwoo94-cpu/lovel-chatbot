import { isHex } from './color';
import type { CharacterLook, Expression } from './types';

/**
 * Catálogo de personajes VRM.
 * Modelos oficiales de VRoid / pixiv con licencia que permite uso comercial,
 * modificación y redistribución (ver avatar-stage/MODELS.md). Están en el
 * bucket público `vrm-models` de Supabase, con las texturas optimizadas para móvil.
 */
export type L = { es: string; en: string };

export interface BaseModel {
  id: string;
  gender: 'female' | 'male';
  label: L;
  /** Formato VRM 1.0: su esqueleto no admite peinados de otros modelos. */
  vrm1?: boolean;
  /** Puede prestar su peinado a otros modelos. */
  hairDonor?: boolean;
}

export const MODELS: BaseModel[] = [
  { id: 'bibi', gender: 'female', label: { es: 'Campestre', en: 'Countryside' }, hairDonor: true },
  { id: 'shino', gender: 'female', label: { es: 'Colegiala', en: 'Schoolgirl' }, hairDonor: true },
  { id: 'noir', gender: 'female', label: { es: 'Gótica élfica', en: 'Gothic elf' }, hairDonor: true },
  { id: 'victoria', gender: 'female', label: { es: 'Princesa', en: 'Princess' }, hairDonor: true },
  { id: 'vita', gender: 'female', label: { es: 'Ciencia ficción', en: 'Sci-fi' }, hairDonor: true },
  { id: 'hair_f', gender: 'female', label: { es: 'Gatita', en: 'Kitten' }, hairDonor: true },
  { id: 'shibu', gender: 'female', label: { es: 'Clásica', en: 'Classic' }, hairDonor: true },
  { id: 'mei', gender: 'female', label: { es: 'Casual', en: 'Casual' }, hairDonor: true },
  { id: 'sample_b', gender: 'female', label: { es: 'Urbana', en: 'Streetwear' }, vrm1: true },
  { id: 'aria', gender: 'female', label: { es: 'Minimal', en: 'Minimal' }, vrm1: true },
  { id: 'fumiriya', gender: 'male', label: { es: 'Estudiante', en: 'Student' }, hairDonor: true },
  { id: 'hair_m', gender: 'male', label: { es: 'Urbano', en: 'Urban' }, hairDonor: true },
];

export const modelById = (id: string | null | undefined) => MODELS.find((m) => m.id === id);
export const isCustomModel = (model: string) => /^https?:/.test(model);

export interface Choice {
  id: string;
  label: L;
}
export interface ColorChoice {
  id: string;
  hex: string;
  label: L;
}

/** Peinados: el propio del modelo o el de otro modelo VRoid (mismo esqueleto, con su física). */
export const HAIRSTYLES: Choice[] = [
  { id: 'shibu', label: { es: 'Bob con horquilla', en: 'Bob with clip' } },
  { id: 'bibi', label: { es: 'Bob con moños', en: 'Bob with buns' } },
  { id: 'shino', label: { es: 'Largo con flequillo', en: 'Long with bangs' } },
  { id: 'mei', label: { es: 'Largo liso', en: 'Long straight' } },
  { id: 'victoria', label: { es: 'Coleta alta', en: 'High ponytail' } },
  { id: 'hair_f', label: { es: 'Coletas', en: 'Twin tails' } },
  { id: 'noir', label: { es: 'Corto despeinado', en: 'Short messy' } },
  { id: 'vita', label: { es: 'Corto futurista', en: 'Short futuristic' } },
  { id: 'fumiriya', label: { es: 'Desenfadado', en: 'Tousled' } },
  { id: 'hair_m', label: { es: 'En punta', en: 'Spiky' } },
];

export const HAIR_COLORS: ColorChoice[] = [
  { id: 'black', hex: '#2B2A3A', label: { es: 'Negro azulado', en: 'Blue black' } },
  { id: 'darkbrown', hex: '#4A3026', label: { es: 'Castaño oscuro', en: 'Dark brown' } },
  { id: 'brown', hex: '#8A5A3C', label: { es: 'Castaño', en: 'Brown' } },
  { id: 'honey', hex: '#D9AE6A', label: { es: 'Rubio miel', en: 'Honey blonde' } },
  { id: 'platinum', hex: '#EEE4CF', label: { es: 'Platino', en: 'Platinum' } },
  { id: 'silver', hex: '#C9CBD6', label: { es: 'Plateado', en: 'Silver' } },
  { id: 'red', hex: '#B5452F', label: { es: 'Cobrizo', en: 'Copper' } },
  { id: 'wine', hex: '#7A2338', label: { es: 'Vino', en: 'Wine' } },
  { id: 'pink', hex: '#F0A8C0', label: { es: 'Rosa', en: 'Pink' } },
  { id: 'lavender', hex: '#B7A2E8', label: { es: 'Lavanda', en: 'Lavender' } },
  { id: 'blue', hex: '#5C7FD6', label: { es: 'Azul', en: 'Blue' } },
  { id: 'mint', hex: '#8FD3C1', label: { es: 'Menta', en: 'Mint' } },
];

export const EYE_COLORS: ColorChoice[] = [
  { id: 'violet', hex: '#8B5BD6', label: { es: 'Violeta', en: 'Violet' } },
  { id: 'blue', hex: '#3D7BD9', label: { es: 'Azul', en: 'Blue' } },
  { id: 'sky', hex: '#6CC3E8', label: { es: 'Celeste', en: 'Sky' } },
  { id: 'green', hex: '#4FA36B', label: { es: 'Verde', en: 'Green' } },
  { id: 'amber', hex: '#D98F2B', label: { es: 'Ámbar', en: 'Amber' } },
  { id: 'brown', hex: '#7A4A2E', label: { es: 'Café', en: 'Brown' } },
  { id: 'red', hex: '#C8283F', label: { es: 'Rubí', en: 'Ruby' } },
  { id: 'pink', hex: '#E0679A', label: { es: 'Rosa', en: 'Pink' } },
  { id: 'gold', hex: '#E8C04A', label: { es: 'Dorado', en: 'Gold' } },
  { id: 'grey', hex: '#8C95A6', label: { es: 'Gris', en: 'Grey' } },
];

export const SKIN_TONES: ColorChoice[] = [
  { id: 'porcelain', hex: '#FBEDE6', label: { es: 'Porcelana', en: 'Porcelain' } },
  { id: 'light', hex: '#F6DCCB', label: { es: 'Clara', en: 'Light' } },
  { id: 'warm', hex: '#E9BB98', label: { es: 'Cálida', en: 'Warm' } },
  { id: 'tan', hex: '#CF9670', label: { es: 'Bronceada', en: 'Tan' } },
  { id: 'brown', hex: '#9A6446', label: { es: 'Morena', en: 'Brown' } },
  { id: 'deep', hex: '#6E4430', label: { es: 'Oscura', en: 'Deep' } },
];

export const OUTFIT_COLORS: ColorChoice[] = [
  { id: 'violet', hex: '#6F5BD3', label: { es: 'Violeta', en: 'Violet' } },
  { id: 'rose', hex: '#E6A0B4', label: { es: 'Rosa', en: 'Rose' } },
  { id: 'wine', hex: '#8C2F46', label: { es: 'Vino', en: 'Wine' } },
  { id: 'navy', hex: '#27365E', label: { es: 'Marino', en: 'Navy' } },
  { id: 'sky', hex: '#5C7FB8', label: { es: 'Azul', en: 'Blue' } },
  { id: 'forest', hex: '#2E4A3A', label: { es: 'Bosque', en: 'Forest' } },
  { id: 'camel', hex: '#C9A77E', label: { es: 'Camel', en: 'Camel' } },
  { id: 'charcoal', hex: '#3A3644', label: { es: 'Carbón', en: 'Charcoal' } },
  { id: 'black', hex: '#1E1A24', label: { es: 'Negro', en: 'Black' } },
  { id: 'white', hex: '#F4F1EC', label: { es: 'Blanco', en: 'White' } },
];

export const EXPRESSIONS: { id: Expression; label: L }[] = [
  { id: 'neutral', label: { es: 'Natural', en: 'Natural' } },
  { id: 'smile', label: { es: 'Sonriente', en: 'Smiling' } },
  { id: 'calm', label: { es: 'Serena', en: 'Calm' } },
  { id: 'serious', label: { es: 'Seria', en: 'Serious' } },
];

/** Accesorios 3D que se colocan sobre la cabeza del personaje (uno por zona). */
export const ACCESSORIES: (Choice & { slot: 'eyes' | 'head' | 'ears' })[] = [
  { id: 'glasses_round', slot: 'eyes', label: { es: 'Gafas redondas', en: 'Round glasses' } },
  { id: 'glasses_square', slot: 'eyes', label: { es: 'Gafas cuadradas', en: 'Square glasses' } },
  { id: 'headphones', slot: 'ears', label: { es: 'Auriculares', en: 'Headphones' } },
  { id: 'cat_ears', slot: 'head', label: { es: 'Orejas de gato', en: 'Cat ears' } },
  { id: 'halo', slot: 'head', label: { es: 'Aureola', en: 'Halo' } },
];

export const BACKGROUNDS: (Choice & { hex: string })[] = [
  { id: 'lilac', hex: '#E7E1F6', label: { es: 'Lila', en: 'Lilac' } },
  { id: 'blush', hex: '#F2E2E8', label: { es: 'Rubor', en: 'Blush' } },
  { id: 'cream', hex: '#EEE8DE', label: { es: 'Crema', en: 'Cream' } },
  { id: 'peach', hex: '#F2E4D9', label: { es: 'Melocotón', en: 'Peach' } },
  { id: 'sky', hex: '#E3EAF4', label: { es: 'Cielo', en: 'Sky' } },
  { id: 'mint', hex: '#E0EDE6', label: { es: 'Menta', en: 'Mint' } },
  { id: 'twilight', hex: '#D6CDEF', label: { es: 'Crepúsculo', en: 'Twilight' } },
  { id: 'night', hex: '#2A2633', label: { es: 'Noche', en: 'Night' } },
];

export function toggleAccessory(current: string[], id: string): string[] {
  if (current.includes(id)) return current.filter((a) => a !== id);
  const slot = ACCESSORIES.find((a) => a.id === id)?.slot;
  return [...current.filter((a) => ACCESSORIES.find((x) => x.id === a)?.slot !== slot), id];
}

/** ¿Se puede usar el peinado `hair` con el modelo `model`? */
export function hairCompatible(model: string): boolean {
  const m = modelById(model);
  return !!m && !m.vrm1;
}

// ------------------------------------------------------------------ personajes listos
export interface CharacterPreset {
  id: string;
  name: string;
  gender: 'female' | 'male';
  age: number;
  tagline: L;
  traits: string[];
  look: CharacterLook;
}

const look = (l: Partial<CharacterLook> & { model: string }): CharacterLook => ({
  v: 3,
  hair: null,
  hairColor: null,
  eyeColor: null,
  skinTone: null,
  outfitColor: null,
  expression: 'neutral',
  accessories: [],
  background: 'lilac',
  ...l,
});

export const PRESETS: CharacterPreset[] = [
  {
    id: 'aiko', name: 'Aiko', gender: 'female', age: 23,
    tagline: { es: 'Dulce, romántica y un poco tímida', en: 'Sweet, romantic and a little shy' },
    traits: ['kind', 'romantic', 'shy'],
    look: look({ model: 'bibi', expression: 'smile', background: 'blush' }),
  },
  {
    id: 'kai', name: 'Kai', gender: 'male', age: 26,
    tagline: { es: 'Protector, sarcástico y leal', en: 'Protective, sarcastic and loyal' },
    traits: ['protective', 'sarcastic', 'loyal'],
    look: look({ model: 'hair_m', background: 'sky' }),
  },
  {
    id: 'mei', name: 'Mei', gender: 'female', age: 27,
    tagline: { es: 'Fría por fuera, cariñosa por dentro', en: 'Cold outside, caring inside' },
    traits: ['cold', 'confident', 'protective'],
    look: look({ model: 'shino', expression: 'serious', eyeColor: '#C8283F', background: 'cream' }),
  },
  {
    id: 'ren', name: 'Ren', gender: 'male', age: 28,
    tagline: { es: 'Reservado, intelectual y misterioso', en: 'Reserved, intellectual and mysterious' },
    traits: ['reserved', 'intellectual', 'mysterious'],
    look: look({ model: 'fumiriya', hairColor: '#4A3026', accessories: ['glasses_square'], expression: 'calm', background: 'mint' }),
  },
  {
    id: 'nyx', name: 'Nyx', gender: 'female', age: 25,
    tagline: { es: 'Misteriosa, orgullosa y magnética', en: 'Mysterious, proud and magnetic' },
    traits: ['mysterious', 'proud', 'flirty'],
    look: look({ model: 'noir', background: 'twilight' }),
  },
  {
    id: 'luna', name: 'Luna', gender: 'female', age: 21,
    tagline: { es: 'Extrovertida, juguetona y brillante', en: 'Outgoing, playful and bright' },
    traits: ['extrovert', 'playful', 'optimistic'],
    look: look({ model: 'hair_f', expression: 'smile', background: 'lilac' }),
  },
  {
    id: 'dante', name: 'Dante', gender: 'male', age: 25,
    tagline: { es: 'Rebelde, intenso y con buen corazón', en: 'Rebellious, intense, good-hearted' },
    traits: ['rebellious', 'dominant', 'protective'],
    look: look({ model: 'fumiriya', hair: 'hair_m', hairColor: '#C9CBD6', eyeColor: '#E8C04A', outfitColor: '#1E1A24', expression: 'serious', background: 'night' }),
  },
  {
    id: 'victoria', name: 'Victoria', gender: 'female', age: 24,
    tagline: { es: 'Dramática, orgullosa y encantadora', en: 'Dramatic, proud and charming' },
    traits: ['dramatic', 'proud', 'romantic'],
    look: look({ model: 'victoria', expression: 'smile', background: 'peach' }),
  },
  {
    id: 'zoe', name: 'Zoe', gender: 'female', age: 22,
    tagline: { es: 'Rebelde, divertida y sin filtro', en: 'Rebellious, funny and unfiltered' },
    traits: ['rebellious', 'funny', 'confident'],
    look: look({ model: 'sample_b', background: 'lilac' }),
  },
  {
    id: 'vita', name: 'Vita', gender: 'female', age: 24,
    tagline: { es: 'Intelectual, seria y leal', en: 'Intellectual, serious and loyal' },
    traits: ['intellectual', 'serious', 'loyal'],
    look: look({ model: 'vita', background: 'sky' }),
  },
];

export const presetById = (id: string | null | undefined) => PRESETS.find((p) => p.id === id);
export const DEFAULT_FEMALE = PRESETS[0];
export const DEFAULT_MALE = PRESETS[1];

/**
 * Convierte cualquier apariencia guardada (incluidas las antiguas) en un aspecto
 * válido. Nunca falla: lo que no se reconoce toma el valor del personaje base.
 */
export function normalizeLook(raw: unknown, gender: string = 'female'): CharacterLook {
  const base = (gender === 'male' ? DEFAULT_MALE : DEFAULT_FEMALE).look;
  if (!raw || typeof raw !== 'object' || (raw as { v?: number }).v !== 3) return base;
  const r = raw as Partial<CharacterLook>;
  const model = typeof r.model === 'string' && (modelById(r.model) || isCustomModel(r.model)) ? r.model : base.model;
  const hair = typeof r.hair === 'string' && HAIRSTYLES.some((h) => h.id === r.hair) && hairCompatible(model) ? r.hair : null;
  const color = (v: unknown) => (isHex(v) ? v : null);
  return {
    v: 3,
    model,
    hair,
    hairColor: color(r.hairColor),
    eyeColor: color(r.eyeColor),
    skinTone: color(r.skinTone),
    outfitColor: color(r.outfitColor),
    expression: EXPRESSIONS.some((e) => e.id === r.expression) ? (r.expression as Expression) : 'neutral',
    accessories: Array.isArray(r.accessories) ? r.accessories.filter((a) => ACCESSORIES.some((x) => x.id === a)).reduce<string[]>(toggleAccessory, []) : [],
    background: BACKGROUNDS.some((b) => b.id === r.background) ? (r.background as string) : base.background,
  };
}

/** Descripción del aspecto para que la IA sepa cómo es el personaje. */
export function describeLook(l: CharacterLook, lang: 'es' | 'en' = 'es'): string {
  const name = <T extends Choice>(list: T[], id: string | null) => list.find((c) => c.id === id)?.label[lang];
  const col = (list: ColorChoice[], hex: string | null) => (hex ? list.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.label[lang].toLowerCase() : null);
  const style = modelById(l.model)?.label[lang] ?? (lang === 'es' ? 'estilo propio' : 'own style');
  const hair = l.hair ? name(HAIRSTYLES, l.hair) : null;
  const acc = l.accessories.map((a) => name(ACCESSORIES, a)?.toLowerCase()).filter(Boolean);
  const parts =
    lang === 'es'
      ? [
          `estilo ${style.toLowerCase()}`,
          hair ? `peinado: ${hair.toLowerCase()}` : '',
          col(HAIR_COLORS, l.hairColor) ? `pelo ${col(HAIR_COLORS, l.hairColor)}` : '',
          col(EYE_COLORS, l.eyeColor) ? `ojos ${col(EYE_COLORS, l.eyeColor)}` : '',
          acc.length ? `accesorios: ${acc.join(', ')}` : '',
        ]
      : [
          `${style.toLowerCase()} style`,
          hair ? `hairstyle: ${hair.toLowerCase()}` : '',
          col(HAIR_COLORS, l.hairColor) ? `${col(HAIR_COLORS, l.hairColor)} hair` : '',
          col(EYE_COLORS, l.eyeColor) ? `${col(EYE_COLORS, l.eyeColor)} eyes` : '',
          acc.length ? `accessories: ${acc.join(', ')}` : '',
        ];
  return parts.filter(Boolean).join('; ');
}
