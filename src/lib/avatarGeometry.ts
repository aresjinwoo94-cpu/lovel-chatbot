/**
 * Geometría del avatar 2D de Lovel House — estilo anime (tipo VTuber) con
 * sombreado plano "cel": colores planos, sombras de borde duro, brillos en el
 * pelo y en los ojos, líneas finas. Escena de fondo con cielo en degradado,
 * nubes alargadas, estrellas y siluetas en el horizonte.
 *
 * Todo se dibuja con formas vectoriales sobre un lienzo de 200x200. Este módulo
 * es puro (sin React) para usarlo en la app (react-native-svg), al exportar
 * conversaciones y en scripts que generan los iconos (scripts/render-avatar.ts).
 */
import type { AvatarAppearance, Expression, Gender, HairStyle } from './types';

export const LINE = '#2B1A1E';
export const LINE_WIDTH = 1.6;

export type Shape =
  | { kind: 'path'; d: string; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number };

export interface EyeParts {
  /** Ojo abierto (blanco, iris, pupila, brillos, pestañas). */
  open: Shape[];
  /** Ojo cerrado (una curva), para el parpadeo. */
  closed: Shape[];
}

export interface AvatarParts {
  /** Degradado del cielo (de arriba hacia abajo). */
  skyStops: { offset: number; color: string }[];
  /** Nubes, estrellas, horizonte y siluetas. */
  scene: Shape[];
  /** Pelo trasero, cuerpo, ropa, cuello, orejas y cara. */
  back: Shape[];
  /** Detalles de la cara que no se animan (rubor, nariz, sombras). */
  face: Shape[];
  brows: Shape[];
  eyes: EyeParts[];
  /** Boca estática según expresión (cuando no está hablando). */
  mouth: Shape[];
  /** Flequillo, mechones, brillos del pelo, lentes, barba. */
  front: Shape[];
}

// ---------------------------------------------------------------------------
// Paletas del creador de avatar (mismo orden que supabase/functions/_shared/palette.ts)
// ---------------------------------------------------------------------------

export const SKIN_TONES = ['#FCEAE0', '#F7D9C6', '#EFC3A4', '#D69E78', '#A8704B', '#7A4A2E'];
export const HAIR_COLORS = ['#2A1D24', '#5A3A2E', '#5A2A2E', '#D9B26F', '#B8452F', '#B9B6C2', '#15121A'];
export const EYE_COLORS = ['#6B3F2A', '#4F8A5B', '#4F78B5', '#8A6A3A', '#C2366B'];
export const OUTFIT_COLORS = ['#1E1B22', '#F4EDE4', '#E7B7B3', '#A9C0D9', '#B9CDB4', '#6B4E8C'];
/** Escenas de fondo: [cielo arriba, cielo medio, horizonte]. */
export const BACKGROUNDS: string[][] = [
  ['#2E1446', '#C8284F', '#F7923A'], // atardecer (referencia)
  ['#0E1433', '#2B2F6B', '#7A62B0'], // noche
  ['#5B4C8C', '#B58BC4', '#F4C3C8'], // lavanda
  ['#F0A7BF', '#F7CDC6', '#FCE9CF'], // amanecer rosa
  ['#5AA7E0', '#9FD0F0', '#EAF5F7'], // día
];
export const HAIR_STYLES: HairStyle[] = ['side', 'long', 'bob', 'curly', 'bun', 'short', 'buzz'];

/**
 * Avatar de referencia: chica de pelo castaño rojizo con flequillo lateral que
 * le cubre un ojo, ojos rosados, piel clara, top negro sin mangas de cuello
 * alto y fondo de atardecer. Es el que aparece en la bienvenida y por defecto.
 */
export const REFERENCE_APPEARANCE: AvatarAppearance = {
  skinTone: '#FCEAE0',
  hairColor: '#5A2A2E',
  hairStyle: 'side',
  eyeColor: '#C2366B',
  outfitColor: '#1E1B22',
  background: ['#2E1446', '#C8284F', '#F7923A'],
  glasses: false,
  freckles: false,
  beard: false,
};

