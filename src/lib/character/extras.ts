import type { Palette } from './types';

/**
 * Accesorios. Cada uno ocupa un "hueco" (cabeza, ojos, orejas, cuello) para
 * evitar combinaciones imposibles (dos sombreros, dos gafas…).
 */
export type AccessorySlot = 'head' | 'eyes' | 'ears' | 'neck' | 'halo';

interface Accessory {
  slot: AccessorySlot;
  /** Capa: behind = detrás de todo · under = debajo del flequillo · over = encima del pelo. */
  layer: 'behind' | 'under' | 'over';
  draw: (p: Palette) => string;
}

const GOLD = '#E2BE5E';
const GOLD_LINE = '#A8863A';

export const ACCESSORIES: Record<string, Accessory> = {
  glasses_round: {
    slot: 'eyes', layer: 'under',
    draw: () => `<g fill="#FFFFFF" fill-opacity="0.18" stroke="#3B3446" stroke-width="3">
      <circle cx="165" cy="194" r="25"/><circle cx="235" cy="194" r="25"/></g>
      <path d="M 190 190 Q 200 184 210 190" fill="none" stroke="#3B3446" stroke-width="3"/>
      <path d="M 140 190 L 128 186 M 260 190 L 272 186" stroke="#3B3446" stroke-width="3" stroke-linecap="round"/>
      <path d="M 150 180 L 158 174 M 220 180 L 228 174" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`,
  },
  glasses_square: {
    slot: 'eyes', layer: 'under',
    draw: () => `<g fill="#FFFFFF" fill-opacity="0.15" stroke="#2F2B38" stroke-width="3.2" stroke-linejoin="round">
      <rect x="138" y="176" width="52" height="36" rx="6"/><rect x="210" y="176" width="52" height="36" rx="6"/></g>
      <path d="M 190 188 L 210 188 M 138 186 L 126 182 M 262 186 L 274 182" stroke="#2F2B38" stroke-width="3" stroke-linecap="round"/>
      <path d="M 148 184 L 156 180 M 220 184 L 228 180" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`,
  },
  glasses_half: {
    slot: 'eyes', layer: 'under',
    draw: () => `<path d="M 140 198 Q 140 214 164 214 Q 188 214 190 198 M 210 198 Q 212 214 236 214 Q 260 214 260 198" fill="none" stroke="#8C6A3C" stroke-width="2.6"/>
      <path d="M 138 196 L 190 196 M 210 196 L 262 196 M 190 196 Q 200 190 210 196" fill="none" stroke="#8C6A3C" stroke-width="3.4" stroke-linecap="round"/>`,
  },
  eyepatch: {
    slot: 'eyes', layer: 'under',
    draw: () => `<path d="M 118 160 L 282 222" stroke="#1E1A24" stroke-width="3"/>
      <path d="M 212 176 Q 236 170 258 182 Q 262 206 236 216 Q 212 210 212 176 Z" fill="#1E1A24"/>
      <path d="M 222 184 Q 236 180 248 186" fill="none" stroke="#4A4452" stroke-width="2"/>`,
  },
  bow: {
    slot: 'head', layer: 'over',
    draw: () => `<g transform="translate(262 88) rotate(18)">
      <path d="M 0 0 C -18 -22 -40 -12 -34 6 C -30 20 -12 14 0 0 Z" fill="#E36F8E" stroke="#A8435F" stroke-width="2"/>
      <path d="M 0 0 C 18 -22 40 -12 34 6 C 30 20 12 14 0 0 Z" fill="#E36F8E" stroke="#A8435F" stroke-width="2"/>
      <circle r="7" fill="#C94E70" stroke="#A8435F" stroke-width="2"/>
      <path d="M -22 -8 Q -16 -12 -10 -8 M 22 -8 Q 16 -12 10 -8" stroke="#FFFFFF" stroke-width="2" opacity="0.7" fill="none"/></g>`,
  },
  flower: {
    slot: 'head', layer: 'over',
    draw: () => `<g transform="translate(128 112)">
      ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-11" rx="8" ry="12" fill="#FFFFFF" stroke="#E6A0B4" stroke-width="1.6" transform="rotate(${a})"/>`).join('')}
      <circle r="6" fill="#F2C94C" stroke="#D1A534" stroke-width="1.4"/></g>
      <g transform="translate(106 128) scale(0.6)">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-11" rx="8" ry="12" fill="#F8C9D6" stroke="#E6A0B4" stroke-width="2" transform="rotate(${a})"/>`).join('')}<circle r="6" fill="#F2C94C"/></g>`,
  },
  headband: {
    slot: 'head', layer: 'over',
    draw: () => `<path d="M 112 136 C 118 64 282 64 288 136" fill="none" stroke="#6F5BD3" stroke-width="10" stroke-linecap="round"/>
      <path d="M 124 110 C 150 76 250 76 276 110" fill="none" stroke="#FFFFFF" stroke-width="2.5" opacity="0.6"/>`,
  },
  cat_ears: {
    slot: 'head', layer: 'under',
    draw: (p) => `${[-1, 1].map((d) => `<path d="M ${200 + d * 42} 76 L ${200 + d * 78} 18 L ${200 + d * 90} 92 Z" fill="${p.hair}" stroke="${p.hairLine}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M ${200 + d * 54} 78 L ${200 + d * 76} 36 L ${200 + d * 82} 86 Z" fill="#F4B6C6"/>`).join('')}`,
  },
  fox_ears: {
    slot: 'head', layer: 'under',
    draw: (p) => `${[-1, 1].map((d) => `<path d="M ${200 + d * 36} 80 C ${200 + d * 50} 30 ${200 + d * 70} 8 ${200 + d * 86} 4 C ${200 + d * 96} 30 ${200 + d * 96} 64 ${200 + d * 90} 96 Z" fill="${p.hair}" stroke="${p.hairLine}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M ${200 + d * 84} 8 C ${200 + d * 92} 20 ${200 + d * 92} 30 ${200 + d * 90} 40 L ${200 + d * 76} 22 Z" fill="#FFFFFF"/>
      <path d="M ${200 + d * 50} 80 C ${200 + d * 60} 50 ${200 + d * 72} 34 ${200 + d * 82} 30 C ${200 + d * 86} 50 ${200 + d * 86} 70 ${200 + d * 82} 88 Z" fill="#F7E9E2"/>`).join('')}`,
  },
  horns: {
    slot: 'head', layer: 'under',
    draw: () => `${[-1, 1].map((d) => `<path d="M ${200 + d * 40} 78 C ${200 + d * 40} 40 ${200 + d * 62} 18 ${200 + d * 92} 14 C ${200 + d * 72} 30 ${200 + d * 64} 56 ${200 + d * 66} 86 Z" fill="#3A2F45" stroke="#1E1A24" stroke-width="2" stroke-linejoin="round"/>
      <path d="M ${200 + d * 48} 60 C ${200 + d * 54} 40 ${200 + d * 66} 28 ${200 + d * 80} 22" fill="none" stroke="#6E5F80" stroke-width="2.5" stroke-linecap="round"/>`).join('')}`,
  },
  halo: {
    slot: 'halo', layer: 'behind',
    draw: () => `<ellipse cx="200" cy="30" rx="62" ry="14" fill="none" stroke="#F5D77A" stroke-width="7"/>
      <ellipse cx="200" cy="30" rx="62" ry="14" fill="none" stroke="#FFF6CF" stroke-width="2.5"/>`,
  },
  beret: {
    slot: 'head', layer: 'over',
    draw: () => `<path d="M 104 108 C 96 58 180 30 250 44 C 300 54 316 90 296 110 C 250 92 150 92 104 108 Z" fill="#B8394A" stroke="#7E2433" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M 104 108 C 150 92 250 92 296 110" fill="none" stroke="#7E2433" stroke-width="5"/>
      <path d="M 196 40 l 4 -10 l 5 10" fill="#7E2433"/>
      <path d="M 140 66 C 170 48 220 44 250 54" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.35"/>`,
  },
  witch_hat: {
    slot: 'head', layer: 'over',
    draw: () => `<path d="M 70 112 C 120 88 280 88 330 112 C 290 124 110 124 70 112 Z" fill="#2E2640" stroke="#16121E" stroke-width="2.2"/>
      <path d="M 132 102 C 150 60 190 -10 262 -2 C 226 20 240 60 268 102 Z" fill="#3B3152" stroke="#16121E" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M 136 96 Q 200 84 264 96 L 266 104 Q 200 92 134 104 Z" fill="#6F5BD3"/>
      <path d="M 196 90 l 3 6 l 7 1 l -5 4.6 l 1.2 6.6 l -6.2 -3.2 l -6.2 3.2 l 1.2 -6.6 l -5 -4.6 l 7 -1 z" fill="${GOLD}"/>`,
  },
  tiara: {
    slot: 'head', layer: 'over',
    draw: () => `<path d="M 140 98 L 150 74 L 166 90 L 184 62 L 200 84 L 216 62 L 234 90 L 250 74 L 260 98 Q 200 84 140 98 Z" fill="${GOLD}" stroke="${GOLD_LINE}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="200" cy="86" r="5" fill="#E36F8E" stroke="#FFFFFF" stroke-width="1.4"/>
      <circle cx="166" cy="90" r="3" fill="#7FB8E8"/><circle cx="234" cy="90" r="3" fill="#7FB8E8"/>`,
  },
  headphones: {
    slot: 'head', layer: 'over',
    draw: () => `<path d="M 108 160 C 100 40 300 40 292 160" fill="none" stroke="#3B3446" stroke-width="11" stroke-linecap="round"/>
      <path d="M 108 160 C 100 40 300 40 292 160" fill="none" stroke="#6F5BD3" stroke-width="4" stroke-linecap="round"/>
      <rect x="92" y="152" width="30" height="50" rx="14" fill="#3B3446"/><rect x="278" y="152" width="30" height="50" rx="14" fill="#3B3446"/>
      <rect x="98" y="160" width="12" height="34" rx="6" fill="#E6A0B4"/><rect x="290" y="160" width="12" height="34" rx="6" fill="#E6A0B4"/>`,
  },
  earrings: {
    slot: 'ears', layer: 'under',
    draw: () => `${[-1, 1].map((d) => `<path d="M ${200 + d * 72} 216 L ${200 + d * 72} 226" stroke="${GOLD}" stroke-width="2"/>
      <path d="M ${200 + d * 72} 226 l 5 8 l -5 8 l -5 -8 z" fill="#7FB8E8" stroke="${GOLD_LINE}" stroke-width="1.2"/>`).join('')}`,
  },
  choker: {
    slot: 'neck', layer: 'under',
    draw: () => `<path d="M 178 264 Q 200 274 222 264" fill="none" stroke="#2A2432" stroke-width="7" stroke-linecap="round"/>
      <path d="M 200 272 C 196 266 190 270 194 276 L 200 282 L 206 276 C 210 270 204 266 200 272 Z" fill="#E36F8E"/>`,
  },
  pendant: {
    slot: 'neck', layer: 'under',
    draw: () => `<path d="M 180 272 Q 200 318 220 272" fill="none" stroke="${GOLD}" stroke-width="2"/>
      <path d="M 200 306 l 7 8 l -7 10 l -7 -10 z" fill="#8FD3C1" stroke="${GOLD_LINE}" stroke-width="1.4"/>`,
  },
  scarf: {
    slot: 'neck', layer: 'under',
    draw: () => `<path d="M 162 276 C 170 300 230 300 238 276 C 246 290 246 310 236 318 C 214 330 186 330 164 318 C 154 310 154 290 162 276 Z" fill="#C8506B" stroke="#8C2F46" stroke-width="2"/>
      <path d="M 214 314 L 222 372 L 244 366 L 232 310 Z" fill="#C8506B" stroke="#8C2F46" stroke-width="2"/>
      <g stroke="#F2C9D4" stroke-width="2.4" opacity="0.8"><path d="M 170 300 Q 200 314 230 300"/><path d="M 220 330 L 238 326"/><path d="M 222 346 L 240 342"/></g>`,
  },
};

export const accessorySlot = (id: string) => ACCESSORIES[id]?.slot;

export function accessories(ids: string[], layer: Accessory['layer'], p: Palette): string {
  return ids
    .map((id) => ACCESSORIES[id])
    .filter((a) => a && a.layer === layer)
    .map((a) => a.draw(p))
    .join('');
}

/** Cuello bajo la ropa o encima: los collares van encima de la ropa. */
export function neckAccessories(ids: string[], p: Palette): string {
  return ids
    .map((id) => ACCESSORIES[id])
    .filter((a) => a && a.slot === 'neck')
    .map((a) => a.draw(p))
    .join('');
}
