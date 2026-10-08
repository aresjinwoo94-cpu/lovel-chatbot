import { isHex } from './color';
import type { CharacterLook, Effect, Expression, Lighting, Outline, Pose, VoiceSettings } from './types';

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
  /** Modelo base sin peinado propio: usa siempre uno del catálogo. */
  needsHair?: string;
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
  { id: 'base_f', gender: 'female', label: { es: 'Uniforme', en: 'Uniform' }, needsHair: 'mei' },
  { id: 'sample_b', gender: 'female', label: { es: 'Urbana', en: 'Streetwear' }, vrm1: true },
  { id: 'aria', gender: 'female', label: { es: 'Minimal', en: 'Minimal' }, vrm1: true },
  { id: 'fumiriya', gender: 'male', label: { es: 'Estudiante', en: 'Student' }, hairDonor: true },
  { id: 'hair_m', gender: 'male', label: { es: 'Urbano', en: 'Urban' }, hairDonor: true },
  { id: 'base_m', gender: 'male', label: { es: 'Uniforme', en: 'Uniform' }, needsHair: 'fumiriya' },
];

export const modelById = (id: string | null | undefined) => MODELS.find((m) => m.id === id);
export const isCustomModel = (model: string) => /^https?:/.test(model);

export interface Choice<T extends string = string> {
  id: T;
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
  { id: 'ash', hex: '#8E8277', label: { es: 'Castaño ceniza', en: 'Ash brown' } },
  { id: 'honey', hex: '#D9AE6A', label: { es: 'Rubio miel', en: 'Honey blonde' } },
  { id: 'strawberry', hex: '#E3A27E', label: { es: 'Rubio fresa', en: 'Strawberry blonde' } },
  { id: 'platinum', hex: '#EEE4CF', label: { es: 'Platino', en: 'Platinum' } },
  { id: 'white', hex: '#F4F2F6', label: { es: 'Blanco', en: 'White' } },
  { id: 'silver', hex: '#C9CBD6', label: { es: 'Plateado', en: 'Silver' } },
  { id: 'red', hex: '#B5452F', label: { es: 'Cobrizo', en: 'Copper' } },
  { id: 'orange', hex: '#E07B39', label: { es: 'Naranja', en: 'Orange' } },
  { id: 'wine', hex: '#7A2338', label: { es: 'Vino', en: 'Wine' } },
  { id: 'pink', hex: '#F0A8C0', label: { es: 'Rosa', en: 'Pink' } },
  { id: 'lavender', hex: '#B7A2E8', label: { es: 'Lavanda', en: 'Lavender' } },
  { id: 'purple', hex: '#5B3F8C', label: { es: 'Púrpura', en: 'Purple' } },
  { id: 'blue', hex: '#5C7FD6', label: { es: 'Azul', en: 'Blue' } },
  { id: 'teal', hex: '#3E9C9A', label: { es: 'Verde azulado', en: 'Teal' } },
  { id: 'mint', hex: '#8FD3C1', label: { es: 'Menta', en: 'Mint' } },
];

export const EYE_COLORS: ColorChoice[] = [
  { id: 'violet', hex: '#8B5BD6', label: { es: 'Violeta', en: 'Violet' } },
  { id: 'lilac', hex: '#B79BEA', label: { es: 'Lila', en: 'Lilac' } },
  { id: 'blue', hex: '#3D7BD9', label: { es: 'Azul', en: 'Blue' } },
  { id: 'sky', hex: '#6CC3E8', label: { es: 'Celeste', en: 'Sky' } },
  { id: 'teal', hex: '#2FA39A', label: { es: 'Turquesa', en: 'Teal' } },
  { id: 'green', hex: '#4FA36B', label: { es: 'Verde', en: 'Green' } },
  { id: 'amber', hex: '#D98F2B', label: { es: 'Ámbar', en: 'Amber' } },
  { id: 'gold', hex: '#E8C04A', label: { es: 'Dorado', en: 'Gold' } },
  { id: 'brown', hex: '#7A4A2E', label: { es: 'Café', en: 'Brown' } },
  { id: 'red', hex: '#C8283F', label: { es: 'Rubí', en: 'Ruby' } },
  { id: 'pink', hex: '#E0679A', label: { es: 'Rosa', en: 'Pink' } },
  { id: 'grey', hex: '#8C95A6', label: { es: 'Gris', en: 'Grey' } },
];

