import { isHex } from './color';
import { ACCESSORIES, accessorySlot } from './extras';
import { EYE_STYLES } from './eyes';
import { BROWS, FACE_SHAPES, MOUTHS } from './face';
import { HAIR_STYLES } from './hair';
import { OUTFITS } from './outfits';
import { BACKGROUNDS } from './render';
import type { CharacterLook } from './types';

/** Etiqueta en los dos idiomas de la app. */
export type L = { es: string; en: string };

export interface Choice {
  id: string;
  label: L;
}
export interface ColorChoice {
  id: string;
  hex: string;
  label: L;
}

// ------------------------------------------------------------------ cara
export const FACE_CHOICES: Choice[] = [
  { id: 'oval', label: { es: 'Ovalada', en: 'Oval' } },
  { id: 'round', label: { es: 'Redonda', en: 'Round' } },
  { id: 'heart', label: { es: 'Corazón', en: 'Heart' } },
  { id: 'vshape', label: { es: 'En V', en: 'V-shape' } },
  { id: 'square', label: { es: 'Cuadrada', en: 'Square' } },
  { id: 'long', label: { es: 'Alargada', en: 'Long' } },
  { id: 'diamond', label: { es: 'Diamante', en: 'Diamond' } },
  { id: 'baby', label: { es: 'Aniñada', en: 'Baby face' } },
  { id: 'jaw', label: { es: 'Mandíbula marcada', en: 'Strong jaw' } },
  { id: 'slim', label: { es: 'Fina', en: 'Slim' } },
];

export const SKIN_CHOICES: ColorChoice[] = [
  { id: 'porcelain', hex: '#FFF1E8', label: { es: 'Porcelana', en: 'Porcelain' } },
  { id: 'light', hex: '#FCE3D3', label: { es: 'Clara', en: 'Light' } },
  { id: 'rose', hex: '#F6D2BC', label: { es: 'Rosada', en: 'Rosy' } },
  { id: 'warm', hex: '#EDBB9A', label: { es: 'Cálida', en: 'Warm' } },
  { id: 'tan', hex: '#D9A07C', label: { es: 'Bronceada', en: 'Tan' } },
  { id: 'caramel', hex: '#BA7F5C', label: { es: 'Canela', en: 'Caramel' } },
  { id: 'brown', hex: '#8F5A3E', label: { es: 'Morena', en: 'Brown' } },
  { id: 'deep', hex: '#6A402C', label: { es: 'Oscura', en: 'Deep' } },
];

export const EYE_CHOICES: Choice[] = [
  { id: 'sparkle', label: { es: 'Brillantes', en: 'Sparkling' } },
  { id: 'almond', label: { es: 'Almendrados', en: 'Almond' } },
  { id: 'gentle', label: { es: 'Tiernos', en: 'Gentle' } },
  { id: 'cat', label: { es: 'Felinos', en: 'Feline' } },
  { id: 'sleepy', label: { es: 'Somnolientos', en: 'Sleepy' } },
  { id: 'round', label: { es: 'Redondos', en: 'Round' } },
  { id: 'calm', label: { es: 'Serenos', en: 'Calm' } },
  { id: 'fierce', label: { es: 'Intensos', en: 'Fierce' } },
  { id: 'starry', label: { es: 'Estrellados', en: 'Starry' } },
  { id: 'dreamy', label: { es: 'Enamorados', en: 'Dreamy' } },
  { id: 'mystic', label: { es: 'Místicos', en: 'Mystic' } },
  { id: 'narrow', label: { es: 'Rasgados', en: 'Narrow' } },
];

