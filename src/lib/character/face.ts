import type { Palette } from './types';

/**
 * Cara: formas de rostro, orejas, cuello, cejas, nariz, boca y rasgos distintivos.
 * Lienzo 400×400. Centro de la cara en x=200; ojos a la altura y≈190.
 */

interface FaceShape {
  /** Medio ancho en sienes, mejillas y mandíbula. */
  tw: number;
  cw: number;
  jw: number;
  /** Medio ancho de la barbilla (pequeño = en V) y su altura. */
  chinW: number;
  chinY: number;
  /** Mandíbula con ángulos marcados en lugar de curva. */
  angular?: boolean;
}

export const FACE_SHAPES: Record<string, FaceShape> = {
  oval: { tw: 74, cw: 71, jw: 50, chinW: 13, chinY: 262 },
  round: { tw: 77, cw: 77, jw: 62, chinW: 24, chinY: 257 },
  heart: { tw: 79, cw: 73, jw: 42, chinW: 7, chinY: 263 },
  vshape: { tw: 75, cw: 70, jw: 38, chinW: 4, chinY: 268 },
  square: { tw: 76, cw: 76, jw: 64, chinW: 22, chinY: 262, angular: true },
  long: { tw: 70, cw: 67, jw: 48, chinW: 13, chinY: 274 },
  diamond: { tw: 67, cw: 77, jw: 46, chinW: 9, chinY: 266 },
  baby: { tw: 79, cw: 79, jw: 60, chinW: 30, chinY: 253 },
  jaw: { tw: 76, cw: 75, jw: 62, chinW: 16, chinY: 270, angular: true },
  slim: { tw: 70, cw: 65, jw: 40, chinW: 8, chinY: 267 },
};

export function facePath(id: string): string {
  const f = FACE_SHAPES[id] ?? FACE_SHAPES.oval;
  const L = (d: number) => 200 - d;
  const R = (d: number) => 200 + d;
  const jawR = f.angular
    ? `L ${R(f.cw) - 2} 226 L ${R(f.jw)} 244 L ${R(f.chinW)} ${f.chinY - 3}`
    : `C ${R(f.cw)} 224 ${R(f.jw)} 238 ${R(f.chinW)} ${f.chinY - 5}`;
  const jawL = f.angular
    ? `L ${L(f.jw)} 244 L ${L(f.cw) + 2} 226 L ${L(f.cw)} 204`
    : `C ${L(f.jw)} 238 ${L(f.cw)} 224 ${L(f.cw)} 204`;
  return [
    `M ${L(f.tw)} 138`,
    `C ${L(f.tw)} 52 ${R(f.tw)} 52 ${R(f.tw)} 138`,
    `C ${R(f.tw)} 168 ${R(f.cw)} 182 ${R(f.cw)} 204`,
    jawR,
    `Q 200 ${f.chinY + 3} ${L(f.chinW)} ${f.chinY - (f.angular ? 3 : 5)}`,
    jawL,
    `C ${L(f.cw)} 182 ${L(f.tw)} 168 ${L(f.tw)} 138 Z`,
  ].join(' ');
}

export function faceWidthAt(id: string) {
  const f = FACE_SHAPES[id] ?? FACE_SHAPES.oval;
  return f.cw;
}

/** Cuello y hombros (piel); la ropa se dibuja encima. */
export function body(faceId: string, p: Palette): string {
  const neck = 'M 184 222 L 216 222 Q 217 280 224 304 Q 200 314 176 304 Q 183 280 184 222 Z';
  return `
  <clipPath id="${p.id('neck')}"><path d="${neck}"/></clipPath>
  <path d="M 44 400 C 50 338 104 312 172 300 L 228 300 C 296 312 350 338 356 400 Z" fill="${p.skin}"/>
  <path d="${neck}" fill="${p.skin}"/>
  <g clip-path="url(#${p.id('neck')})">
    <path d="${facePath(faceId)}" fill="${p.skinShade}" transform="translate(0 13)"/>
    <path d="M 170 292 Q 200 306 230 292 L 230 320 L 170 320 Z" fill="${p.skinShade}" opacity="0.5"/>
  </g>`;
}

export function ears(faceId: string, p: Palette): string {
  const cw = faceWidthAt(faceId);
  const ear = (dir: 1 | -1) => {
    const x = 200 + dir * (cw - 3);
    return `<path d="M ${x} 186 C ${x + dir * 15} 176 ${x + dir * 19} 204 ${x + dir * 2} 218 Z" fill="${p.skin}" stroke="${p.skinLine}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M ${x + dir * 2} 192 C ${x + dir * 10} 188 ${x + dir * 11} 202 ${x + dir * 3} 208" fill="none" stroke="${p.skinShade}" stroke-width="2.4" stroke-linecap="round"/>`;
  };
  return ear(-1) + ear(1);
}