export const SKIN_TONES: ColorChoice[] = [
  { id: 'porcelain', hex: '#FBEDE6', label: { es: 'Porcelana', en: 'Porcelain' } },
  { id: 'ivory', hex: '#F8E6D6', label: { es: 'Marfil', en: 'Ivory' } },
  { id: 'light', hex: '#F6DCCB', label: { es: 'Clara', en: 'Light' } },
  { id: 'warm', hex: '#E9BB98', label: { es: 'Cálida', en: 'Warm' } },
  { id: 'golden', hex: '#DDAA7C', label: { es: 'Dorada', en: 'Golden' } },
  { id: 'tan', hex: '#CF9670', label: { es: 'Bronceada', en: 'Tan' } },
  { id: 'brown', hex: '#9A6446', label: { es: 'Morena', en: 'Brown' } },
  { id: 'deep', hex: '#6E4430', label: { es: 'Oscura', en: 'Deep' } },
];

/** Colores de ropa (prenda superior, inferior, calzado, detalles y accesorios). */
export const OUTFIT_COLORS: ColorChoice[] = [
  { id: 'violet', hex: '#6F5BD3', label: { es: 'Violeta', en: 'Violet' } },
  { id: 'lilac', hex: '#B8A6EA', label: { es: 'Lila', en: 'Lilac' } },
  { id: 'rose', hex: '#E6A0B4', label: { es: 'Rosa', en: 'Rose' } },
  { id: 'red', hex: '#B8323F', label: { es: 'Rojo', en: 'Red' } },
  { id: 'wine', hex: '#8C2F46', label: { es: 'Vino', en: 'Wine' } },
  { id: 'mustard', hex: '#D4A53C', label: { es: 'Mostaza', en: 'Mustard' } },
  { id: 'olive', hex: '#6B7343', label: { es: 'Oliva', en: 'Olive' } },
  { id: 'forest', hex: '#2E4A3A', label: { es: 'Bosque', en: 'Forest' } },
  { id: 'teal', hex: '#2F7C80', label: { es: 'Petróleo', en: 'Teal' } },
  { id: 'sky', hex: '#5C7FB8', label: { es: 'Azul', en: 'Blue' } },
  { id: 'navy', hex: '#27365E', label: { es: 'Marino', en: 'Navy' } },
  { id: 'camel', hex: '#C9A77E', label: { es: 'Camel', en: 'Camel' } },
  { id: 'charcoal', hex: '#3A3644', label: { es: 'Carbón', en: 'Charcoal' } },
  { id: 'black', hex: '#1E1A24', label: { es: 'Negro', en: 'Black' } },
  { id: 'white', hex: '#F4F1EC', label: { es: 'Blanco', en: 'White' } },
];

export const LIP_COLORS: ColorChoice[] = [
  { id: 'nude', hex: '#C98C7E', label: { es: 'Nude', en: 'Nude' } },
  { id: 'rose', hex: '#D9708A', label: { es: 'Rosa', en: 'Rose' } },
  { id: 'coral', hex: '#E5735E', label: { es: 'Coral', en: 'Coral' } },
  { id: 'red', hex: '#C8283F', label: { es: 'Rojo', en: 'Red' } },
  { id: 'berry', hex: '#9C2D5A', label: { es: 'Frambuesa', en: 'Berry' } },
  { id: 'plum', hex: '#6E2E55', label: { es: 'Ciruela', en: 'Plum' } },
];

export const EYESHADOWS: ColorChoice[] = [
  { id: 'rose', hex: '#E8A3B5', label: { es: 'Rosa', en: 'Rose' } },
  { id: 'peach', hex: '#EDB48C', label: { es: 'Melocotón', en: 'Peach' } },
  { id: 'lilac', hex: '#B7A2E8', label: { es: 'Lila', en: 'Lilac' } },
  { id: 'gold', hex: '#D9B45C', label: { es: 'Dorado', en: 'Gold' } },
  { id: 'teal', hex: '#6BB3B0', label: { es: 'Turquesa', en: 'Teal' } },
  { id: 'smoky', hex: '#6E6470', label: { es: 'Ahumado', en: 'Smoky' } },
];

export const MARKS: Choice[] = [
  { id: 'freckles', label: { es: 'Pecas', en: 'Freckles' } },
  { id: 'mole', label: { es: 'Lunar', en: 'Beauty mark' } },
  { id: 'blush_lines', label: { es: 'Sonrojo anime', en: 'Anime blush' } },
  { id: 'star', label: { es: 'Estrella', en: 'Star' } },
  { id: 'heart', label: { es: 'Corazón', en: 'Heart' } },
  { id: 'tear', label: { es: 'Lágrima', en: 'Teardrop' } },
  { id: 'scar', label: { es: 'Cicatriz', en: 'Scar' } },
  { id: 'whiskers', label: { es: 'Bigotes', en: 'Whiskers' } },
];

