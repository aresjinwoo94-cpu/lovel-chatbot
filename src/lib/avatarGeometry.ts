/**
 * Geometría del avatar 2D "dibujado a mano".
 *
 * Todo el avatar se construye con formas vectoriales simples (paths, elipses,
 * círculos) sobre un lienzo de 200x200, con líneas limpias color tinta, fondo
 * en degradado y expresión suave. Este módulo es puro (sin React) para poder
 * usarlo tanto en la app (react-native-svg) como en scripts que generan
 * los iconos PNG (scripts/render-avatar.ts).
 */
import type { AvatarAppearance, Expression, Gender, HairStyle } from './types';

export const LINE = '#3A3033';
export const LINE_WIDTH = 2.2;

export type Shape =
  | { kind: 'path'; d: string; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number };

export interface AvatarParts {
  /** Capas detrás de la cara (pelo largo, cuerpo, cuello, orejas). */
  back: Shape[];
  /** La cara (piel) y todo lo que va encima y no se anima. */
  face: Shape[];
  /** Cejas (cambian con la expresión). */
  brows: Shape[];
  /** Ojos: centro y tamaño; se animan (parpadeo). */
  eyes: { left: { cx: number; cy: number }; right: { cx: number; cy: number }; rx: number; ry: number; color: string };
  /** Pestañas / detalles alrededor de los ojos. */
  eyeDetails: Shape[];
  /** Boca estática según expresión (cuando no está hablando). */
  mouth: Shape[];
  /** Capas delante de la cara (flequillo, lentes, barba). */
  front: Shape[];
}

// ---------------------------------------------------------------------------
// Paletas que se ofrecen en el creador de avatar (selects visuales)
// ---------------------------------------------------------------------------

export const SKIN_TONES = ['#FBE3D3', '#F5D0B5', '#E8B894', '#C98E66', '#A86B45', '#7A4A2E'];
export const HAIR_COLORS = ['#3B2A25', '#6B4431', '#A56B43', '#D9B26F', '#B8452F', '#9A9A9A', '#1E1B1D'];
export const EYE_COLORS = ['#3B2A25', '#5B7F5A', '#4F6F95', '#7A5A3A'];
export const OUTFIT_COLORS = ['#F4EDE4', '#E7B7B3', '#A9C0D9', '#B9CDB4', '#2E2A2B', '#E9D29B'];
export const BACKGROUNDS: [string, string][] = [
  ['#FBD9CF', '#E4D3F2'],
  ['#FCE7C8', '#F6C7C7'],
  ['#D6EBF2', '#E8DDF5'],
  ['#DDEEDB', '#F7E6D0'],
  ['#F3D6E3', '#F9EFD9'],
];
export const HAIR_STYLES: HairStyle[] = ['long', 'bob', 'curly', 'bun', 'short', 'buzz'];

/**
 * Avatar de referencia: la chica 2D del diseño original (pelo castaño largo con
 * raya al lado, mejillas sonrosadas, suéter crema y fondo durazno→lavanda).
 * Es el que se precarga en el onboarding y el primer avatar por defecto.
 */
export const REFERENCE_APPEARANCE: AvatarAppearance = {
  skinTone: '#F5D0B5',
  hairColor: '#6B4431',
  hairStyle: 'long',
  eyeColor: '#3B2A25',
  outfitColor: '#F4EDE4',
  background: ['#FBD9CF', '#E4D3F2'],
  glasses: false,
  freckles: false,
  beard: false,
};

/** Apariencia por defecto sugerida para cada género (el usuario puede cambiarla). */
export function defaultAppearanceFor(gender: Gender): AvatarAppearance {
  if (gender === 'male') {
    return { ...REFERENCE_APPEARANCE, hairStyle: 'short', hairColor: '#3B2A25', outfitColor: '#A9C0D9', background: ['#D6EBF2', '#E8DDF5'] };
  }
  if (gender === 'other') {
    return { ...REFERENCE_APPEARANCE, hairStyle: 'bob', hairColor: '#A56B43', outfitColor: '#B9CDB4', background: ['#DDEEDB', '#F7E6D0'] };
  }
  return { ...REFERENCE_APPEARANCE };
}

// ---------------------------------------------------------------------------
// Utilidades de color
// ---------------------------------------------------------------------------

/** Oscurece un color hex (amount 0..1). Se usa para sombras suaves. */
export function shade(hex: string, amount: number): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 - amount))));
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

