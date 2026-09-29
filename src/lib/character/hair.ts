import type { Palette } from './types';

/**
 * Peinados anime por capas:
 *  - back: pelo detrás de la cabeza y del cuerpo
 *  - front: casquete + flequillo en mechones puntiagudos
 *  - locks: mechones laterales delante de la cara
 *  - extras: coletas, moños, trenza… (detrás o delante)
 */

type Pt = [number, number, 't' | 'r'];

interface HairStyle {
  /** Contorno del pelo trasero (detrás de cabeza y hombros). */
  back?: string;
  /** Parte superior del casquete (y) y medio ancho en las sienes. */
  capTop: number;
  capW: number;
  /** Altura donde el casquete termina a cada lado. */
  sideY: [number, number];
  /** Borde del flequillo, de derecha a izquierda: puntas (t) y raíces (r). */
  fringe: Pt[];
  /** Mechones laterales delante de la cara. */
  locks?: string[];
  /** Piezas extra detrás de la cabeza (coletas, moños…). */
  behind?: (p: Palette) => string;
  /** Piezas extra delante (trenza sobre el hombro, lazos…). */
  front?: (p: Palette) => string;
  /** Mechón rebelde en la coronilla. */
  ahoge?: boolean;
  /** Líneas de mechón de pinchos hacia arriba (corto masculino). */
  spikes?: string;
}

// ------------------------------------------------------------------ helpers
/** Borde del flequillo: cada tramo raíz→punta se curva como una hoja. */
function fringeEdge(points: Pt[]): string {
  let d = '';
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by, bk] = points[i];
    const dy = by - ay;
    if (bk === 't') {
      // raíz → punta: baja recto y se afila hacia la punta
      d += ` C ${ax} ${ay + dy * 0.55} ${bx + (ax - bx) * 0.15} ${by - dy * 0.3} ${bx} ${by}`;
    } else {
      // punta → raíz
      d += ` C ${ax + (bx - ax) * 0.15} ${ay + dy * 0.3} ${bx} ${by - dy * 0.55} ${bx} ${by}`;
    }
  }
  return d;
}

function frontPath(s: HairStyle): string {
  const [yL, yR] = s.sideY;
  const L = 200 - s.capW;
  const R = 200 + s.capW;
  const first = s.fringe[0];
  const last = s.fringe[s.fringe.length - 1];
  const top = s.capTop - 14;
  return [
    `M ${L} ${yL}`,
    `C ${L - 4} ${yL - 78} ${200 - s.capW * 0.62} ${top} 200 ${top}`,
    `C ${200 + s.capW * 0.62} ${top} ${R + 4} ${yR - 78} ${R} ${yR}`,
    `L ${first[0]} ${first[1]}`,
    fringeEdge(s.fringe),
    `L ${last[0]} ${last[1]} L ${L} ${yL} Z`,
  ].join(' ');
}

/** Líneas de mechón dentro del flequillo (textura). */
function strandLines(s: HairStyle, p: Palette): string {
  return s.fringe
    .filter((pt) => pt[2] === 't')
    .map(([x, y]) => {
      const sx = 200 + (x - 200) * 0.55;
      return `<path d="M ${sx} ${s.capTop + 34} Q ${x + (x - 200) * 0.12} ${(s.capTop + y) / 2 + 6} ${x} ${y - 12}" fill="none" stroke="${p.hairShade}" stroke-width="1.7" stroke-linecap="round" opacity="0.75"/>`;
    })
    .join('');
}