export const EYE_COLORS: ColorChoice[] = [
  { id: 'violet', hex: '#8B5BD6', label: { es: 'Violeta', en: 'Violet' } },
  { id: 'blue', hex: '#3D7BD9', label: { es: 'Azul', en: 'Blue' } },
  { id: 'sky', hex: '#6CC3E8', label: { es: 'Celeste', en: 'Sky' } },
  { id: 'green', hex: '#4FA36B', label: { es: 'Verde', en: 'Green' } },
  { id: 'emerald', hex: '#1F8A70', label: { es: 'Esmeralda', en: 'Emerald' } },
  { id: 'amber', hex: '#D98F2B', label: { es: 'Ámbar', en: 'Amber' } },
  { id: 'honey', hex: '#B8793A', label: { es: 'Miel', en: 'Honey' } },
  { id: 'brown', hex: '#6B4128', label: { es: 'Café', en: 'Brown' } },
  { id: 'red', hex: '#C8283F', label: { es: 'Rubí', en: 'Ruby' } },
  { id: 'pink', hex: '#E0679A', label: { es: 'Rosa', en: 'Pink' } },
  { id: 'gold', hex: '#E8C04A', label: { es: 'Dorado', en: 'Gold' } },
  { id: 'grey', hex: '#8C95A6', label: { es: 'Gris', en: 'Grey' } },
];

export const BROW_CHOICES: Choice[] = [
  { id: 'soft', label: { es: 'Suaves', en: 'Soft' } },
  { id: 'straight', label: { es: 'Rectas', en: 'Straight' } },
  { id: 'arched', label: { es: 'Arqueadas', en: 'Arched' } },
  { id: 'thick', label: { es: 'Gruesas', en: 'Thick' } },
  { id: 'worried', label: { es: 'Preocupadas', en: 'Worried' } },
  { id: 'fierce', label: { es: 'Decididas', en: 'Fierce' } },
  { id: 'thin', label: { es: 'Finas', en: 'Thin' } },
  { id: 'flat', label: { es: 'Planas', en: 'Flat' } },
];

export const MOUTH_CHOICES: Choice[] = [
  { id: 'smile', label: { es: 'Sonrisa', en: 'Smile' } },
  { id: 'grin', label: { es: 'Sonrisa abierta', en: 'Grin' } },
  { id: 'smirk', label: { es: 'Pícara', en: 'Smirk' } },
  { id: 'cat', label: { es: 'Gatuna', en: 'Cat mouth' } },
  { id: 'shy', label: { es: 'Tímida', en: 'Shy' } },
  { id: 'neutral', label: { es: 'Seria', en: 'Neutral' } },
  { id: 'fang', label: { es: 'Colmillo', en: 'Fang' } },
  { id: 'pout', label: { es: 'Puchero', en: 'Pout' } },
  { id: 'surprised', label: { es: 'Sorpresa', en: 'Surprised' } },
  { id: 'laugh', label: { es: 'Risa', en: 'Laugh' } },
];

export const MARK_CHOICES: Choice[] = [
  { id: 'blush', label: { es: 'Rubor', en: 'Blush' } },
  { id: 'freckles', label: { es: 'Pecas', en: 'Freckles' } },
  { id: 'mole', label: { es: 'Lunar bajo el ojo', en: 'Eye mole' } },
  { id: 'beauty', label: { es: 'Lunar de belleza', en: 'Beauty mark' } },
  { id: 'eyebags', label: { es: 'Ojeras', en: 'Tired eyes' } },
  { id: 'scar', label: { es: 'Cicatriz', en: 'Scar' } },
  { id: 'bandaid', label: { es: 'Curita', en: 'Band-aid' } },
  { id: 'star', label: { es: 'Estrella pintada', en: 'Star paint' } },
  { id: 'tear', label: { es: 'Lágrima pintada', en: 'Tear mark' } },
  { id: 'heart', label: { es: 'Corazón en la mejilla', en: 'Cheek heart' } },
];

// ------------------------------------------------------------------ pelo
export const HAIR_CHOICES: Choice[] = [
  { id: 'long', label: { es: 'Larga lisa', en: 'Long straight' } },
  { id: 'wavy', label: { es: 'Larga ondulada', en: 'Long wavy' } },
  { id: 'hime', label: { es: 'Corte hime', en: 'Hime cut' } },
  { id: 'twintails', label: { es: 'Dos coletas', en: 'Twin tails' } },
  { id: 'ponytail', label: { es: 'Coleta alta', en: 'High ponytail' } },
  { id: 'buns', label: { es: 'Moños', en: 'Space buns' } },
  { id: 'braid', label: { es: 'Trenza lateral', en: 'Side braid' } },
  { id: 'bob', label: { es: 'Bob', en: 'Bob' } },
  { id: 'pixie', label: { es: 'Pixie', en: 'Pixie' } },
  { id: 'curly', label: { es: 'Rizado', en: 'Curly' } },
  { id: 'wolf', label: { es: 'Wolf cut', en: 'Wolf cut' } },
  { id: 'messy', label: { es: 'Despeinado', en: 'Messy' } },
  { id: 'sidepart', label: { es: 'Raya al lado', en: 'Side part' } },
  { id: 'spiky', label: { es: 'En punta', en: 'Spiky' } },
  { id: 'slick', label: { es: 'Hacia atrás', en: 'Slicked back' } },
  { id: 'samurai', label: { es: 'Coleta baja', en: 'Low ponytail' } },
];

