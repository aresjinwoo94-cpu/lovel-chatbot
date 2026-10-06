/**
 * Aspecto de un personaje de Lovel House: un modelo VRM (el formato 3D de los
 * VTubers, hecho con VRoid) + peinado + colores + rostro + pose + accesorios + escena.
 */
export type Expression = 'neutral' | 'smile' | 'joy' | 'calm' | 'serious' | 'shy' | 'smug' | 'sad' | 'surprised' | 'angry' | 'sleepy';
export type Pose = 'relaxed' | 'formal' | 'confident' | 'shy' | 'hands_back' | 'wave';
export type Lighting = 'studio' | 'soft' | 'warm' | 'cool' | 'sunset' | 'night' | 'dramatic';
export type Effect = 'none' | 'sparkles' | 'petals' | 'snow' | 'fireflies' | 'bubbles' | 'hearts';
export type Outline = 'none' | 'normal' | 'bold';

/** Voz del personaje (ElevenLabs). */
export interface VoiceSettings {
  /** id de una voz del catálogo (null = la automática según género y edad). */
  id: string | null;
  /** 0.7 – 1.2 */
  speed: number;
  /** 0 (estable) – 1 (muy expresiva) */
  style: number;
}

export interface CharacterLook {
  /** Versión del formato (3 = personaje VRM). */
  v: 3;
  /** Modelo base (rostro, cuerpo y ropa): id del catálogo o URL de un VRM propio. */
  model: string;
  /** Peinado de otro modelo del catálogo (null = el del propio modelo). */
  hair: string | null;
  // Colores (null = el original del modelo)
  hairColor: string | null;
  /** Degradado en las puntas del pelo. */
  hairTip: string | null;
  eyeColor: string | null;
  /** Brillo de los ojos (false = mirada sin brillo). */
  eyeShine: boolean;
  skinTone: string | null;
  // Ropa por piezas
  outfitColor: string | null;
  bottomColor: string | null;
  shoesColor: string | null;
  accentColor: string | null;
  // Rostro
  expression: Expression;
  /** Rubor 0 – 1 */
  blush: number;
  lipColor: string | null;
  eyeshadow: string | null;
  /** Marcas en la cara: pecas, lunar, estrella… */
  marks: string[];
  // Cuerpo y pose
  pose: Pose;
  /** -1 – 1 */
  headTilt: number;
  /** -1 – 1 */
  headTurn: number;
  /** 0.9 – 1.12 */
  headSize: number;
  // Accesorios (uno por zona) y su color
  accessories: string[];
  accessoryColor: string | null;
  // Escena
  background: string;
  lighting: Lighting;
  effect: Effect;
  // Acabado
  outline: Outline;
  /** Brillo de contorno 0 – 1 */
  shine: number;
  voice: VoiceSettings;
}

/** Estado visual del personaje. */
export type Presence = 'idle' | 'thinking' | 'listening' | 'speaking' | 'happy' | 'offline';