/** Brillo "anillo de ángel": mechones de luz siguiendo la curva de la cabeza. */
function angelRing(s: HairStyle, p: Palette): string {
  const top = s.capTop - 14;
  const L = 200 - s.capW * 0.74;
  const R = 200 + s.capW * 0.74;
  let zig = '';
  for (let i = 12; i >= 0; i--) {
    const x = L + ((R - L) * i) / 12;
    const y = top + 40 + Math.pow((x - 200) / s.capW, 2) * 44 + (i % 2 ? 7 : 0);
    zig += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  let out = `<path d="M ${L} ${top + 36 + 24} Q 200 ${top + 6} ${R} ${top + 36 + 24}${zig} Z" fill="${p.hairLight}" opacity="0.45"/>`;
  const n = 5;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = 200 - s.capW * 0.7 + t * s.capW * 1.4;
    const y = top + 24 + Math.pow((x - 200) / s.capW, 2) * 34;
    let dx = x - 200;
    let dy = y - 175;
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const l = i % 2 ? 7 : 10;
    const w = 2.6;
    const ax = x - dx * l;
    const ay = y - dy * l;
    const bx = x + dx * l;
    const by = y + dy * l;
    out += `<path d="M ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${(x - dy * w).toFixed(1)} ${(y + dx * w).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)} Q ${(x + dy * w).toFixed(1)} ${(y - dx * w).toFixed(1)} ${ax.toFixed(1)} ${ay.toFixed(1)} Z" fill="#FFFFFF" opacity="0.5"/>`;
  }
  return out;
}

/** Mechón lateral: de la sien hacia abajo, afilado en la punta. */
function lock(x: number, top: number, tipX: number, tipY: number, w: number, bulge = 10): string {
  const dir = x < 200 ? -1 : 1;
  const x2 = x - dir * w;
  return `M ${x} ${top} C ${x + dir * bulge} ${top + (tipY - top) * 0.45} ${tipX + dir * 4} ${tipY - (tipY - top) * 0.25} ${tipX} ${tipY} C ${tipX - dir * 2} ${tipY - (tipY - top) * 0.3} ${x2 + dir * 2} ${top + (tipY - top) * 0.5} ${x2} ${top + 8} Z`;
}

/** Borde inferior con puntas (pelo largo). */
function pointedBottom(x0: number, x1: number, y: number, n: number, depth = 16): string {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const yy = i % 2 === 0 ? y : y - depth;
    d += ` L ${x.toFixed(1)} ${yy}`;
  }
  return d;
}

// ------------------------------------------------------------------ flequillos
const SOFT_BANGS: Pt[] = [
  [288, 196, 't'], [266, 134, 'r'], [252, 178, 't'], [238, 132, 'r'], [222, 170, 't'],
  [208, 128, 'r'], [194, 168, 't'], [178, 130, 'r'], [160, 174, 't'], [144, 132, 'r'], [124, 192, 't'], [112, 172, 'r'],
];
const SWEPT_BANGS: Pt[] = [
  [290, 200, 't'], [270, 130, 'r'], [258, 166, 't'], [242, 118, 'r'], [214, 164, 't'],
  [204, 116, 'r'], [174, 170, 't'], [168, 122, 'r'], [138, 184, 't'], [132, 128, 'r'], [116, 196, 't'], [110, 170, 'r'],
];
const BLUNT_BANGS: Pt[] = [
  [284, 176, 't'], [270, 160, 'r'], [256, 172, 't'], [242, 160, 'r'], [228, 170, 't'], [214, 160, 'r'], [200, 170, 't'],
  [186, 160, 'r'], [172, 170, 't'], [158, 160, 'r'], [144, 172, 't'], [130, 160, 'r'], [116, 176, 't'], [112, 168, 'r'],
];
const SHORT_BANGS: Pt[] = [
  [286, 176, 't'], [270, 128, 'r'], [256, 156, 't'], [240, 120, 'r'], [226, 152, 't'],
  [210, 118, 'r'], [196, 150, 't'], [180, 120, 'r'], [164, 156, 't'], [148, 124, 'r'], [128, 170, 't'], [114, 160, 'r'],
];
const MESSY_BANGS: Pt[] = [
  [290, 206, 't'], [272, 134, 'r'], [262, 184, 't'], [246, 128, 'r'], [228, 178, 't'], [218, 124, 'r'],
  [200, 182, 't'], [186, 122, 'r'], [170, 176, 't'], [156, 128, 'r'], [140, 190, 't'], [128, 136, 'r'], [114, 204, 't'], [108, 176, 'r'],
];
const PARTED_BANGS: Pt[] = [
  [290, 198, 't'], [274, 126, 'r'], [262, 170, 't'], [244, 110, 'r'], [226, 150, 't'], [218, 104, 'r'],
  [180, 138, 't'], [172, 112, 'r'], [146, 156, 't'], [138, 120, 'r'], [118, 186, 't'], [110, 166, 'r'],
];
const SLICK_BANGS: Pt[] = [
  [290, 206, 't'], [282, 126, 'r'], [262, 112, 'r'], [236, 106, 'r'], [214, 104, 'r'], [206, 146, 't'], [196, 108, 'r'],
  [186, 136, 't'], [178, 108, 'r'], [150, 112, 'r'], [126, 124, 'r'], [110, 206, 't'], [108, 190, 'r'],
];
const PIXIE_BANGS: Pt[] = [
  [288, 184, 't'], [268, 124, 'r'], [250, 150, 't'], [236, 114, 'r'], [206, 156, 't'], [200, 116, 'r'],
  [176, 162, 't'], [170, 122, 'r'], [146, 174, 't'], [138, 130, 'r'], [120, 186, 't'], [112, 166, 'r'],
];
const WOLF_BANGS: Pt[] = [
  [292, 212, 't'], [274, 136, 'r'], [266, 190, 't'], [250, 126, 'r'], [236, 176, 't'], [224, 120, 'r'], [210, 172, 't'],
  [196, 120, 'r'], [182, 178, 't'], [166, 126, 'r'], [150, 184, 't'], [134, 132, 'r'], [118, 208, 't'], [108, 180, 'r'],
];
const CURLY_BANGS: Pt[] = [
  [288, 170, 't'], [274, 138, 'r'], [262, 158, 't'], [248, 134, 'r'], [234, 154, 't'], [218, 132, 'r'], [204, 152, 't'],
  [188, 132, 'r'], [174, 154, 't'], [158, 134, 'r'], [144, 158, 't'], [128, 138, 'r'], [114, 172, 't'], [110, 164, 'r'],
];