// ---------------------------------------------------------------------------
// Pelo: parte trasera (detrás de la cabeza) y delantera (flequillo)
// ---------------------------------------------------------------------------

function hairBack(style: HairStyle, color: string): Shape[] {
  const s = { fill: color, stroke: LINE, strokeWidth: LINE_WIDTH };
  switch (style) {
    case 'long':
      return [
        {
          kind: 'path',
          d: 'M54 98 C46 58 70 36 100 36 C130 36 154 58 146 98 C150 128 152 156 162 180 C146 190 128 184 120 166 L80 166 C72 184 54 190 38 180 C48 156 50 128 54 98 Z',
          ...s,
        },
      ];
    case 'bob':
      return [
        {
          kind: 'path',
          d: 'M52 100 C46 60 70 38 100 38 C130 38 154 60 148 100 C150 118 150 132 142 142 C128 146 72 146 58 142 C50 132 50 118 52 100 Z',
          ...s,
        },
      ];
    case 'curly': {
      // Nube de rizos: círculos alrededor de la cabeza.
      const pts: [number, number, number][] = [
        [62, 70, 18], [78, 50, 18], [100, 42, 19], [122, 50, 18], [138, 70, 18],
        [146, 94, 16], [144, 118, 15], [56, 118, 15], [54, 94, 16], [66, 136, 13], [134, 136, 13],
      ];
      return pts.map(([cx, cy, r]) => ({ kind: 'circle' as const, cx, cy, r, ...s }));
    }
    case 'bun':
      return [
        { kind: 'circle', cx: 100, cy: 34, r: 17, ...s },
        { kind: 'path', d: 'M58 96 C54 62 74 44 100 44 C126 44 146 62 142 96 Z', ...s },
      ];
    case 'short':
      return [{ kind: 'path', d: 'M58 96 C52 62 74 42 100 42 C126 42 148 62 142 96 Z', ...s }];
    case 'buzz':
      return [];
  }
}

function hairFront(style: HairStyle, color: string): Shape[] {
  const s = { fill: color, stroke: LINE, strokeWidth: LINE_WIDTH };
  switch (style) {
    case 'long':
      return [
        // Flequillo con raya al lado, cayendo hacia la izquierda.
        { kind: 'path', d: 'M57 94 C54 60 76 42 102 42 C128 42 146 60 143 92 C136 76 124 64 108 60 C98 76 80 86 57 94 Z', ...s },
        // Mechones que enmarcan la cara.
        { kind: 'path', d: 'M58 90 C54 112 56 132 64 148 C66 128 64 108 66 94 Z', ...s },
        { kind: 'path', d: 'M142 88 C146 110 144 132 136 148 C134 128 136 108 134 94 Z', ...s },
      ];
    case 'bob':
      return [
        { kind: 'path', d: 'M56 96 C52 60 76 42 100 42 C124 42 148 60 144 96 C136 80 128 70 118 66 C110 76 90 78 76 70 C68 78 62 86 56 96 Z', ...s },
        { kind: 'path', d: 'M56 94 C52 112 54 128 60 140 C62 124 62 108 64 98 Z', ...s },
        { kind: 'path', d: 'M144 94 C148 112 146 128 140 140 C138 124 138 108 136 98 Z', ...s },
      ];
    case 'curly': {
      const pts: [number, number, number][] = [[70, 66, 11], [84, 58, 11], [100, 55, 11], [116, 58, 11], [130, 66, 11]];
      return pts.map(([cx, cy, r]) => ({ kind: 'circle' as const, cx, cy, r, ...s }));
    }
    case 'bun':
      return [{ kind: 'path', d: 'M59 90 C58 60 78 46 100 46 C122 46 142 60 141 90 C132 72 118 62 100 62 C82 62 68 72 59 90 Z', ...s }];
    case 'short':
      return [{ kind: 'path', d: 'M59 88 C56 58 78 44 100 44 C124 44 144 58 141 88 C134 72 122 64 108 62 C100 70 84 72 72 68 C66 74 62 80 59 88 Z', ...s }];
    case 'buzz':
      return [{ kind: 'path', d: 'M61 84 C62 60 80 48 100 48 C120 48 138 60 139 84 C128 70 116 64 100 64 C84 64 72 70 61 84 Z', ...s, opacity: 0.9 }];
  }
}