export const HAIR_COLORS: ColorChoice[] = [
  { id: 'black', hex: '#2B2A3A', label: { es: 'Negro azulado', en: 'Blue black' } },
  { id: 'darkbrown', hex: '#4A3026', label: { es: 'Castaño oscuro', en: 'Dark brown' } },
  { id: 'brown', hex: '#7A4E36', label: { es: 'Castaño', en: 'Brown' } },
  { id: 'caramel', hex: '#B07A4F', label: { es: 'Caramelo', en: 'Caramel' } },
  { id: 'honey', hex: '#E2B86B', label: { es: 'Rubio miel', en: 'Honey blonde' } },
  { id: 'platinum', hex: '#EFE3C8', label: { es: 'Platino', en: 'Platinum' } },
  { id: 'silver', hex: '#C9CBD6', label: { es: 'Plateado', en: 'Silver' } },
  { id: 'red', hex: '#B5452F', label: { es: 'Pelirrojo', en: 'Red' } },
  { id: 'wine', hex: '#7A2338', label: { es: 'Vino', en: 'Wine' } },
  { id: 'pink', hex: '#F2A7C0', label: { es: 'Rosa', en: 'Pink' } },
  { id: 'lavender', hex: '#B7A2E8', label: { es: 'Lavanda', en: 'Lavender' } },
  { id: 'violet', hex: '#5B3A8A', label: { es: 'Violeta', en: 'Violet' } },
  { id: 'blue', hex: '#5C7FD6', label: { es: 'Azul', en: 'Blue' } },
  { id: 'mint', hex: '#8FD3C1', label: { es: 'Menta', en: 'Mint' } },
  { id: 'white', hex: '#F4F2F7', label: { es: 'Blanco nieve', en: 'Snow white' } },
];

// ------------------------------------------------------------------ ropa
export const OUTFIT_CHOICES: Choice[] = [
  { id: 'casual', label: { es: 'Casual', en: 'Casual' } },
  { id: 'hoodie', label: { es: 'Sudadera', en: 'Hoodie' } },
  { id: 'school_sailor', label: { es: 'Uniforme marinero', en: 'Sailor uniform' } },
  { id: 'school_blazer', label: { es: 'Uniforme con blazer', en: 'Blazer uniform' } },
  { id: 'maid', label: { es: 'Maid', en: 'Maid' } },
  { id: 'nurse', label: { es: 'Enfermería', en: 'Nurse' } },
  { id: 'doctor', label: { es: 'Doctor/a', en: 'Doctor' } },
  { id: 'office', label: { es: 'Oficina', en: 'Office' } },
  { id: 'teacher', label: { es: 'Profesor/a', en: 'Teacher' } },
  { id: 'athlete', label: { es: 'Deportista', en: 'Athlete' } },
  { id: 'suit', label: { es: 'Traje formal', en: 'Formal suit' } },
  { id: 'military', label: { es: 'Uniforme militar', en: 'Military uniform' } },
  { id: 'mage', label: { es: 'Mago/a', en: 'Mage' } },
  { id: 'knight', label: { es: 'Caballero', en: 'Knight' } },
  { id: 'goth', label: { es: 'Gótico', en: 'Goth' } },
  { id: 'punk', label: { es: 'Punk', en: 'Punk' } },
  { id: 'kimono', label: { es: 'Kimono', en: 'Kimono' } },
  { id: 'idol', label: { es: 'Idol', en: 'Idol' } },
  { id: 'barista', label: { es: 'Barista', en: 'Barista' } },
];