export const EXPRESSIONS: Choice<Expression>[] = [
  { id: 'neutral', label: { es: 'Natural', en: 'Natural' } },
  { id: 'smile', label: { es: 'Sonriente', en: 'Smiling' } },
  { id: 'joy', label: { es: 'Alegre', en: 'Joyful' } },
  { id: 'calm', label: { es: 'Serena', en: 'Calm' } },
  { id: 'shy', label: { es: 'Tímida', en: 'Shy' } },
  { id: 'smug', label: { es: 'Pícara', en: 'Smug' } },
  { id: 'serious', label: { es: 'Seria', en: 'Serious' } },
  { id: 'angry', label: { es: 'Enfadada', en: 'Angry' } },
  { id: 'sad', label: { es: 'Melancólica', en: 'Melancholic' } },
  { id: 'surprised', label: { es: 'Sorprendida', en: 'Surprised' } },
  { id: 'sleepy', label: { es: 'Somnolienta', en: 'Sleepy' } },
];

export const POSES: Choice<Pose>[] = [
  { id: 'relaxed', label: { es: 'Relajada', en: 'Relaxed' } },
  { id: 'formal', label: { es: 'Erguida', en: 'Upright' } },
  { id: 'confident', label: { es: 'Segura', en: 'Confident' } },
  { id: 'shy', label: { es: 'Tímida', en: 'Shy' } },
  { id: 'hands_back', label: { es: 'Manos atrás', en: 'Hands behind' } },
  { id: 'wave', label: { es: 'Saludando', en: 'Waving' } },
];

export const LIGHTINGS: Choice<Lighting>[] = [
  { id: 'vtuber', label: { es: 'Anime (VTuber)', en: 'Anime (VTuber)' } },
  { id: 'studio', label: { es: 'Estudio', en: 'Studio' } },
  { id: 'soft', label: { es: 'Suave', en: 'Soft' } },
  { id: 'warm', label: { es: 'Cálida', en: 'Warm' } },
  { id: 'cool', label: { es: 'Fría', en: 'Cool' } },
  { id: 'sunset', label: { es: 'Atardecer', en: 'Sunset' } },
  { id: 'night', label: { es: 'Nocturna', en: 'Night' } },
  { id: 'dramatic', label: { es: 'Dramática', en: 'Dramatic' } },
];

export const EFFECTS: Choice<Effect>[] = [
  { id: 'none', label: { es: 'Ninguno', en: 'None' } },
  { id: 'sparkles', label: { es: 'Destellos', en: 'Sparkles' } },
  { id: 'petals', label: { es: 'Pétalos', en: 'Petals' } },
  { id: 'snow', label: { es: 'Nieve', en: 'Snow' } },
  { id: 'fireflies', label: { es: 'Luciérnagas', en: 'Fireflies' } },
  { id: 'bubbles', label: { es: 'Burbujas', en: 'Bubbles' } },
  { id: 'hearts', label: { es: 'Corazones', en: 'Hearts' } },
];

export const OUTLINES: Choice<Outline>[] = [
  { id: 'none', label: { es: 'Sin línea', en: 'None' } },
  { id: 'normal', label: { es: 'Normal', en: 'Normal' } },
  { id: 'bold', label: { es: 'Marcada', en: 'Bold' } },
];