// --------------------------------------------------------------------- cejas
/** Ceja izquierda en coordenadas locales (x negativo = extremo exterior). */
export const BROWS: Record<string, string> = {
  soft: 'M -19 5 Q -3 -6 16 -1 Q 17 1 15 2 Q -3 -2 -19 5 Z',
  straight: 'M -19 2 Q 0 -2 17 -2 L 17 2 Q 0 2 -19 5 Z',
  arched: 'M -20 7 Q -8 -11 16 -2 Q 17 1 15 1 Q -6 -5 -20 7 Z',
  thick: 'M -19 3 Q -2 -9 18 -3 L 18 3 Q -2 -2 -19 8 Z',
  worried: 'M -19 3 Q 0 2 16 -9 Q 18 -7 16 -4 Q 0 6 -19 6 Z',
  fierce: 'M -19 -7 Q 0 -4 17 4 L 16 8 Q 0 1 -19 -3 Z',
  thin: 'M -18 3 Q -2 -4 16 -1 Q -2 -2 -18 4 Z',
  flat: 'M -18 0 L 16 0 Q 18 2 16 4 L -18 4 Q -20 2 -18 0 Z',
};

export function brows(id: string, p: Palette): string {
  const d = BROWS[id] ?? BROWS.soft;
  return `<g fill="${p.hairLine}">
    <path d="${d}" transform="translate(165 156)"/>
    <path d="${d}" transform="translate(235 156) scale(-1 1)"/>
  </g>`;
}

export function nose(p: Palette): string {
  return `<path d="M 201 210 Q 198 218 195 221 Q 199 222 202 220" fill="none" stroke="${p.skinLine}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
  <ellipse cx="204" cy="212" rx="1.6" ry="3" fill="#FFFFFF" opacity="0.55"/>`;
}

// --------------------------------------------------------------------- boca
const LIP = '#9C4455';
const MOUTH_IN = '#7E2E43';
const TONGUE = '#E98A99';

function openMouth(w: number, h: number, teeth = true) {
  return `<path d="M ${-w} -2 Q 0 1 ${w} -2 Q ${w * 0.7} ${h} 0 ${h} Q ${-w * 0.7} ${h} ${-w} -2 Z" fill="${MOUTH_IN}"/>
  <ellipse cx="0" cy="${h * 0.72}" rx="${w * 0.55}" ry="${h * 0.3}" fill="${TONGUE}"/>
  ${teeth ? `<path d="M ${-w * 0.8} -1.5 Q 0 1 ${w * 0.8} -1.5 L ${w * 0.7} 2 Q 0 3.5 ${-w * 0.7} 2 Z" fill="#FFFFFF"/>` : ''}
  <path d="M ${-w} -2 Q 0 1 ${w} -2" fill="none" stroke="${LIP}" stroke-width="1.6" stroke-linecap="round"/>`;
}