/** Apariencia sugerida para cada género (el usuario puede cambiarla). */
export function defaultAppearanceFor(gender: Gender): AvatarAppearance {
  if (gender === 'male') {
    return { ...REFERENCE_APPEARANCE, hairStyle: 'short', hairColor: '#2A1D24', eyeColor: '#6B3F2A', outfitColor: '#A9C0D9', background: BACKGROUNDS[1] };
  }
  if (gender === 'other') {
    return { ...REFERENCE_APPEARANCE, hairStyle: 'bob', hairColor: '#5A3A2E', eyeColor: '#4F8A5B', outfitColor: '#6B4E8C', background: BACKGROUNDS[2] };
  }
  return { ...REFERENCE_APPEARANCE };
}

// ---------------------------------------------------------------------------
// Utilidades de color
// ---------------------------------------------------------------------------

function rgb(hex: string): [number, number, number] {
  const n = hex.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}
const toHex = (c: number[]) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Oscurece un color (amount 0..1). */
export function shade(hex: string, amount: number): string {
  return toHex(rgb(hex).map((c) => c * (1 - amount)));
}
/** Aclara un color (amount 0..1). */
export function lighten(hex: string, amount: number): string {
  return toHex(rgb(hex).map((c) => c + (255 - c) * amount));
}
/** Mezcla dos colores. */
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return toHex(x.map((c, i) => c + (y[i] - c) * t));
}
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

// ---------------------------------------------------------------------------
// Escena de fondo
// ---------------------------------------------------------------------------

function buildScene(background: string[]): { stops: AvatarParts['skyStops']; shapes: Shape[] } {
  const top = background[0];
  const horizon = background[background.length - 1];
  const middle = background.length >= 3 ? background[1] : mix(top, horizon, 0.5);
  const dark = luminance(top) < 0.45;
  const silhouette = shade(mix(top, middle, 0.3), 0.55);
  const glow = lighten(horizon, 0.35);

  const shapes: Shape[] = [
    // Nubes alargadas (bandas suaves que cruzan el cielo)
    { kind: 'path', d: 'M-10 30 C40 18 110 36 210 20 L210 27 C120 44 50 28 -10 40 Z', fill: lighten(middle, 0.2), opacity: 0.22 },
    { kind: 'path', d: 'M-10 58 C50 46 120 64 210 50 L210 56 C120 72 60 56 -10 66 Z', fill: shade(top, 0.2), opacity: 0.35 },
    { kind: 'path', d: 'M-10 88 C60 78 130 96 210 82 L210 90 C130 104 60 88 -10 98 Z', fill: lighten(middle, 0.25), opacity: 0.25 },
    { kind: 'path', d: 'M-10 118 C50 110 140 126 210 112 L210 118 C140 134 50 118 -10 126 Z', fill: shade(middle, 0.25), opacity: 0.3 },
    { kind: 'path', d: 'M-10 142 C60 136 130 150 210 138 L210 144 C130 156 60 144 -10 150 Z', fill: lighten(horizon, 0.2), opacity: 0.35 },
    // Resplandor del horizonte
    { kind: 'ellipse', cx: 100, cy: 164, rx: 150, ry: 12, fill: glow, opacity: 0.55 },
    // Suelo / agua bajo el horizonte
    { kind: 'path', d: 'M-10 166 L210 166 L210 210 L-10 210 Z', fill: mix(horizon, shade(horizon, 0.3), 0.5) },
    { kind: 'path', d: 'M-10 172 L210 172 L210 174 L-10 174 Z', fill: glow, opacity: 0.35 },
    { kind: 'path', d: 'M20 182 L80 182 L80 183.5 L20 183.5 Z', fill: glow, opacity: 0.4 },
    { kind: 'path', d: 'M120 190 L190 190 L190 191.5 L120 191.5 Z', fill: glow, opacity: 0.35 },
    // Colinas y árboles en silueta
    { kind: 'path', d: 'M-10 167 C20 158 45 160 70 166 Z', fill: silhouette },
    { kind: 'path', d: 'M130 167 C155 157 185 156 210 162 L210 167 Z', fill: silhouette },
    { kind: 'path', d: 'M172 167 L179 142 L186 167 Z', fill: silhouette },
    { kind: 'path', d: 'M184 167 L190 150 L196 167 Z', fill: silhouette },
    { kind: 'path', d: 'M160 167 L165 153 L170 167 Z', fill: silhouette },
    { kind: 'path', d: 'M8 167 L13 152 L18 167 Z', fill: silhouette },
  ];

  if (dark) {
    for (const [x, y, r] of [
      [16, 10, 1.1], [42, 22, 0.8], [70, 8, 0.9], [128, 14, 0.8], [152, 6, 1.1], [178, 20, 0.9], [192, 44, 0.7], [8, 48, 0.8], [118, 40, 0.6],
    ]) {
      shapes.push({ kind: 'circle', cx: x, cy: y, r, fill: '#FFFFFF', opacity: 0.85 });
    }
  }

  return {
    stops: [
      { offset: 0, color: top },
      { offset: 0.5, color: middle },
      { offset: 0.8, color: horizon },
      { offset: 1, color: horizon },
    ],
    shapes,
  };
}