export type AccessorySlot = 'eyes' | 'top' | 'halo' | 'side' | 'ears' | 'back';
/** Accesorios 3D (uno por zona). */
export const ACCESSORIES: (Choice & { slot: AccessorySlot })[] = [
  { id: 'glasses_round', slot: 'eyes', label: { es: 'Gafas redondas', en: 'Round glasses' } },
  { id: 'glasses_square', slot: 'eyes', label: { es: 'Gafas cuadradas', en: 'Square glasses' } },
  { id: 'sunglasses', slot: 'eyes', label: { es: 'Gafas de sol', en: 'Sunglasses' } },
  { id: 'monocle', slot: 'eyes', label: { es: 'Monóculo', en: 'Monocle' } },
  { id: 'eyepatch', slot: 'eyes', label: { es: 'Parche', en: 'Eyepatch' } },
  { id: 'cat_ears', slot: 'top', label: { es: 'Orejas de gato', en: 'Cat ears' } },
  { id: 'fox_ears', slot: 'top', label: { es: 'Orejas de zorro', en: 'Fox ears' } },
  { id: 'bunny_ears', slot: 'top', label: { es: 'Orejas de conejo', en: 'Bunny ears' } },
  { id: 'horns', slot: 'top', label: { es: 'Cuernos', en: 'Horns' } },
  { id: 'tiara', slot: 'top', label: { es: 'Diadema', en: 'Tiara' } },
  { id: 'flower_crown', slot: 'top', label: { es: 'Corona de flores', en: 'Flower crown' } },
  { id: 'halo', slot: 'halo', label: { es: 'Aureola', en: 'Halo' } },
  { id: 'bow', slot: 'side', label: { es: 'Lazo', en: 'Bow' } },
  { id: 'flower', slot: 'side', label: { es: 'Flor', en: 'Flower' } },
  { id: 'star_clip', slot: 'side', label: { es: 'Horquilla de estrella', en: 'Star clip' } },
  { id: 'headphones', slot: 'ears', label: { es: 'Auriculares', en: 'Headphones' } },
  { id: 'angel_wings', slot: 'back', label: { es: 'Alas de ángel', en: 'Angel wings' } },
  { id: 'demon_wings', slot: 'back', label: { es: 'Alas de demonio', en: 'Demon wings' } },
  { id: 'fairy_wings', slot: 'back', label: { es: 'Alas de hada', en: 'Fairy wings' } },
];

export const ACCESSORY_GROUPS: { slot: AccessorySlot; label: L }[] = [
  { slot: 'eyes', label: { es: 'Ojos', en: 'Eyes' } },
  { slot: 'top', label: { es: 'Cabeza', en: 'Head' } },
  { slot: 'side', label: { es: 'Horquillas', en: 'Hair clips' } },
  { slot: 'halo', label: { es: 'Aureola', en: 'Halo' } },
  { slot: 'ears', label: { es: 'Orejas', en: 'Ears' } },
  { slot: 'back', label: { es: 'Espalda', en: 'Back' } },
];

export const BACKGROUNDS: (Choice & { hex: string })[] = [
  // Fondos ilustrados de stream
  { id: 'dusk', hex: '#B2557F', label: { es: 'Atardecer pintado', en: 'Painted dusk' } },
  { id: 'city', hex: '#3E2D5E', label: { es: 'Ciudad de noche', en: 'City at night' } },
  { id: 'starry', hex: '#25275A', label: { es: 'Cielo estrellado', en: 'Starry sky' } },
  { id: 'aurora', hex: '#2E5B78', label: { es: 'Aurora', en: 'Aurora' } },
  { id: 'dawn', hex: '#EBC9D6', label: { es: 'Amanecer', en: 'Dawn' } },
  { id: 'room', hex: '#3B2E45', label: { es: 'Habitación', en: 'Cozy room' } },
  { id: 'lilac', hex: '#E7E1F6', label: { es: 'Lila', en: 'Lilac' } },
  { id: 'blush', hex: '#F2E2E8', label: { es: 'Rubor', en: 'Blush' } },
  { id: 'sakura', hex: '#F6DFE8', label: { es: 'Sakura', en: 'Sakura' } },
  { id: 'cream', hex: '#EEE8DE', label: { es: 'Crema', en: 'Cream' } },
  { id: 'peach', hex: '#F2E4D9', label: { es: 'Melocotón', en: 'Peach' } },
  { id: 'sunset', hex: '#F1CDC6', label: { es: 'Atardecer', en: 'Sunset' } },
  { id: 'white', hex: '#F7F6F4', label: { es: 'Blanco', en: 'White' } },
  { id: 'studio', hex: '#E1E1E5', label: { es: 'Estudio', en: 'Studio' } },
  { id: 'sky', hex: '#E3EAF4', label: { es: 'Cielo', en: 'Sky' } },
  { id: 'ocean', hex: '#CDE6E9', label: { es: 'Océano', en: 'Ocean' } },
  { id: 'mint', hex: '#E0EDE6', label: { es: 'Menta', en: 'Mint' } },
  { id: 'forest', hex: '#CFDDCE', label: { es: 'Bosque', en: 'Forest' } },
  { id: 'twilight', hex: '#D6CDEF', label: { es: 'Crepúsculo', en: 'Twilight' } },
  { id: 'night', hex: '#2A2633', label: { es: 'Noche', en: 'Night' } },
  { id: 'midnight', hex: '#222842', label: { es: 'Medianoche', en: 'Midnight' } },
  { id: 'wine', hex: '#3A1C28', label: { es: 'Burdeos', en: 'Burgundy' } },
];
export const DARK_BACKGROUNDS = ['night', 'midnight', 'wine', 'dusk', 'city', 'starry', 'aurora', 'room'];
/** Fondos ilustrados: el texto encima va en claro. */
export const PAINTED_BACKGROUNDS = ['dusk', 'city', 'starry', 'aurora', 'dawn', 'room'];