// ---------------------------------------------------------------------------
// Construcción completa del avatar
// ---------------------------------------------------------------------------

export function buildAvatarParts(a: AvatarAppearance, gender: Gender, age: number, expression: Expression): AvatarParts {
  const skinShadow = shade(a.skinTone, 0.12);
  const outfitShadow = shade(a.outfitColor, 0.1);
  const lined = { stroke: LINE, strokeWidth: LINE_WIDTH };

  const shoulders =
    gender === 'male'
      ? 'M30 200 C32 170 58 156 86 152 C92 160 108 160 114 152 C142 156 168 170 170 200 Z'
      : 'M40 200 C42 172 62 158 88 152 C94 160 106 160 112 152 C138 158 158 172 160 200 Z';

  const back: Shape[] = [
    ...hairBack(a.hairStyle, a.hairColor),
    // Cuello
    { kind: 'path', d: 'M88 130 L88 152 C92 158 108 158 112 152 L112 130 Z', fill: a.skinTone, ...lined },
    { kind: 'path', d: 'M88 138 C96 144 104 144 112 138 L112 132 L88 132 Z', fill: skinShadow, opacity: 0.6 },
    // Ropa (suéter / camiseta)
    { kind: 'path', d: shoulders, fill: a.outfitColor, ...lined },
    { kind: 'path', d: 'M86 152 C92 162 108 162 114 152', stroke: LINE, strokeWidth: LINE_WIDTH, fill: outfitShadow },
    // Orejas
    { kind: 'ellipse', cx: 60, cy: 100, rx: 6, ry: 9, fill: a.skinTone, ...lined },
    { kind: 'ellipse', cx: 140, cy: 100, rx: 6, ry: 9, fill: a.skinTone, ...lined },
  ];

  const face: Shape[] = [
    // Cara con mandíbula suave
    { kind: 'path', d: 'M60 94 C60 64 78 50 100 50 C122 50 140 64 140 94 C140 120 124 140 100 140 C76 140 60 120 60 94 Z', fill: a.skinTone, ...lined },
    // Nariz: un solo trazo
    { kind: 'path', d: 'M100 104 C98 110 99 113 102 113', stroke: LINE, strokeWidth: 1.8 },
    // Rubor en mejillas
    { kind: 'ellipse', cx: 76, cy: 114, rx: 7.5, ry: 4, fill: '#E88E93', opacity: expression === 'smile' ? 0.5 : 0.32 },
    { kind: 'ellipse', cx: 124, cy: 114, rx: 7.5, ry: 4, fill: '#E88E93', opacity: expression === 'smile' ? 0.5 : 0.32 },
  ];

  if (a.freckles) {
    for (const [x, y] of [[72, 108], [77, 111], [81, 107], [119, 107], [123, 111], [128, 108]]) {
      face.push({ kind: 'circle', cx: x, cy: y, r: 0.9, fill: shade(a.skinTone, 0.45) });
    }
  }

  // Líneas de expresión según la edad (sutiles, nunca realistas).
  if (age >= 40) {
    face.push({ kind: 'path', d: 'M79 106 C82 107.5 86 107.5 89 106', stroke: skinShadow, strokeWidth: 1.4 });
    face.push({ kind: 'path', d: 'M111 106 C114 107.5 118 107.5 121 106', stroke: skinShadow, strokeWidth: 1.4 });
  }
  if (age >= 52) {
    face.push({ kind: 'path', d: 'M91 114 C88 118 88 121 90 124', stroke: skinShadow, strokeWidth: 1.4 });
    face.push({ kind: 'path', d: 'M109 114 C112 118 112 121 110 124', stroke: skinShadow, strokeWidth: 1.4 });
  }

  // Cejas
  const browW = gender === 'male' ? 3 : 2.2;
  const browColor = shade(a.hairColor, 0.15);
  const brows: Shape[] =
    expression === 'thinking'
      ? [
          { kind: 'path', d: 'M76 87 C80 85 86 85 90 87', stroke: browColor, strokeWidth: browW },
          { kind: 'path', d: 'M110 82 C114 78 120 78 124 81', stroke: browColor, strokeWidth: browW },
        ]
      : [
          { kind: 'path', d: 'M76 86 C80 83 86 83 90 85', stroke: browColor, strokeWidth: browW },
          { kind: 'path', d: 'M110 85 C114 83 120 83 124 86', stroke: browColor, strokeWidth: browW },
        ];

  const eyeDetails: Shape[] =
    gender === 'female'
      ? [
          { kind: 'path', d: 'M79.5 94.5 L76 91.5', stroke: LINE, strokeWidth: 1.8 },
          { kind: 'path', d: 'M120.5 94.5 L124 91.5', stroke: LINE, strokeWidth: 1.8 },
        ]
      : [];

  // Boca según expresión
  let mouth: Shape[];
  switch (expression) {
    case 'smile':
      mouth = [{ kind: 'path', d: 'M90 119 C94 129 106 129 110 119 C104 121 96 121 90 119 Z', fill: '#B85C66', stroke: LINE, strokeWidth: 2 }];
      break;
    case 'thinking':
      mouth = [{ kind: 'path', d: 'M94 124 C98 122 102 123 107 120', stroke: LINE, strokeWidth: 2 }];
      break;
    default:
      mouth = [{ kind: 'path', d: 'M93 121 C97 125 103 125 107 121', stroke: LINE, strokeWidth: 2 }];
  }

  const front: Shape[] = [...hairFront(a.hairStyle, a.hairColor)];

  if (a.beard) {
    front.push({
      kind: 'path',
      d: 'M62 104 C64 128 80 146 100 146 C120 146 136 128 138 104 C132 118 124 128 112 130 C106 126 94 126 88 130 C76 128 68 118 62 104 Z',
      fill: a.hairColor,
      stroke: LINE,
      strokeWidth: 1.6,
      opacity: 0.92,
    });
  }

  if (a.glasses) {
    front.push({ kind: 'circle', cx: 84, cy: 98, r: 11, stroke: LINE, strokeWidth: 2, fill: 'rgba(255,255,255,0.12)' });
    front.push({ kind: 'circle', cx: 116, cy: 98, r: 11, stroke: LINE, strokeWidth: 2, fill: 'rgba(255,255,255,0.12)' });
    front.push({ kind: 'path', d: 'M95 97 C98 95 102 95 105 97', stroke: LINE, strokeWidth: 2 });
  }

  return {
    back,
    face,
    brows,
    eyes: { left: { cx: 84, cy: 98 }, right: { cx: 116, cy: 98 }, rx: 4.6, ry: 5.6, color: a.eyeColor },
    eyeDetails,
    mouth,
    front,
  };
}