// ---------------------------------------------------------------------------
// Pelo
// ---------------------------------------------------------------------------

/** Refleja horizontalmente un path (todas las coordenadas son pares x,y absolutos). */
function mirrorPath(d: string): string {
  let i = 0;
  return d.replace(/-?\d+(\.\d+)?/g, (n) => (i++ % 2 === 0 ? String(+(200 - parseFloat(n)).toFixed(2)) : n));
}
const mirror = (shapes: Shape[]): Shape[] =>
  shapes.map((s) =>
    s.kind === 'path' ? { ...s, d: mirrorPath(s.d) } : { ...s, cx: 200 - s.cx },
  );

const SIDE_STRANDS = {
  left: 'M63 84 C60 100 61 116 66 130 C67 116 68 102 71 90 Z',
  right: 'M137 84 C141 102 141 122 136 138 C133 124 131 108 131 94 Z',
};

/** Flequillo recto con puntas (para largo y bob). */
const JAGGED_FRINGE =
  'M63 86 C60 58 78 40 100 40 C122 40 140 58 137 86 C133 80 129 75 125 71 C123 78 119 84 114 87 C112 80 108 74 103 71 C100 78 95 84 88 87 C88 80 85 74 80 71 C76 77 70 83 63 86 Z';

function hairBack(style: HairStyle, base: string, dark: string): Shape[] {
  const s = { fill: base, stroke: LINE, strokeWidth: LINE_WIDTH };
  switch (style) {
    case 'side':
      return mirror([
        {
          kind: 'path',
          d: 'M60 90 C56 56 76 36 100 36 C124 36 144 56 140 90 C142 108 144 126 148 142 C140 147 130 144 125 136 C120 142 112 142 110 138 L90 138 C88 142 80 142 75 136 C70 144 60 147 52 142 C56 126 58 108 60 90 Z',
          ...s,
        },
        { kind: 'path', d: 'M72 112 C74 124 78 132 86 136 L114 136 C122 132 126 124 128 112 L128 137 L72 137 Z', fill: dark },
      ]);
    case 'long':
      return [
        {
          kind: 'path',
          d: 'M58 92 C52 56 74 36 100 36 C126 36 148 56 142 92 C146 124 150 156 160 182 C144 190 128 184 122 168 L78 168 C72 184 56 190 40 182 C50 156 54 124 58 92 Z',
          ...s,
        },
        { kind: 'path', d: 'M72 112 C74 130 78 150 84 166 L116 166 C122 150 126 130 128 112 L128 167 L72 167 Z', fill: dark },
      ];
    case 'bob':
      return [
        { kind: 'path', d: 'M58 94 C54 58 76 38 100 38 C124 38 146 58 142 94 C144 110 144 124 138 134 C126 138 74 138 62 134 C56 124 56 110 58 94 Z', ...s },
        { kind: 'path', d: 'M72 112 C74 122 78 130 84 134 L116 134 C122 130 126 122 128 112 L128 135 L72 135 Z', fill: dark },
      ];
    case 'curly': {
      const pts: [number, number, number][] = [
        [64, 68, 17], [80, 48, 17], [100, 41, 18], [120, 48, 17], [136, 68, 17],
        [144, 92, 15], [142, 116, 14], [58, 116, 14], [56, 92, 15], [68, 134, 12], [132, 134, 12],
      ];
      return pts.map(([cx, cy, r]) => ({ kind: 'circle' as const, cx, cy, r, ...s }));
    }
    case 'bun':
      return [
        { kind: 'circle', cx: 100, cy: 30, r: 15, ...s },
        { kind: 'path', d: 'M92 22 C96 20 104 20 108 22', stroke: lighten(base, 0.3), strokeWidth: 2 },
        { kind: 'path', d: 'M62 94 C58 60 78 42 100 42 C122 42 142 60 138 94 Z', ...s },
      ];
    case 'short':
      return [{ kind: 'path', d: 'M63 92 C58 60 78 40 100 40 C122 40 142 60 137 92 Z', ...s }];
    case 'buzz':
      return [];
  }
}