// ------------------------------------------------------------------ voces (ElevenLabs, voces prediseñadas)
export interface VoiceChoice {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'neutral';
  tags: L;
}
export const VOICES: VoiceChoice[] = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', tags: { es: 'Cálida · joven', en: 'Warm · young' } },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'female', tags: { es: 'Alegre · enérgica', en: 'Upbeat · energetic' } },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'female', tags: { es: 'Expresiva · juguetona', en: 'Expressive · playful' } },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'female', tags: { es: 'Amable · madura', en: 'Friendly · mature' } },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'female', tags: { es: 'Segura · elegante', en: 'Confident · elegant' } },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'female', tags: { es: 'Aterciopelada · serena', en: 'Velvety · calm' } },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'male', tags: { es: 'Joven · cercano', en: 'Young · friendly' } },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'male', tags: { es: 'Relajado · amable', en: 'Chill · kind' } },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', gender: 'male', tags: { es: 'Suave · de confianza', en: 'Smooth · trustworthy' } },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'male', tags: { es: 'Casual · natural', en: 'Casual · natural' } },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'male', tags: { es: 'Grave · sereno', en: 'Deep · calm' } },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'male', tags: { es: 'Intenso · ronco', en: 'Intense · husky' } },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', tags: { es: 'Cálido · narrador', en: 'Warm · storyteller' } },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male', tags: { es: 'Firme · autoritario', en: 'Firm · authoritative' } },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', gender: 'neutral', tags: { es: 'Neutra · tranquila', en: 'Neutral · relaxed' } },
];
export const voiceById = (id: string | null | undefined) => VOICES.find((v) => v.id === id);
export const DEFAULT_VOICE: VoiceSettings = { id: null, speed: 1, style: 0.3 };

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

// ------------------------------------------------------------------ aspecto por defecto
export const LOOK_DEFAULTS: Omit<CharacterLook, 'model'> = {
  v: 3,
  hair: null,
  hairColor: null,
  hairTip: null,
  eyeColor: null,
  eyeShine: true,
  skinTone: null,
  outfitColor: null,
  bottomColor: null,
  shoesColor: null,
  accentColor: null,
  plainOutfit: false,
  expression: 'neutral',
  blush: 0,
  lipColor: null,
  eyeshadow: null,
  marks: [],
  pose: 'relaxed',
  headTilt: 0,
  headTurn: 0,
  headSize: 0.93,
  accessories: [],
  accessoryColor: null,
  background: 'dusk',
  lighting: 'vtuber',
  effect: 'none',
  outline: 'normal',
  shine: 0.2,
  voice: DEFAULT_VOICE,
};

export const makeLook = (l: Partial<CharacterLook> & { model: string }): CharacterLook => {
  const m = modelById(l.model);
  return { ...LOOK_DEFAULTS, ...l, hair: l.hair ?? m?.needsHair ?? null };
};

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