export const MOUTHS: Record<string, string> = {
  smile: `<path d="M -10 -1 Q 0 7 10 -1" fill="none" stroke="${LIP}" stroke-width="2.3" stroke-linecap="round"/>`,
  grin: openMouth(12, 11),
  smirk: `<path d="M -9 2 Q 3 4 11 -5" fill="none" stroke="${LIP}" stroke-width="2.3" stroke-linecap="round"/><path d="M 11 -5 L 13 -3" stroke="${LIP}" stroke-width="1.6" stroke-linecap="round"/>`,
  cat: `<path d="M -10 -2 Q -5 5 0 0 Q 5 5 10 -2" fill="none" stroke="${LIP}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  neutral: `<path d="M -7 1 Q 0 2.5 7 1" fill="none" stroke="${LIP}" stroke-width="2.2" stroke-linecap="round"/>`,
  surprised: `<ellipse cx="0" cy="3" rx="5" ry="6.5" fill="${MOUTH_IN}"/><ellipse cx="0" cy="6" rx="3.2" ry="2.4" fill="${TONGUE}"/>`,
  fang: `<path d="M -10 -1 Q 0 7 10 -1" fill="none" stroke="${LIP}" stroke-width="2.3" stroke-linecap="round"/><path d="M 3.5 3.2 L 7.5 1.4 L 6.2 7 Z" fill="#FFFFFF" stroke="${LIP}" stroke-width="1" stroke-linejoin="round"/>`,
  pout: `<path d="M -6 3 Q 0 -3 6 3" fill="none" stroke="${LIP}" stroke-width="2.2" stroke-linecap="round"/><path d="M -3 6.5 Q 0 8 3 6.5" fill="none" stroke="${LIP}" stroke-width="1.4" stroke-linecap="round" opacity="0.6"/>`,
  laugh: openMouth(13, 15),
  shy: `<path d="M -6 0 Q 0 4 6 0" fill="none" stroke="${LIP}" stroke-width="2.2" stroke-linecap="round"/>`,
};

export function mouth(id: string, talk: 0 | 1 | 2 = 0): string {
  let inner = MOUTHS[id] ?? MOUTHS.smile;
  if (talk === 1) inner = `<ellipse cx="0" cy="2" rx="6" ry="3.6" fill="${MOUTH_IN}"/><ellipse cx="0" cy="3.6" rx="3.4" ry="1.5" fill="${TONGUE}"/>`;
  if (talk === 2) inner = openMouth(9, 11, false);
  return `<g transform="translate(200 238)">${inner}</g>`;
}

// --------------------------------------------------------------------- rasgos
export function marksUnder(marks: string[], p: Palette): string {
  let out = '';
  if (marks.includes('blush')) {
    out += `<ellipse cx="156" cy="217" rx="17" ry="8" fill="url(#${p.id('blush')})"/>
    <ellipse cx="244" cy="217" rx="17" ry="8" fill="url(#${p.id('blush')})"/>
    <g stroke="${p.blush}" stroke-width="1.6" stroke-linecap="round" opacity="0.9">
      <path d="M 150 220 L 154 213"/><path d="M 156 221 L 160 214"/><path d="M 162 222 L 166 215"/>
      <path d="M 238 222 L 242 215"/><path d="M 244 221 L 248 214"/><path d="M 250 220 L 254 213"/>
    </g>`;
  }
  if (marks.includes('freckles')) {
    const dots = [
      [150, 212], [157, 216], [164, 212], [153, 221], [161, 223],
      [236, 212], [243, 216], [250, 212], [239, 223], [247, 221],
      [190, 214], [210, 214],
    ];
    out += `<g fill="${p.skinDeep}" opacity="0.6">${dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.5"/>`).join('')}</g>`;
  }
  if (marks.includes('eyebags')) {
    out += `<g fill="none" stroke="${p.skinDeep}" stroke-width="1.6" stroke-linecap="round" opacity="0.45">
      <path d="M 150 210 Q 166 217 182 209"/><path d="M 218 209 Q 234 217 250 210"/></g>`;
  }
  return out;
}

export function marksOver(marks: string[], p: Palette): string {
  let out = '';
  if (marks.includes('mole')) out += `<circle cx="247" cy="213" r="2" fill="${p.hairLine}"/>`;
  if (marks.includes('beauty')) out += `<circle cx="215" cy="248" r="1.8" fill="${p.hairLine}"/>`;
  if (marks.includes('scar')) {
    out += `<g stroke="#D98C8C" stroke-linecap="round" opacity="0.85"><path d="M 232 203 L 254 228" stroke-width="2.4"/>
      <path d="M 236 214 L 242 210" stroke-width="1.4"/><path d="M 242 221 L 248 217" stroke-width="1.4"/></g>`;
  }
  if (marks.includes('bandaid')) {
    out += `<g transform="translate(245 222) rotate(-24)"><rect x="-13" y="-5" width="26" height="10" rx="5" fill="#F4D3B1" stroke="#D6A77E" stroke-width="1"/>
      <rect x="-5" y="-4" width="10" height="8" rx="1.5" fill="#E8BD92"/>
      <g fill="#D6A77E"><circle cx="-9" cy="-1.5" r="0.8"/><circle cx="-9" cy="1.5" r="0.8"/><circle cx="9" cy="-1.5" r="0.8"/><circle cx="9" cy="1.5" r="0.8"/></g></g>`;
  }
  if (marks.includes('star')) {
    out += `<path d="M 248 210 L 250.4 215.2 L 256 215.8 L 251.8 219.4 L 253 225 L 248 222.1 L 243 225 L 244.2 219.4 L 240 215.8 L 245.6 215.2 Z" fill="#E6A0B4" stroke="#FFFFFF" stroke-width="0.8"/>`;
  }
  if (marks.includes('tear')) {
    out += `<path d="M 152 210 Q 148 218 152 221 Q 156 218 152 210 Z" fill="#7FA8E0" stroke="#FFFFFF" stroke-width="0.8"/>`;
  }
  if (marks.includes('heart')) {
    out += `<path d="M 246 222 C 246 218 241 217 241 221 C 241 224 246 227 246 227 C 246 227 251 224 251 221 C 251 217 246 218 246 222 Z" fill="#E36F8E"/>`;
  }
  return out;
}