/** Boca abierta al hablar (la altura ry se anima en la app). */
export const TALKING_MOUTH = { cx: 100, cy: 122, rx: 6.5, ryMin: 1.2, ryMax: 6, fill: '#9E4A55' };

/**
 * Genera un SVG estático (string). Se usa para exportar la conversación
 * (el retrato del avatar va incrustado) y para generar los iconos PNG.
 */
export function avatarToSvgString(a: AvatarAppearance, gender: Gender, age: number, expression: Expression = 'smile', size = 200): string {
  const p = buildAvatarParts(a, gender, age, expression);
  const attrs = (s: Shape) => {
    const common = `fill="${s.fill ?? 'none'}" stroke="${s.stroke ?? 'none'}" stroke-width="${s.strokeWidth ?? 0}" stroke-linecap="round" stroke-linejoin="round"${s.opacity !== undefined ? ` opacity="${s.opacity}"` : ''}`;
    if (s.kind === 'path') return `<path d="${s.d}" ${common}/>`;
    if (s.kind === 'ellipse') return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" ${common}/>`;
    return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" ${common}/>`;
  };
  const eye = (cx: number, cy: number) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${p.eyes.rx}" ry="${p.eyes.ry}" fill="${p.eyes.color}" stroke="${LINE}" stroke-width="1.2"/><circle cx="${cx + 1.6}" cy="${cy - 2}" r="1.6" fill="#fff"/>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200">`,
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a.background[0]}"/><stop offset="1" stop-color="${a.background[1]}"/></linearGradient></defs>`,
    `<rect width="200" height="200" fill="url(#bg)"/>`,
    ...p.back.map(attrs),
    ...p.face.map(attrs),
    ...p.brows.map(attrs),
    eye(p.eyes.left.cx, p.eyes.left.cy),
    eye(p.eyes.right.cx, p.eyes.right.cy),
    ...p.eyeDetails.map(attrs),
    ...p.mouth.map(attrs),
    ...p.front.map(attrs),
    `</svg>`,
  ].join('');
}