// Personajes adultos con estética VTuber: ropa sencilla, sombreado anime plano y fondos ilustrados.
const v = (id: string, speed = 1, style = 0.35) => ({ id, speed, style });
export const PRESETS: CharacterPreset[] = [
  {
    id: 'aiko', name: 'Aiko', gender: 'female', age: 24,
    tagline: { es: 'Dulce, romántica y un poco tímida', en: 'Sweet, romantic and a little shy' },
    traits: ['kind', 'romantic', 'shy'],
    look: makeLook({ model: 'mei', plainOutfit: true, expression: 'smile', blush: 0.35, background: 'dusk', voice: v('EXAVITQu4vr4xnSDxMaL') }),
  },
  {
    id: 'kai', name: 'Kai', gender: 'male', age: 27,
    tagline: { es: 'Protector, sarcástico y leal', en: 'Protective, sarcastic and loyal' },
    traits: ['protective', 'sarcastic', 'loyal'],
    look: makeLook({ model: 'hair_m', plainOutfit: true, expression: 'smug', background: 'aurora', voice: v('TX3LPaxmHKxFdv7VOQHJ', 1, 0.3) }),
  },
  {
    id: 'nyx', name: 'Nyx', gender: 'female', age: 26,
    tagline: { es: 'Misteriosa, orgullosa y magnética', en: 'Mysterious, proud and magnetic' },
    traits: ['mysterious', 'proud', 'flirty'],
    look: makeLook({ model: 'base_f', hair: 'noir', hairColor: '#7A2338', eyeColor: '#C8283F', plainOutfit: true, expression: 'smug', background: 'dusk', voice: v('pFZP5JQG7iQjIQuC4Bku', 0.95, 0.45) }),
  },
  {
    id: 'mei', name: 'Mei', gender: 'female', age: 28,
    tagline: { es: 'Fría por fuera, cariñosa por dentro', en: 'Cold outside, caring inside' },
    traits: ['cold', 'confident', 'protective'],
    look: makeLook({ model: 'shino', plainOutfit: true, expression: 'serious', eyeColor: '#C8283F', background: 'starry', voice: v('Xb7hH8MSUJpSbSDYk0k2', 0.97, 0.2) }),
  },
  {
    id: 'ren', name: 'Ren', gender: 'male', age: 29,
    tagline: { es: 'Reservado, intelectual y misterioso', en: 'Reserved, intellectual and mysterious' },
    traits: ['reserved', 'intellectual', 'mysterious'],
    look: makeLook({ model: 'base_m', hair: 'fumiriya', hairColor: '#4A3026', plainOutfit: true, accessories: ['glasses_square'], expression: 'calm', background: 'room', voice: v('cjVigY5qzO86Huf0OWal', 0.95, 0.2) }),
  },
  {
    id: 'luna', name: 'Luna', gender: 'female', age: 23,
    tagline: { es: 'Extrovertida, juguetona y brillante', en: 'Outgoing, playful and bright' },
    traits: ['extrovert', 'playful', 'optimistic'],
    look: makeLook({ model: 'base_f', hair: 'victoria', hairColor: '#D9AE6A', eyeColor: '#3D7BD9', plainOutfit: true, outfitColor: '#F4F1EC', expression: 'joy', background: 'dawn', voice: v('FGY2WhTYpPnrIDTdsKH5', 1.05, 0.55) }),
  },
  {
    id: 'dante', name: 'Dante', gender: 'male', age: 27,
    tagline: { es: 'Rebelde, intenso y con buen corazón', en: 'Rebellious, intense, good-hearted' },
    traits: ['rebellious', 'dominant', 'protective'],
    look: makeLook({ model: 'fumiriya', hair: 'hair_m', hairColor: '#C9CBD6', eyeColor: '#E8C04A', plainOutfit: true, expression: 'serious', marks: ['scar'], background: 'city', voice: v('N2lVS1w4EtoT3dr4eOWO', 0.98, 0.4) }),
  },
  {
    id: 'victoria', name: 'Victoria', gender: 'female', age: 26,
    tagline: { es: 'Dramática, orgullosa y encantadora', en: 'Dramatic, proud and charming' },
    traits: ['dramatic', 'proud', 'romantic'],
    look: makeLook({ model: 'base_f', hair: 'mei', hairColor: '#EEE4CF', eyeColor: '#8B5BD6', plainOutfit: true, outfitColor: '#5B3F8C', expression: 'smile', lipColor: '#D9708A', background: 'aurora', voice: v('Xb7hH8MSUJpSbSDYk0k2', 1, 0.5) }),
  },
  {
    id: 'zoe', name: 'Zoe', gender: 'female', age: 24,
    tagline: { es: 'Rebelde, divertida y sin filtro', en: 'Rebellious, funny and unfiltered' },
    traits: ['rebellious', 'funny', 'confident'],
    look: makeLook({ model: 'sample_b', expression: 'smug', background: 'city', voice: v('cgSgspJ2msm6clMCkdW9', 1.05, 0.6) }),
  },
  {
    id: 'vita', name: 'Vita', gender: 'female', age: 27,
    tagline: { es: 'Intelectual, seria y leal', en: 'Intellectual, serious and loyal' },
    traits: ['intellectual', 'serious', 'loyal'],
    look: makeLook({ model: 'aria', accessories: ['glasses_round'], expression: 'calm', background: 'dawn', voice: v('XrExE9yKIg1WjnnlVkGX', 0.98, 0.25) }),
  },
  {
    id: 'hana', name: 'Hana', gender: 'female', age: 22,
    tagline: { es: 'Soñadora, tierna y curiosa', en: 'Dreamy, tender and curious' },
    traits: ['kind', 'optimistic', 'shy'],
    look: makeLook({ model: 'base_f', hair: 'shibu', hairColor: '#B7A2E8', eyeColor: '#B79BEA', plainOutfit: true, outfitColor: '#F4F1EC', expression: 'shy', blush: 0.45, background: 'room', voice: v('EXAVITQu4vr4xnSDxMaL', 1.03, 0.45) }),
  },
  {
    id: 'sora', name: 'Sora', gender: 'male', age: 25,
    tagline: { es: 'Tranquilo, atento y leal', en: 'Calm, attentive and loyal' },
    traits: ['loyal', 'kind', 'reserved'],
    look: makeLook({ model: 'base_m', hair: 'fumiriya', hairColor: '#2B2A3A', hairTip: '#5C7FD6', eyeColor: '#3D7BD9', plainOutfit: true, expression: 'calm', accessories: ['headphones'], background: 'dusk', voice: v('bIHbv24MWmeRgasZH58o', 1, 0.25) }),
  },
];