export const OUTFIT_COLORS: ColorChoice[] = [
  { id: 'violet', hex: '#6F5BD3', label: { es: 'Violeta', en: 'Violet' } },
  { id: 'rose', hex: '#E6A0B4', label: { es: 'Rosa', en: 'Rose' } },
  { id: 'wine', hex: '#8C2F46', label: { es: 'Vino', en: 'Wine' } },
  { id: 'red', hex: '#B8394A', label: { es: 'Rojo', en: 'Red' } },
  { id: 'navy', hex: '#27365E', label: { es: 'Marino', en: 'Navy' } },
  { id: 'sky', hex: '#5C7FB8', label: { es: 'Azul', en: 'Blue' } },
  { id: 'forest', hex: '#2E4A3A', label: { es: 'Bosque', en: 'Forest' } },
  { id: 'sage', hex: '#69B58A', label: { es: 'Salvia', en: 'Sage' } },
  { id: 'camel', hex: '#C9A77E', label: { es: 'Camel', en: 'Camel' } },
  { id: 'charcoal', hex: '#3A3644', label: { es: 'Carbón', en: 'Charcoal' } },
  { id: 'black', hex: '#1E1A24', label: { es: 'Negro', en: 'Black' } },
  { id: 'white', hex: '#F4F1EC', label: { es: 'Blanco', en: 'White' } },
];

// ------------------------------------------------------------------ otros
export const ACCESSORY_CHOICES: Choice[] = [
  { id: 'glasses_round', label: { es: 'Gafas redondas', en: 'Round glasses' } },
  { id: 'glasses_square', label: { es: 'Gafas cuadradas', en: 'Square glasses' } },
  { id: 'glasses_half', label: { es: 'Gafas de lectura', en: 'Reading glasses' } },
  { id: 'eyepatch', label: { es: 'Parche', en: 'Eyepatch' } },
  { id: 'bow', label: { es: 'Lazo', en: 'Bow' } },
  { id: 'flower', label: { es: 'Flores', en: 'Flowers' } },
  { id: 'headband', label: { es: 'Diadema', en: 'Headband' } },
  { id: 'beret', label: { es: 'Boina', en: 'Beret' } },
  { id: 'tiara', label: { es: 'Tiara', en: 'Tiara' } },
  { id: 'witch_hat', label: { es: 'Sombrero de bruja', en: 'Witch hat' } },
  { id: 'headphones', label: { es: 'Auriculares', en: 'Headphones' } },
  { id: 'cat_ears', label: { es: 'Orejas de gato', en: 'Cat ears' } },
  { id: 'fox_ears', label: { es: 'Orejas de zorro', en: 'Fox ears' } },
  { id: 'horns', label: { es: 'Cuernos', en: 'Horns' } },
  { id: 'halo', label: { es: 'Aureola', en: 'Halo' } },
  { id: 'earrings', label: { es: 'Pendientes', en: 'Earrings' } },
  { id: 'choker', label: { es: 'Gargantilla', en: 'Choker' } },
  { id: 'pendant', label: { es: 'Colgante', en: 'Pendant' } },
  { id: 'scarf', label: { es: 'Bufanda', en: 'Scarf' } },
];

export const BACKGROUND_CHOICES: Choice[] = [
  { id: 'lilac', label: { es: 'Lila', en: 'Lilac' } },
  { id: 'blush', label: { es: 'Rubor', en: 'Blush' } },
  { id: 'cream', label: { es: 'Crema', en: 'Cream' } },
  { id: 'peach', label: { es: 'Melocotón', en: 'Peach' } },
  { id: 'sky', label: { es: 'Cielo', en: 'Sky' } },
  { id: 'mint', label: { es: 'Menta', en: 'Mint' } },
  { id: 'twilight', label: { es: 'Atardecer', en: 'Twilight' } },
  { id: 'night', label: { es: 'Noche', en: 'Night' } },
];

/** Añade o quita un accesorio respetando un solo accesorio por hueco (cabeza, ojos…). */
export function toggleAccessory(current: string[], id: string): string[] {
  if (current.includes(id)) return current.filter((a) => a !== id);
  const slot = accessorySlot(id);
  return [...current.filter((a) => accessorySlot(a) !== slot), id];
}