// ------------------------------------------------------------------ extras
const tieBand = (x: number, y: number, p: Palette, r = 8) =>
  `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.7}" fill="${p.hairDeep}"/>`;

function twinTails(p: Palette) {
  const tail = (dir: 1 | -1) => {
    const x = 200 + dir * 88;
    return `<path d="M ${x} 120 C ${x + dir * 60} 150 ${x + dir * 70} 250 ${x + dir * 44} 330 C ${x + dir * 36} 360 ${x + dir * 50} 385 ${x + dir * 30} 400 L ${x + dir * 18} 372 L ${x + dir * 8} 400 C ${x + dir * 2} 330 ${x - dir * 4} 260 ${x - dir * 8} 190 C ${x - dir * 10} 160 ${x - dir * 6} 132 ${x} 120 Z"
      fill="url(#${p.id('hairG')})" stroke="${p.hairLine}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M ${x + dir * 10} 150 C ${x + dir * 40} 200 ${x + dir * 44} 270 ${x + dir * 26} 350" fill="none" stroke="${p.hairShade}" stroke-width="2" opacity="0.7"/>
    <path d="M ${x + dir * 26} 160 C ${x + dir * 52} 210 ${x + dir * 52} 260 ${x + dir * 40} 310" fill="none" stroke="${p.hairLight}" stroke-width="3" opacity="0.5"/>`;
  };
  return tail(-1) + tail(1);
}

function twinTies() {
  const tie = (x: number) => `<g transform="translate(${x} 122)"><circle r="9" fill="#E6A0B4" stroke="#B86E86" stroke-width="2"/><circle cx="-2.5" cy="-2.5" r="2.5" fill="#FFFFFF" opacity="0.7"/></g>`;
  return tie(108) + tie(292);
}

function highPonytail(p: Palette) {
  return `<path d="M 244 70 C 320 60 346 130 330 210 C 322 260 338 310 316 360 L 304 330 L 296 372 C 290 320 300 250 288 190 C 280 150 262 110 236 96 Z"
    fill="url(#${p.id('hairG')})" stroke="${p.hairLine}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M 292 100 C 318 150 316 230 306 300" fill="none" stroke="${p.hairShade}" stroke-width="2" opacity="0.7"/>
  <path d="M 306 110 C 326 160 326 200 318 250" fill="none" stroke="${p.hairLight}" stroke-width="3" opacity="0.5"/>`;
}