export const presetById = (id: string | null | undefined) => PRESETS.find((p) => p.id === id);
export const DEFAULT_FEMALE = PRESETS[0];
export const DEFAULT_MALE = PRESETS[1];

// ------------------------------------------------------------------ validación
const clamp = (v: unknown, min: number, max: number, def: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : def;
  return Math.max(min, Math.min(max, n));
};
const oneOf = <T extends string>(list: Choice<T>[], v: unknown, def: T): T => (list.some((c) => c.id === v) ? (v as T) : def);

/**
 * Convierte cualquier apariencia guardada (incluidas las antiguas) en un aspecto
 * válido. Nunca falla: lo que no se reconoce toma el valor por defecto.
 */
export function normalizeLook(raw: unknown, gender: string = 'female'): CharacterLook {
  const base = (gender === 'male' ? DEFAULT_MALE : DEFAULT_FEMALE).look;
  if (!raw || typeof raw !== 'object' || (raw as { v?: number }).v !== 3) return base;
  const r = raw as Partial<CharacterLook>;
  const model = typeof r.model === 'string' && (modelById(r.model) || isCustomModel(r.model)) ? r.model : base.model;
  const needs = modelById(model)?.needsHair;
  const hair = typeof r.hair === 'string' && HAIRSTYLES.some((h) => h.id === r.hair) && hairCompatible(model) ? r.hair : (needs ?? null);
  const color = (v: unknown) => (isHex(v) ? v : null);
  const v = (r.voice ?? {}) as Partial<VoiceSettings>;
  return {
    v: 3,
    model,
    hair,
    hairColor: color(r.hairColor),
    hairTip: color(r.hairTip),
    eyeColor: color(r.eyeColor),
    eyeShine: r.eyeShine !== false,
    skinTone: color(r.skinTone),
    outfitColor: color(r.outfitColor),
    bottomColor: color(r.bottomColor),
    shoesColor: color(r.shoesColor),
    accentColor: color(r.accentColor),
    plainOutfit: r.plainOutfit === true,
    expression: oneOf(EXPRESSIONS, r.expression, 'neutral'),
    blush: clamp(r.blush, 0, 1, 0),
    lipColor: color(r.lipColor),
    eyeshadow: color(r.eyeshadow),
    marks: Array.isArray(r.marks) ? r.marks.filter((m) => MARKS.some((x) => x.id === m)).slice(0, 4) : [],
    pose: oneOf(POSES, r.pose, 'relaxed'),
    headTilt: clamp(r.headTilt, -1, 1, 0),
    headTurn: clamp(r.headTurn, -1, 1, 0),
    headSize: clamp(r.headSize, 0.9, 1.12, 0.93),
    accessories: Array.isArray(r.accessories) ? r.accessories.filter((a) => ACCESSORIES.some((x) => x.id === a)).reduce<string[]>(toggleAccessory, []) : [],
    accessoryColor: color(r.accessoryColor),
    background: BACKGROUNDS.some((b) => b.id === r.background) ? (r.background as string) : base.background,
    lighting: oneOf(LIGHTINGS, r.lighting, 'vtuber'),
    effect: oneOf(EFFECTS, r.effect, 'none'),
    outline: oneOf(OUTLINES, r.outline, 'normal'),
    shine: clamp(r.shine, 0, 1, 0.2),
    voice: {
      id: typeof v.id === 'string' && voiceById(v.id) ? v.id : null,
      speed: clamp(v.speed, 0.7, 1.2, 1),
      style: clamp(v.style, 0, 1, 0.3),
    },
  };
}

// ------------------------------------------------------------------ aleatorio
const rnd = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const chance = (p: number) => Math.random() < p;