// ------------------------------------------------------------------ personajes por defecto
export interface CharacterPreset {
  id: string;
  name: string;
  gender: 'female' | 'male';
  age: number;
  tagline: L;
  traits: string[];
  look: CharacterLook;
}

const look = (l: Omit<CharacterLook, 'v'>): CharacterLook => ({ v: 2, ...l });

export const PRESETS: CharacterPreset[] = [
  {
    id: 'aiko',
    name: 'Aiko',
    gender: 'female',
    age: 24,
    tagline: { es: 'Dulce, romántica y un poco tímida', en: 'Sweet, romantic and a little shy' },
    traits: ['kind', 'romantic', 'shy'],
    look: look({
      face: 'heart', skin: '#FCE3D3', eyes: 'sparkle', eyeColor: '#E0679A', brows: 'soft', mouth: 'smile',
      marks: ['blush', 'mole'], hair: 'wavy', hairColor: '#4A3026', outfit: 'casual', outfitColor: '#E6A0B4',
      accessories: ['flower'], background: 'blush',
    }),
  },
  {
    id: 'kai',
    name: 'Kai',
    gender: 'male',
    age: 26,
    tagline: { es: 'Protector, sarcástico y leal', en: 'Protective, sarcastic and loyal' },
    traits: ['protective', 'sarcastic', 'loyal'],
    look: look({
      face: 'jaw', skin: '#EDBB9A', eyes: 'calm', eyeColor: '#3D7BD9', brows: 'thick', mouth: 'smirk',
      marks: [], hair: 'messy', hairColor: '#2B2A3A', outfit: 'casual', outfitColor: '#3A3644',
      accessories: ['pendant'], background: 'sky',
    }),
  },
  {
    id: 'luna',
    name: 'Luna',
    gender: 'female',
    age: 21,
    tagline: { es: 'Extrovertida, juguetona y brillante', en: 'Outgoing, playful and bright' },
    traits: ['extrovert', 'playful', 'optimistic'],
    look: look({
      face: 'baby', skin: '#FFF1E8', eyes: 'starry', eyeColor: '#6CC3E8', brows: 'arched', mouth: 'grin',
      marks: ['blush', 'star'], hair: 'twintails', hairColor: '#EFE3C8', outfit: 'idol', outfitColor: '#B7A2E8',
      accessories: ['bow'], background: 'lilac',
    }),
  },
  {
    id: 'ren',
    name: 'Ren',
    gender: 'male',
    age: 29,
    tagline: { es: 'Reservado, intelectual y misterioso', en: 'Reserved, intellectual and mysterious' },
    traits: ['reserved', 'intellectual', 'mysterious'],
    look: look({
      face: 'oval', skin: '#FCE3D3', eyes: 'narrow', eyeColor: '#6B4128', brows: 'straight', mouth: 'neutral',
      marks: ['mole'], hair: 'sidepart', hairColor: '#4A3026', outfit: 'teacher', outfitColor: '#C9A77E',
      accessories: ['glasses_square'], background: 'cream',
    }),
  },
  {
    id: 'mei',
    name: 'Mei',
    gender: 'female',
    age: 27,
    tagline: { es: 'Fría por fuera, cariñosa por dentro', en: 'Cold outside, caring inside' },
    traits: ['cold', 'confident', 'protective'],
    look: look({
      face: 'vshape', skin: '#F6D2BC', eyes: 'cat', eyeColor: '#C8283F', brows: 'fierce', mouth: 'neutral',
      marks: ['beauty'], hair: 'hime', hairColor: '#2B2A3A', outfit: 'office', outfitColor: '#27365E',
      accessories: ['earrings'], background: 'peach',
    }),
  },
  {
    id: 'dante',
    name: 'Dante',
    gender: 'male',
    age: 25,
    tagline: { es: 'Rebelde, intenso y con buen corazón', en: 'Rebellious, intense, good-hearted' },
    traits: ['rebellious', 'dominant', 'protective'],
    look: look({
      face: 'long', skin: '#D9A07C', eyes: 'fierce', eyeColor: '#E8C04A', brows: 'fierce', mouth: 'fang',
      marks: ['scar'], hair: 'wolf', hairColor: '#C9CBD6', outfit: 'punk', outfitColor: null,
      accessories: ['choker'], background: 'night',
    }),
  },
];

