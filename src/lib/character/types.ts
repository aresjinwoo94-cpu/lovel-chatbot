/**
 * Aspecto de un personaje de Lovel House: un modelo VRM (el formato 3D de los
 * VTubers, hecho con VRoid) + peinado + colores + expresión + accesorios.
 */
export type Expression = 'neutral' | 'smile' | 'calm' | 'serious';

export interface CharacterLook {
  /** Versión del formato (3 = personaje VRM). */
  v: 3;
  /** Modelo base (rostro, cuerpo y ropa): id del catálogo o URL de un VRM propio. */
  model: string;
  /** Peinado de otro modelo del catálogo (null = el del propio modelo). */
  hair: string | null;
  /** Colores (null = el original del modelo). */
  hairColor: string | null;
  eyeColor: string | null;
  skinTone: string | null;
  outfitColor: string | null;
  expression: Expression;
  accessories: string[];
  background: string;
}

/** Estado visual del personaje. */
export type Presence = 'idle' | 'thinking' | 'listening' | 'speaking' | 'happy' | 'offline';