function hairFront(style: HairStyle, base: string, dark: string, hi: string, skinShadow: string): Shape[] {
  const s = { fill: base, stroke: LINE, strokeWidth: LINE_WIDTH };
  const ring = (y: number): Shape => ({
    kind: 'path',
    d: `M76 ${y + 6} C86 ${y - 1} 106 ${y - 2} 120 ${y + 3} C106 ${y + 1} 88 ${y + 3} 78 ${y + 9} Z`,
    fill: hi,
    opacity: 0.85,
  });
  switch (style) {
    case 'side':
      return mirror([
        // Sombra que el flequillo proyecta sobre la frente
        { kind: 'path', d: 'M66 86 C80 86 90 83 96 78 C98 90 103 97 110 101 C101 100 96 93 94 86 C88 90 78 91 66 90 Z', fill: skinShadow },
        // Flequillo lateral que cubre el ojo derecho
        { kind: 'path', d: 'M63 84 C60 58 78 40 100 40 C124 40 141 58 137 86 C137 101 135 113 128 123 C125 112 119 105 110 101 C103 97 98 89 96 78 C91 81 80 83 63 84 Z', ...s },
        // Sombra interior del mechón
        { kind: 'path', d: 'M110 101 C119 105 125 112 128 123 C123 115 117 109 108 106 Z', fill: dark },
        { kind: 'path', d: 'M96 78 C98 88 102 95 108 100 C101 96 97 90 95 84 Z', fill: dark, opacity: 0.7 },
        { kind: 'path', d: SIDE_STRANDS.left, ...s },
        { kind: 'path', d: SIDE_STRANDS.right, ...s },
        ring(54),
        { kind: 'path', d: 'M114 66 C121 75 126 86 128 99 C123 89 118 80 111 71 Z', fill: hi, opacity: 0.55 },
      ]);
    case 'long':
    case 'bob':
      return [
        { kind: 'path', d: 'M66 86 L134 86 L134 91 L66 91 Z', fill: skinShadow, opacity: 0.8 },
        { kind: 'path', d: JAGGED_FRINGE, ...s },
        { kind: 'path', d: SIDE_STRANDS.left, ...s },
        { kind: 'path', d: style === 'bob' ? 'M137 84 C140 100 140 114 136 126 C133 114 132 102 131 94 Z' : SIDE_STRANDS.right, ...s },
        ring(54),
      ];
    case 'curly': {
      const pts: [number, number, number][] = [[70, 66, 11], [84, 58, 11], [100, 55, 11], [116, 58, 11], [130, 66, 11]];
      return [
        ...pts.map(([cx, cy, r]) => ({ kind: 'circle' as const, cx, cy, r, ...s })),
        ...pts.map(([cx, cy]) => ({ kind: 'circle' as const, cx: cx - 3, cy: cy - 4, r: 3, fill: hi, opacity: 0.6 })),
      ];
    }
    case 'bun':
      return [
        { kind: 'path', d: 'M64 88 C62 60 80 46 100 46 C120 46 138 60 136 88 C128 72 116 64 100 64 C84 64 72 72 64 88 Z', ...s },
        ring(52),
      ];
    case 'short':
      return [
        { kind: 'path', d: 'M64 86 C62 58 80 44 100 44 C122 44 140 58 136 86 C132 74 124 66 112 64 C106 72 92 74 80 70 C74 74 68 80 64 86 Z', ...s },
        { kind: 'path', d: 'M112 64 C120 68 126 74 130 80 C124 76 118 72 110 70 Z', fill: dark, opacity: 0.7 },
        ring(52),
      ];
    case 'buzz':
      return [{ kind: 'path', d: 'M68 80 C68 60 82 48 100 48 C118 48 132 60 132 80 C124 68 114 62 100 62 C86 62 76 68 68 80 Z', ...s, opacity: 0.92 }];
  }
}