function lowPonytail(p: Palette) {
  return `<path d="M 252 232 C 300 250 312 310 296 400 L 262 400 C 270 330 260 280 236 250 Z"
    fill="url(#${p.id('hairG')})" stroke="${p.hairLine}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M 268 262 C 288 300 290 340 284 390" fill="none" stroke="${p.hairShade}" stroke-width="2" opacity="0.7"/>
  ${tieBand(252, 240, p, 9)}`;
}

function buns(p: Palette) {
  const bun = (x: number) => `<circle cx="${x}" cy="74" r="30" fill="url(#${p.id('hairG')})" stroke="${p.hairLine}" stroke-width="2"/>
    <path d="M ${x - 18} 64 Q ${x} 50 ${x + 18} 66" fill="none" stroke="${p.hairLight}" stroke-width="3" opacity="0.6"/>
    <path d="M ${x - 20} 84 Q ${x} 96 ${x + 20} 82" fill="none" stroke="${p.hairShade}" stroke-width="2" opacity="0.7"/>`;
  return bun(128) + bun(272);
}

function sideBraid(p: Palette) {
  let seg = '';
  for (let i = 0; i < 6; i++) {
    const y = 236 + i * 26;
    const x = 262 + i * 4;
    seg += `<ellipse cx="${x}" cy="${y}" rx="${17 - i * 1.2}" ry="16" fill="url(#${p.id('hairG')})" stroke="${p.hairLine}" stroke-width="1.8"/>
      <path d="M ${x - 12} ${y - 4} Q ${x} ${y + 8} ${x + 12} ${y - 6}" fill="none" stroke="${p.hairShade}" stroke-width="1.8" opacity="0.8"/>`;
  }
  return `<path d="M 262 180 C 272 200 270 220 262 236" stroke="${p.hairLine}" stroke-width="2" fill="url(#${p.id('hairG')})"/>${seg}
    <path d="M 276 380 L 270 400 L 290 400 Z" fill="${p.hairShade}"/>${tieBand(283, 386, p, 7)}`;
}