/** Un personaje sorpresa coherente (no todo a la vez: cada detalle con su probabilidad). */
export function randomLook(gender: 'female' | 'male' | 'other', voice?: VoiceSettings): CharacterLook {
  const pool = MODELS.filter((m) => gender === 'other' || m.gender === gender);
  const model = rnd(pool);
  const hair = model.needsHair ? rnd(HAIRSTYLES).id : !model.vrm1 && chance(0.4) ? rnd(HAIRSTYLES).id : null;
  const accessories: string[] = [];
  if (chance(0.45)) accessories.push(rnd(ACCESSORIES).id);
  if (chance(0.2)) accessories.push(rnd(ACCESSORIES).id);
  const dark = chance(0.15);
  return makeLook({
    model: model.id,
    hair,
    hairColor: chance(0.6) ? rnd(HAIR_COLORS).hex : null,
    hairTip: chance(0.2) ? rnd(HAIR_COLORS).hex : null,
    eyeColor: chance(0.6) ? rnd(EYE_COLORS).hex : null,
    skinTone: chance(0.3) ? rnd(SKIN_TONES).hex : null,
    outfitColor: chance(0.5) ? rnd(OUTFIT_COLORS).hex : null,
    bottomColor: chance(0.3) ? rnd(OUTFIT_COLORS).hex : null,
    expression: rnd(EXPRESSIONS.slice(0, 7)).id,
    blush: chance(0.4) ? Math.round(Math.random() * 10) / 10 : 0,
    marks: chance(0.25) ? [rnd(MARKS).id] : [],
    pose: rnd(POSES).id,
    accessories: accessories.reduce<string[]>(toggleAccessory, []),
    background: chance(0.7) ? rnd(PAINTED_BACKGROUNDS) : dark ? rnd(DARK_BACKGROUNDS) : rnd(BACKGROUNDS.filter((b) => !DARK_BACKGROUNDS.includes(b.id))).id,
    lighting: chance(0.75) ? 'vtuber' : dark ? rnd(['night', 'dramatic'] as Lighting[]) : rnd(['studio', 'soft', 'warm', 'cool', 'sunset'] as Lighting[]),
    plainOutfit: chance(0.6),
    effect: chance(0.25) ? rnd(EFFECTS.slice(1)).id : 'none',
    voice: voice ?? DEFAULT_VOICE,
  });
}

// ------------------------------------------------------------------ descripción para la IA
/** Descripción del aspecto para que la IA sepa cómo es el personaje. */
export function describeLook(l: CharacterLook, lang: 'es' | 'en' = 'es'): string {
  const name = <T extends Choice>(list: T[], id: string | null) => list.find((c) => c.id === id)?.label[lang];
  const col = (list: ColorChoice[], hex: string | null) => (hex ? list.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.label[lang].toLowerCase() : null);
  const style = modelById(l.model)?.label[lang] ?? (lang === 'es' ? 'estilo propio' : 'own style');
  const hair = l.hair ? name(HAIRSTYLES, l.hair) : null;
  const acc = l.accessories.map((a) => name(ACCESSORIES, a)?.toLowerCase()).filter(Boolean);
  const marks = l.marks.map((m) => name(MARKS, m)?.toLowerCase()).filter(Boolean);
  const hairCol = col(HAIR_COLORS, l.hairColor);
  const tip = col(HAIR_COLORS, l.hairTip);
  const eyes = col(EYE_COLORS, l.eyeColor);
  const expr = l.expression !== 'neutral' ? name(EXPRESSIONS, l.expression)?.toLowerCase() : null;
  const parts =
    lang === 'es'
      ? [
          `estilo ${style.toLowerCase()}`,
          hair ? `peinado: ${hair.toLowerCase()}` : '',
          hairCol ? `pelo ${hairCol}${tip ? ` con puntas ${tip}` : ''}` : tip ? `puntas del pelo ${tip}` : '',
          eyes ? `ojos ${eyes}` : '',
          marks.length ? `rasgos: ${marks.join(', ')}` : '',
          acc.length ? `accesorios: ${acc.join(', ')}` : '',
          expr ? `gesto habitual: ${expr}` : '',
        ]
      : [
          `${style.toLowerCase()} style`,
          hair ? `hairstyle: ${hair.toLowerCase()}` : '',
          hairCol ? `${hairCol} hair${tip ? ` with ${tip} tips` : ''}` : tip ? `${tip} hair tips` : '',
          eyes ? `${eyes} eyes` : '',
          marks.length ? `features: ${marks.join(', ')}` : '',
          acc.length ? `accessories: ${acc.join(', ')}` : '',
          expr ? `usual expression: ${expr}` : '',
        ];
  return parts.filter(Boolean).join('; ');
}