// ---------------------------------------------------------------------------
// Ojos estilo anime
// ---------------------------------------------------------------------------

function animeEye(cx: number, cy: number, dir: -1 | 1, iris: string): EyeParts {
  const eye = baseEye(cx, cy, dir, iris);
  const k = 1.15;
  const scale = (shapes: Shape[]) =>
    shapes.map((s): Shape => {
      if (s.kind === 'path') {
        let i = 0;
        const d = s.d.replace(/-?\d+(\.\d+)?/g, (n) => {
          const v = parseFloat(n);
          const c = i++ % 2 === 0 ? cx : cy;
          return String(+(c + (v - c) * k).toFixed(2));
        });
        return { ...s, d };
      }
      if (s.kind === 'ellipse') return { ...s, cx: cx + (s.cx - cx) * k, cy: cy + (s.cy - cy) * k, rx: s.rx * k, ry: s.ry * k };
      return { ...s, cx: cx + (s.cx - cx) * k, cy: cy + (s.cy - cy) * k, r: s.r * k };
    });
  return { open: scale(eye.open), closed: scale(eye.closed) };
}

function baseEye(cx: number, cy: number, dir: -1 | 1, iris: string): EyeParts {
  // dir = -1 → esquina exterior a la izquierda (ojo izquierdo en pantalla)
  const o = dir; // lado de la esquina exterior
  const outer = cx + 10 * o;
  const inner = cx - 9 * o;
  const irisDark = shade(iris, 0.45);
  const open: Shape[] = [
    // Blanco del ojo
    { kind: 'path', d: `M${inner} ${cy - 1} C${cx - 5 * o} ${cy - 9} ${cx + 6 * o} ${cy - 10} ${outer} ${cy - 3} C${cx + 7 * o} ${cy + 7} ${cx - 5 * o} ${cy + 8} ${inner} ${cy - 1} Z`, fill: '#FFFFFF' },
    // Iris con la parte superior más oscura (sombreado cel)
    { kind: 'ellipse', cx: cx + 0.5 * o, cy: cy + 0.5, rx: 5.8, ry: 7.2, fill: iris },
    { kind: 'path', d: `M${cx + 0.5 * o - 5.8} ${cy} C${cx + 0.5 * o - 5.8} ${cy - 9} ${cx + 0.5 * o + 5.8} ${cy - 9} ${cx + 0.5 * o + 5.8} ${cy} Z`, fill: irisDark, opacity: 0.75 },
    { kind: 'ellipse', cx: cx + 0.5 * o, cy: cy + 1, rx: 2.6, ry: 3.6, fill: shade(iris, 0.7) },
    // Brillo inferior del iris
    { kind: 'path', d: `M${cx + 0.5 * o - 4} ${cy + 4} C${cx} ${cy + 7} ${cx + o} ${cy + 7} ${cx + 0.5 * o + 4} ${cy + 4} C${cx + o} ${cy + 5} ${cx} ${cy + 5} ${cx + 0.5 * o - 4} ${cy + 4} Z`, fill: lighten(iris, 0.45), opacity: 0.8 },
    // Brillos
    { kind: 'circle', cx: cx - 2 * o, cy: cy - 3, r: 2.2, fill: '#FFFFFF' },
    { kind: 'circle', cx: cx + 2.5 * o, cy: cy + 3, r: 1, fill: '#FFFFFF', opacity: 0.9 },
    // Línea superior gruesa (pestañas) y pestaña exterior
    { kind: 'path', d: `M${inner - 0.5 * o} ${cy - 1} C${cx - 5 * o} ${cy - 10} ${cx + 6 * o} ${cy - 11} ${outer + o} ${cy - 3.5}`, stroke: LINE, strokeWidth: 2.4 },
    { kind: 'path', d: `M${outer - 0.5 * o} ${cy - 4} L${outer + 2 * o} ${cy - 5.5}`, stroke: LINE, strokeWidth: 1.4 },
    // Línea inferior suave
    { kind: 'path', d: `M${cx - 3 * o} ${cy + 7} C${cx + o} ${cy + 7.5} ${cx + 5 * o} ${cy + 6} ${outer - o} ${cy + 3}`, stroke: LINE, strokeWidth: 0.8, opacity: 0.35 },
  ];
  const closed: Shape[] = [
    { kind: 'path', d: `M${inner} ${cy + 1} C${cx - 4 * o} ${cy + 5} ${cx + 5 * o} ${cy + 5} ${outer} ${cy}`, stroke: LINE, strokeWidth: 2.2 },
  ];
  return { open, closed };
}