// ------------------------------------------------------------------ peinados
export const HAIR_STYLES: Record<string, HairStyle> = {
  long: {
    back: `M 110 150 C 92 230 88 330 78 386${pointedBottom(78, 322, 400, 8, 14)} L 322 386 C 312 330 308 230 290 150 C 282 50 118 50 110 150 Z`,
    capTop: 58, capW: 92, sideY: [176, 176], fringe: SOFT_BANGS,
    locks: [lock(118, 146, 136, 322, 22, 12), lock(282, 146, 264, 322, 22, 12)],
    ahoge: true,
  },
  wavy: {
    back: `M 108 150 C 80 210 110 250 86 300 C 66 340 96 370 80 400 L 320 400 C 304 370 334 340 314 300 C 290 250 320 210 292 150 C 282 58 118 58 108 150 Z`,
    capTop: 58, capW: 92, sideY: [178, 172], fringe: SWEPT_BANGS,
    locks: [
      `M 116 150 C 100 200 128 230 112 262 C 100 290 124 306 118 330 C 132 306 118 284 132 258 C 146 226 124 196 136 160 Z`,
      `M 284 150 C 300 200 272 230 288 262 C 300 290 276 306 282 330 C 268 306 282 284 268 258 C 254 226 276 196 264 160 Z`,
    ],
  },
  twintails: {
    back: `M 116 150 C 110 210 124 240 134 256 L 266 256 C 276 240 290 210 284 150 C 276 62 124 62 116 150 Z`,
    capTop: 58, capW: 90, sideY: [174, 174], fringe: SOFT_BANGS,
    locks: [lock(118, 150, 130, 258, 16, 3), lock(282, 150, 270, 258, 16, 3)],
    behind: twinTails, front: twinTies, ahoge: true,
  },
  ponytail: {
    back: `M 118 150 C 112 210 126 236 140 250 L 260 250 C 274 236 288 210 282 150 C 274 62 126 62 118 150 Z`,
    capTop: 58, capW: 90, sideY: [172, 172], fringe: SWEPT_BANGS,
    locks: [lock(118, 150, 128, 250, 14, 3), lock(282, 150, 272, 244, 14, 3)],
    behind: highPonytail,
  },
  bob: {
    back: `M 106 150 C 96 210 100 250 112 270 C 150 282 250 282 288 270 C 300 250 304 210 294 150 C 284 58 116 58 106 150 Z`,
    capTop: 58, capW: 94, sideY: [184, 184], fringe: BLUNT_BANGS,
    locks: [
      `M 106 170 C 100 220 104 250 114 272 L 132 262 L 140 272 C 134 240 136 200 132 168 Z`,
      `M 294 170 C 300 220 296 250 286 272 L 268 262 L 260 272 C 266 240 264 200 268 168 Z`,
    ],
  },
  buns: {
    back: `M 116 150 C 110 212 126 240 140 252 L 260 252 C 274 240 290 212 284 150 C 276 62 124 62 116 150 Z`,
    capTop: 60, capW: 90, sideY: [172, 172], fringe: SOFT_BANGS,
    locks: [lock(118, 152, 128, 268, 14, 3), lock(282, 152, 272, 268, 14, 3)],
    behind: buns,
  },
  braid: {
    back: `M 116 150 C 110 210 124 238 138 252 L 262 252 C 276 238 290 210 284 150 C 276 62 124 62 116 150 Z`,
    capTop: 58, capW: 90, sideY: [174, 174], fringe: PARTED_BANGS,
    locks: [lock(118, 150, 130, 262, 16, 3)],
    front: sideBraid,
  },
  hime: {
    back: `M 108 150 C 98 240 96 330 92 400 L 308 400 C 304 330 302 240 292 150 C 282 58 118 58 108 150 Z`,
    capTop: 58, capW: 92, sideY: [176, 176], fringe: BLUNT_BANGS,
    locks: [
      `M 110 168 L 110 262 L 146 262 L 142 176 Z`,
      `M 290 168 L 290 262 L 254 262 L 258 176 Z`,
    ],
  },
  pixie: {
    back: `M 118 150 C 112 196 118 222 132 236 L 268 236 C 282 222 288 196 282 150 C 274 64 126 64 118 150 Z`,
    capTop: 62, capW: 88, sideY: [178, 178], fringe: PIXIE_BANGS,
    locks: [lock(118, 156, 124, 226, 12, 2), lock(282, 156, 276, 226, 12, 2)],
  },
  spiky: {
    back: `M 118 150 C 112 180 116 196 124 206 L 276 206 C 284 196 288 180 282 150 C 274 58 126 58 118 150 Z`,
    capTop: 64, capW: 88, sideY: [184, 184], fringe: SHORT_BANGS,
    spikes: `M 116 128 L 96 96 L 130 104 L 118 64 L 156 84 L 164 40 L 190 72 L 212 30 L 226 70 L 256 42 L 256 84 L 294 70 L 280 104 L 306 108 L 284 130 Z`,
  },
  messy: {
    back: `M 116 150 C 106 206 116 244 128 262 L 150 250 L 160 268 L 240 268 L 250 250 L 272 262 C 284 244 294 206 284 150 C 276 60 124 60 116 150 Z`,
    capTop: 60, capW: 90, sideY: [180, 180], fringe: MESSY_BANGS,
    ahoge: true,
  },
  sidepart: {
    back: `M 118 150 C 112 180 116 196 124 206 L 276 206 C 284 196 288 180 282 150 C 274 58 126 58 118 150 Z`,
    capTop: 62, capW: 88, sideY: [182, 182], fringe: PARTED_BANGS,
  },
  slick: {
    back: `M 118 150 C 112 180 116 196 124 206 L 276 206 C 284 196 288 180 282 150 C 274 58 126 58 118 150 Z`,
    capTop: 60, capW: 88, sideY: [176, 176], fringe: SLICK_BANGS,
  },
  wolf: {
    back: `M 112 150 C 100 210 108 256 118 290 L 134 272 L 142 300 L 158 276 L 242 276 L 258 300 L 266 272 L 282 290 C 292 256 300 210 288 150 C 280 60 120 60 112 150 Z`,
    capTop: 58, capW: 92, sideY: [182, 182], fringe: WOLF_BANGS,
  },
  curly: {
    back: `M 114 150 C 96 180 104 206 112 222 C 100 240 116 262 136 256 C 150 270 170 262 176 256 L 224 256 C 230 262 250 270 264 256 C 284 262 300 240 288 222 C 296 206 304 180 286 150 C 278 60 122 60 114 150 Z`,
    capTop: 58, capW: 92, sideY: [176, 176], fringe: CURLY_BANGS,
  },
  samurai: {
    back: `M 116 150 C 108 206 118 236 134 248 L 266 248 C 282 236 292 206 284 150 C 276 62 124 62 116 150 Z`,
    capTop: 60, capW: 90, sideY: [178, 178], fringe: PARTED_BANGS,
    locks: [lock(118, 150, 124, 290, 12, 2), lock(282, 150, 276, 290, 12, 2)],
    behind: lowPonytail,
  },
};