export const presetById = (id: string | null | undefined) => PRESETS.find((p) => p.id === id);

export const DEFAULT_FEMALE = PRESETS[0];
export const DEFAULT_MALE = PRESETS[1];

// ------------------------------------------------------------------ validación
const pick = (v: unknown, valid: Record<string, unknown>, fallback: string) =>
  typeof v === 'string' && v in valid ? v : fallback;

/**
 * Convierte cualquier apariencia guardada (incluidas las antiguas VRM) en un
 * aspecto válido. Nunca falla: lo que no se reconoce toma el valor del personaje base.
 */
export function normalizeLook(raw: unknown, gender: string = 'female'): CharacterLook {
  const base = (gender === 'male' ? DEFAULT_MALE : DEFAULT_FEMALE).look;
  if (!raw || typeof raw !== 'object' || (raw as { v?: number }).v !== 2) return base;
  const r = raw as Partial<CharacterLook>;
  const accessories = Array.isArray(r.accessories) ? r.accessories.filter((a) => typeof a === 'string' && a in ACCESSORIES) : [];
  const oneBySlot = accessories.reduce<string[]>((acc, a) => toggleAccessory(acc, a), []);
  return {
    v: 2,
    face: pick(r.face, FACE_SHAPES, base.face),
    skin: isHex(r.skin) ? r.skin : base.skin,
    eyes: pick(r.eyes, EYE_STYLES, base.eyes),
    eyeColor: isHex(r.eyeColor) ? r.eyeColor : base.eyeColor,
    brows: pick(r.brows, BROWS, base.brows),
    mouth: pick(r.mouth, MOUTHS, base.mouth),
    marks: Array.isArray(r.marks) ? r.marks.filter((m) => MARK_CHOICES.some((c) => c.id === m)) : [],
    hair: pick(r.hair, HAIR_STYLES, base.hair),
    hairColor: isHex(r.hairColor) ? r.hairColor : base.hairColor,
    outfit: pick(r.outfit, OUTFITS, base.outfit),
    outfitColor: isHex(r.outfitColor) ? r.outfitColor : null,
    accessories: oneBySlot,
    background: pick(r.background, BACKGROUNDS, base.background),
  };
}

/** Descripción en texto del aspecto (para que la IA sepa cómo es el personaje). */
export function describeLook(l: CharacterLook, lang: 'es' | 'en' = 'es'): string {
  const lab = (list: Choice[], id: string) => list.find((c) => c.id === id)?.label[lang] ?? id;
  const col = (list: ColorChoice[], hex: string | null) => (hex ? list.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.label[lang] : null);
  const acc = l.accessories.map((a) => lab(ACCESSORY_CHOICES, a).toLowerCase());
  const marks = l.marks.filter((m) => m !== 'blush').map((m) => lab(MARK_CHOICES, m).toLowerCase());
  if (lang === 'en') {
    return [
      `${lab(HAIR_CHOICES, l.hair).toLowerCase()} hair (${(col(HAIR_COLORS, l.hairColor) ?? 'custom').toLowerCase()})`,
      `${lab(EYE_CHOICES, l.eyes).toLowerCase()} ${(col(EYE_COLORS, l.eyeColor) ?? '').toLowerCase()} eyes`,
      `wearing: ${lab(OUTFIT_CHOICES, l.outfit).toLowerCase()}`,
      acc.length ? `accessories: ${acc.join(', ')}` : '',
      marks.length ? `features: ${marks.join(', ')}` : '',
    ].filter(Boolean).join('; ');
  }
  return [
    `pelo ${lab(HAIR_CHOICES, l.hair).toLowerCase()} (${(col(HAIR_COLORS, l.hairColor) ?? 'color propio').toLowerCase()})`,
    `ojos ${lab(EYE_CHOICES, l.eyes).toLowerCase()} de color ${(col(EYE_COLORS, l.eyeColor) ?? 'especial').toLowerCase()}`,
    `ropa: ${lab(OUTFIT_CHOICES, l.outfit).toLowerCase()}`,
    acc.length ? `accesorios: ${acc.join(', ')}` : '',
    marks.length ? `rasgos: ${marks.join(', ')}` : '',
  ].filter(Boolean).join('; ');
}