// ---------------------------------------------------------------------------
// Construcción completa del avatar
// ---------------------------------------------------------------------------

export function buildAvatarParts(a: AvatarAppearance, gender: Gender, age: number, expression: Expression): AvatarParts {
  const skinShadow = mix(shade(a.skinTone, 0.12), '#E08C9A', 0.18);
  const hairDark = shade(a.hairColor, 0.35);
  const hairHi = lighten(a.hairColor, 0.35);
  const outfitShadow = shade(a.outfitColor, 0.3);
  const lined = { stroke: LINE, strokeWidth: LINE_WIDTH };
  const scene = buildScene(a.background);

  const back: Shape[] = [...hairBack(a.hairStyle, a.hairColor, hairDark)];

  // Hombros (piel) y ropa
  if (gender === 'female') {
    back.push(
      // Hombros y brazos (piel)
      { kind: 'path', d: 'M100 146 C86 146 72 148 66 156 C60 164 58 180 57 200 L143 200 C142 180 140 164 134 156 C128 148 114 146 100 146 Z', fill: a.skinTone, ...lined },
      { kind: 'path', d: 'M71 170 C70 182 70 192 71 200', stroke: skinShadow, strokeWidth: 1.4 },
      { kind: 'path', d: 'M129 170 C130 182 130 192 129 200', stroke: skinShadow, strokeWidth: 1.4 },
      { kind: 'path', d: 'M134 158 C138 166 140 180 141 200 L136 200 C135 184 134 170 131 162 Z', fill: skinShadow, opacity: 0.6 },
      // Top sin mangas de cuello alto
      { kind: 'path', d: 'M88 146 L112 146 C116 152 122 158 126 164 C128 176 128 188 129 200 L71 200 C72 188 72 176 74 164 C78 158 84 152 88 146 Z', fill: a.outfitColor, ...lined },
      { kind: 'path', d: 'M112 152 C118 160 122 170 123 200 L129 200 C128 186 128 174 126 164 C122 158 117 154 112 150 Z', fill: outfitShadow, opacity: 0.7 },
      { kind: 'path', d: 'M92 176 C96 178 104 178 108 176', stroke: lighten(a.outfitColor, 0.12), strokeWidth: 1 },
    );
  } else {
    back.push(
      { kind: 'path', d: 'M40 200 C42 176 56 158 82 152 C90 158 110 158 118 152 C144 158 158 176 160 200 Z', fill: a.outfitColor, ...lined },
      { kind: 'path', d: 'M120 160 C134 168 144 182 147 200 L156 200 C153 180 142 166 124 156 Z', fill: outfitShadow, opacity: 0.6 },
    );
  }

  // Cuello
  back.push(
    { kind: 'path', d: 'M91 118 L91 144 L109 144 L109 118 Z', fill: a.skinTone, ...lined },
    { kind: 'path', d: 'M91 120 C96 128 104 128 109 120 L109 134 C104 137 96 137 91 134 Z', fill: skinShadow },
  );
  if (gender === 'female') {
    // Cuello alto del top
    back.push(
      { kind: 'path', d: 'M89 134 L111 134 L111 150 C104 153 96 153 89 150 Z', fill: a.outfitColor, ...lined },
      { kind: 'path', d: 'M91 140 L109 140', stroke: lighten(a.outfitColor, 0.18), strokeWidth: 1 },
      { kind: 'path', d: 'M91 145 L109 145', stroke: lighten(a.outfitColor, 0.18), strokeWidth: 1 },
    );
  } else {
    back.push({ kind: 'path', d: 'M82 152 C90 160 110 160 118 152', stroke: LINE, strokeWidth: LINE_WIDTH, fill: shade(a.outfitColor, 0.12) });
  }

  // Orejas (se ven con pelo corto)
  if (a.hairStyle === 'short' || a.hairStyle === 'buzz' || a.hairStyle === 'bun') {
    back.push(
      { kind: 'ellipse', cx: 67, cy: 94, rx: 5, ry: 7.5, fill: a.skinTone, ...lined },
      { kind: 'ellipse', cx: 133, cy: 94, rx: 5, ry: 7.5, fill: a.skinTone, ...lined },
    );
  }

  // Cara con barbilla suave en punta (anime)
  back.push({
    kind: 'path',
    d: 'M67 82 C67 58 82 44 100 44 C118 44 133 58 133 82 C133 98 129 108 121 117 C114 125 107 129 100 129 C93 129 86 125 79 117 C71 108 67 98 67 82 Z',
    fill: a.skinTone,
    ...lined,
  });

  const face: Shape[] = [
    // Rubor
    { kind: 'ellipse', cx: 81, cy: 105, rx: 6.5, ry: 2.6, fill: '#F2929E', opacity: expression === 'smile' ? 0.55 : 0.38 },
    { kind: 'ellipse', cx: 119, cy: 105, rx: 6.5, ry: 2.6, fill: '#F2929E', opacity: expression === 'smile' ? 0.55 : 0.38 },
    // Nariz: un trazo corto
    { kind: 'path', d: 'M100.5 102 L99.3 106', stroke: shade(skinShadow, 0.2), strokeWidth: 1.3 },
  ];
  if (a.freckles) {
    for (const [x, y] of [[76, 101], [80, 103], [84, 100], [116, 100], [120, 103], [124, 101]]) {
      face.push({ kind: 'circle', cx: x, cy: y, r: 0.75, fill: shade(a.skinTone, 0.4) });
    }
  }
  if (age >= 40) {
    face.push({ kind: 'path', d: 'M79 103 C82 104.5 86 104.5 89 103', stroke: skinShadow, strokeWidth: 1.1 });
    face.push({ kind: 'path', d: 'M111 103 C114 104.5 118 104.5 121 103', stroke: skinShadow, strokeWidth: 1.1 });
  }
  if (age >= 52) {
    face.push({ kind: 'path', d: 'M91 109 C89 112 89 115 91 117', stroke: skinShadow, strokeWidth: 1.1 });
    face.push({ kind: 'path', d: 'M109 109 C111 112 111 115 109 117', stroke: skinShadow, strokeWidth: 1.1 });
  }

  // Cejas finas (quedan detrás del flequillo cuando lo hay)
  const browColor = shade(a.hairColor, 0.2);
  const browW = gender === 'male' ? 2.2 : 1.5;
  const brows: Shape[] =
    expression === 'thinking'
      ? [
          { kind: 'path', d: 'M77 81 C81 79.5 87 79.5 91 81', stroke: browColor, strokeWidth: browW },
          { kind: 'path', d: 'M109 77 C113 74 119 74 123 77', stroke: browColor, strokeWidth: browW },
        ]
      : [
          { kind: 'path', d: 'M77 80 C81 78 87 78 91 79.5', stroke: browColor, strokeWidth: browW },
          { kind: 'path', d: 'M109 79.5 C113 78 119 78 123 80', stroke: browColor, strokeWidth: browW },
        ];

  const eyes = [animeEye(85, 93, -1, a.eyeColor), animeEye(115, 93, 1, a.eyeColor)];

  // Boca
  let mouth: Shape[];
  switch (expression) {
    case 'smile':
      mouth = [
        { kind: 'path', d: 'M95.5 112.5 C97.5 118 102.5 118 104.5 112.5 C101.5 113.5 98.5 113.5 95.5 112.5 Z', fill: '#7E2F3C', stroke: LINE, strokeWidth: 0.8 },
        { kind: 'path', d: 'M97.4 115.6 C98.9 117 101.1 117 102.6 115.6 C101.1 114.9 98.9 114.9 97.4 115.6 Z', fill: '#E7808F' },
      ];
      break;
    case 'thinking':
      mouth = [{ kind: 'path', d: 'M97 115 C99.5 114 102 114.4 104.5 113.2', stroke: LINE, strokeWidth: 1.3 }];
      break;
    default:
      mouth = [{ kind: 'path', d: 'M96 113.5 C98.5 115.2 101.5 115.2 104 113.5', stroke: LINE, strokeWidth: 1.3 }];
  }

  const front: Shape[] = [...hairFront(a.hairStyle, a.hairColor, hairDark, hairHi, skinShadow)];

  if (a.beard) {
    front.push({
      kind: 'path',
      d: 'M70 100 C72 118 84 131 100 131 C116 131 128 118 130 100 C125 112 118 119 109 121 C105 118 95 118 91 121 C82 119 75 112 70 100 Z',
      fill: a.hairColor,
      stroke: LINE,
      strokeWidth: 1.2,
      opacity: 0.95,
    });
  }
  if (a.glasses) {
    front.push({ kind: 'circle', cx: 85, cy: 93, r: 11.5, stroke: LINE, strokeWidth: 1.6, fill: 'rgba(255,255,255,0.10)' });
    front.push({ kind: 'circle', cx: 115, cy: 93, r: 11.5, stroke: LINE, strokeWidth: 1.6, fill: 'rgba(255,255,255,0.10)' });
    front.push({ kind: 'path', d: 'M96.5 92 C98.5 90.5 101.5 90.5 103.5 92', stroke: LINE, strokeWidth: 1.6 });
  }

  return { skyStops: scene.stops, scene: scene.shapes, back, face, brows, eyes, mouth, front };
}