export function hairDefs(p: Palette): string {
  return `<linearGradient id="${p.id('hairSide')}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${p.hairDeep}" stop-opacity="0.55"/>
    <stop offset="0.28" stop-color="${p.hairDeep}" stop-opacity="0"/>
    <stop offset="0.72" stop-color="${p.hairDeep}" stop-opacity="0"/>
    <stop offset="1" stop-color="${p.hairDeep}" stop-opacity="0.55"/>
  </linearGradient>
  <linearGradient id="${p.id('hairG')}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${p.hair}"/>
    <stop offset="0.55" stop-color="${p.hair}"/>
    <stop offset="1" stop-color="${p.hairShade}"/>
  </linearGradient>`;
}

/** Capa trasera: pelo detrás de la cabeza y extras traseros. */
export function hairBack(id: string, p: Palette): string {
  const s = HAIR_STYLES[id] ?? HAIR_STYLES.long;
  const back = s.back
    ? `<path d="${s.back}" fill="${p.hairShade}" stroke="${p.hairLine}" stroke-width="2" stroke-linejoin="round"/>`
    : '';
  return `${s.behind ? s.behind(p) : ''}${back}`;
}

/** Sombra del flequillo sobre la frente (se recorta con la cara). */
export function hairShadow(id: string): string {
  const s = HAIR_STYLES[id] ?? HAIR_STYLES.long;
  return frontPath(s);
}

/** Capa delantera: flequillo, mechones laterales y extras delanteros. */
export function hairFront(id: string, p: Palette): string {
  const s = HAIR_STYLES[id] ?? HAIR_STYLES.long;
  const fill = `url(#${p.id('hairG')})`;
  const stroke = `stroke="${p.hairLine}" stroke-width="2" stroke-linejoin="round"`;
  const front = frontPath(s);
  const clip = p.id('hairclip');
  const spikes = s.spikes ? `<path d="${s.spikes}" fill="${fill}" ${stroke}/>` : '';
  const ahoge = s.ahoge
    ? `<path d="M 204 ${s.capTop + 4} C 196 ${s.capTop - 26} 220 ${s.capTop - 40} 236 ${s.capTop - 30} C 218 ${s.capTop - 30} 208 ${s.capTop - 14} 212 ${s.capTop + 6} Z" fill="${fill}" ${stroke}/>`
    : '';
  const locks = (s.locks ?? []).map((d) => `<path d="${d}" fill="${fill}" ${stroke}/>`).join('');
  return `
    ${spikes}${ahoge}
    <clipPath id="${clip}"><path d="${front}"/></clipPath>
    <path d="${front}" fill="${fill}" ${stroke}/>
    <g clip-path="url(#${clip})"><path d="${front}" fill="url(#${p.id('hairSide')})"/>${angelRing(s, p)}${strandLines(s, p)}</g>
    ${locks}
    ${s.front ? s.front(p) : ''}`;
}
