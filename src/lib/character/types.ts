/**
 * Aspecto de un personaje de Lovel House (estilo anime 2D por capas).
 * Cada campo elige una pieza real del dibujo (forma, peinado, ropa…), no solo un color.
 */
export interface CharacterLook {
  /** Versión del formato (2 = personaje 2D por capas). */
  v: 2;
  face: string;
  skin: string;
  eyes: string;
  eyeColor: string;
  brows: string;
  mouth: string;
  /** Rasgos distintivos: pecas, lunar, rubor, cicatriz… */
  marks: string[];
  hair: string;
  hairColor: string;
  outfit: string;
  /** Color principal de la ropa (null = el color propio del conjunto). */
  outfitColor: string | null;
  accessories: string[];
  background: string;
}

/** Estado animado del dibujo (parpadeo y labios al hablar). */
export interface CharacterPose {
  blink?: boolean;
  /** 0 = boca según expresión, 1 = entreabierta, 2 = abierta (al hablar). */
  talk?: 0 | 1 | 2;
}

export interface RenderOptions extends CharacterPose {
  /** bust = medio cuerpo (creador, tarjetas) · face = solo cara (fotos de perfil). */
  crop?: 'bust' | 'face';
  /** Incluir el fondo de color. */
  background?: boolean;
  /** Prefijo único para los ids del SVG (varios personajes en la misma página web). */
  uid?: string;
}

/** Paleta derivada que comparten todas las piezas. */
export interface Palette {
  skin: string;
  skinShade: string;
  skinDeep: string;
  skinLine: string;
  blush: string;
  hair: string;
  hairShade: string;
  hairDeep: string;
  hairLight: string;
  hairLine: string;
  eye: string;
  lash: string;
  outfit: string | null;
  id: (name: string) => string;
}