/** Boca abierta al hablar (la altura ry se anima en la app). */
export const TALKING_MOUTH = { cx: 100, cy: 114.2, rx: 4, ryMin: 0.9, ryMax: 4, fill: '#7E2F3C' };

/**
 * SVG estático (string). Se usa para exportar la conversación (retrato
 * incrustado) y para generar los iconos PNG.
 */
export function avatarToSvgString(
  a: AvatarAppearance,
  gender: Gender,
  age: number,
  expression: Expression = 'smile',
  size = 200,
  layers: 'all' | 'character' | 'scene' = 'all',
): string {
  const p = buildAvatarParts(a, gender, age, expression);
  const gid = `sky-${p.skyStops.map((s) => s.color.slice(1)).join('')}`;
  const el = (s: Shape) => {
    const common = `fill="${s.fill ?? 'none'}" stroke="${s.stroke ?? 'none'}" stroke-width="${s.strokeWidth ?? 0}" stroke-linecap="round" stroke-linejoin="round"${s.opacity !== undefined ? ` opacity="${s.opacity}"` : ''}`;
    if (s.kind === 'path') return `<path d="${s.d}" ${common}/>`;
    if (s.kind === 'ellipse') return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" ${common}/>`;
    return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" ${common}/>`;
  };
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200">`,
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">${p.skyStops.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('')}</linearGradient></defs>`,
    ...(layers !== 'character' ? [`<rect width="200" height="200" fill="url(#${gid})"/>`, ...p.scene.map(el)] : []),
    ...(layers !== 'scene'
      ? [...p.back, ...p.face, ...p.brows, ...p.eyes.flatMap((e) => e.open), ...p.mouth, ...p.front].map(el)
      : []),
    `</svg>`,
  ].join('');
}
