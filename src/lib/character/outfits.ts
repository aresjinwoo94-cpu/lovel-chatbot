import { light, shade } from './color';
import type { Palette } from './types';

/**
 * Ropa de rol (medio cuerpo). Cada conjunto tiene su propio diseño:
 * cuellos, solapas, corbatas, delantales, armaduras… y un color principal
 * que se puede cambiar.
 */

interface Outfit {
  /** Color principal por defecto (se puede cambiar en el creador). */
  color: string;
  draw: (c: string, p: Palette) => string;
  /** Pieza para la cabeza que va con el conjunto (cofia, gorro…), delante del pelo. */
  head?: (c: string, p: Palette) => string;
}

const line = (c: string) => shade(c, 0.55);
const S = (c: string, w = 2) => `stroke="${line(c)}" stroke-width="${w}" stroke-linejoin="round"`;

const TORSO = 'M 40 400 C 46 336 100 309 168 298 Q 200 305 232 298 C 300 309 354 336 360 400 Z';
const torso = (c: string) => `<path d="${TORSO}" fill="${c}" ${S(c)}/>`;
/** Pliegues suaves en los hombros. */
const folds = (c: string) =>
  `<g fill="none" stroke="${shade(c, 0.25)}" stroke-width="2" stroke-linecap="round" opacity="0.8">
    <path d="M 104 340 Q 118 356 116 380"/><path d="M 296 340 Q 282 356 284 380"/></g>`;
const vneck = (p: Palette, depth = 40, w = 22) =>
  `<path d="M ${200 - w} 297 L 200 ${297 + depth} L ${200 + w} 297 Z" fill="${p.skin}"/>
   <path d="M ${200 - w + 4} 297 L 200 ${297 + depth * 0.55} L ${200 + w - 4} 297 Z" fill="${p.skinShade}" opacity="0.5"/>`;
const shirtCollar = (c = '#FFFFFF') =>
  `<path d="M 180 293 L 160 318 L 190 326 L 200 310 Z" fill="${c}" ${S(c, 1.8)}/>
   <path d="M 220 293 L 240 318 L 210 326 L 200 310 Z" fill="${c}" ${S(c, 1.8)}/>`;
const tie = (c: string) =>
  `<path d="M 193 314 L 207 314 L 205 327 L 195 327 Z" fill="${shade(c, 0.1)}" ${S(c, 1.6)}/>
   <path d="M 195 327 L 205 327 L 213 386 L 200 400 L 187 386 Z" fill="${c}" ${S(c, 1.6)}/>`;
const bow = (c: string, y = 318, s = 1) =>
  `<g transform="translate(200 ${y}) scale(${s})">
    <path d="M 0 0 L -22 -11 Q -26 0 -22 11 Z" fill="${c}" ${S(c, 1.6)}/>
    <path d="M 0 0 L 22 -11 Q 26 0 22 11 Z" fill="${c}" ${S(c, 1.6)}/>
    <path d="M -4 2 L -12 24 L -4 20 Z M 4 2 L 12 24 L 4 20 Z" fill="${shade(c, 0.12)}" ${S(c, 1.4)}/>
    <rect x="-5.5" y="-6" width="11" height="12" rx="3" fill="${shade(c, 0.1)}" ${S(c, 1.4)}/></g>`;
const button = (x: number, y: number, c: string, r = 3.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${shade(c, 0.45)}" stroke-width="1"/>`;
/** Chaqueta abierta con solapas sobre una camisa. */
function jacket(c: string, shirt = '#FFFFFF', opts: { tieColor?: string; bowColor?: string } = {}) {
  return `${torso(c)}
    <path d="M 176 298 L 200 392 L 224 298 Z" fill="${shirt}" ${S(shirt, 1.6)}/>
    ${shirtCollar(shirt)}
    ${opts.tieColor ? tie(opts.tieColor) : ''}${opts.bowColor ? bow(opts.bowColor, 318, 0.8) : ''}
    <path d="M 174 298 L 150 326 L 166 334 L 150 344 L 196 400 L 200 392 Z" fill="${shade(c, 0.08)}" ${S(c)}/>
    <path d="M 226 298 L 250 326 L 234 334 L 250 344 L 204 400 L 200 392 Z" fill="${shade(c, 0.08)}" ${S(c)}/>
    ${folds(c)}`;
}

export const OUTFITS: Record<string, Outfit> = {
  school_sailor: {
    color: '#2C3A6B',
    draw: (c, p) => `${torso('#FAFAFC')}${folds('#FAFAFC')}${vneck(p, 34, 18)}
      <path d="M 170 298 C 140 306 108 318 92 332 L 124 346 L 200 360 L 276 346 L 308 332 C 292 318 260 306 230 298 L 200 348 Z" fill="${c}" ${S(c)}/>
      <path d="M 128 336 L 200 350 L 272 336" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>
      ${bow('#C8364A', 350, 0.95)}`,
  },
  school_blazer: {
    color: '#27365E',
    draw: (c) => `${jacket(c, '#FFFFFF', { bowColor: '#C23A57' })}
      <path d="M 262 352 l 14 0 l 0 14 q -7 6 -14 0 z" fill="#E7C465" stroke="${shade('#E7C465', 0.4)}" stroke-width="1"/>
      ${button(186, 380, '#E7C465')}`,
  },
  maid: {
    color: '#23202B',
    draw: (c) => `${torso(c)}${folds(c)}
      <path d="M 150 400 L 158 330 Q 200 322 242 330 L 250 400 Z" fill="#FFFFFF" ${S('#FFFFFF', 1.8)}/>
      <path d="M 158 330 Q 200 322 242 330" fill="none" stroke="#D9D5E0" stroke-width="5" stroke-dasharray="4 3"/>
      <path d="M 150 330 L 132 300 M 250 330 L 268 300" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>
      <path d="M 170 296 Q 176 312 186 304 Q 192 316 200 306 Q 208 316 214 304 Q 224 312 230 296" fill="#FFFFFF" ${S('#FFFFFF', 1.6)}/>
      ${bow('#23202B', 314, 0.7)}`,
    head: () => `<path d="M 124 106 Q 200 52 276 106 L 270 92 Q 200 38 130 92 Z" fill="#FFFFFF" stroke="#C9C4D2" stroke-width="1.8"/>
      <path d="M 134 96 Q 146 80 158 88 Q 170 70 184 80 Q 200 62 216 80 Q 230 70 242 88 Q 254 80 266 96" fill="#FFFFFF" stroke="#C9C4D2" stroke-width="1.8"/>`,
  },
  nurse: {
    color: '#F6D6E1',
    draw: (c, p) => `${torso(c)}${folds(c)}${vneck(p, 36, 20)}
      <path d="M 180 297 L 200 333 L 220 297" fill="none" stroke="#FFFFFF" stroke-width="6"/>
      <rect x="244" y="350" width="34" height="30" rx="4" fill="${light(c, 0.4)}" ${S(c, 1.6)}/>
      <path d="M 100 330 Q 104 350 108 372" fill="none" stroke="#FFFFFF" stroke-width="5" opacity="0.8"/>`,
    head: () => `<path d="M 150 84 L 162 56 L 238 56 L 250 84 Q 200 72 150 84 Z" fill="#FFFFFF" stroke="#D6CCD4" stroke-width="1.8"/>
      <path d="M 194 62 h 12 v 5 h 5 v 8 h -5 v 5 h -12 v -5 h -5 v -8 h 5 z" fill="#E35D7A"/>`,
  },
  doctor: {
    color: '#FFFFFF',
    draw: (c) => `${torso(c)}
      <path d="M 176 298 L 200 380 L 224 298 Z" fill="#9CC3E6" ${S('#9CC3E6', 1.6)}/>
      ${shirtCollar('#9CC3E6')}${tie('#3E5F8A')}
      <path d="M 174 298 L 144 334 L 162 342 L 146 352 L 188 400 L 200 386 Z" fill="${shade(c, 0.05)}" ${S('#C8C4CF')}/>
      <path d="M 226 298 L 256 334 L 238 342 L 254 352 L 212 400 L 200 386 Z" fill="${shade(c, 0.05)}" ${S('#C8C4CF')}/>
      <path d="M 170 300 C 150 340 156 372 176 376 M 230 300 C 250 340 244 372 226 378" fill="none" stroke="#4A4E5C" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="226" cy="382" r="7" fill="#C9CED8" stroke="#4A4E5C" stroke-width="2.5"/>
      <rect x="252" y="360" width="30" height="8" rx="3" fill="#5E86C2"/>
      ${folds('#D8D4DE')}`,
  },
  office: {
    color: '#4A4E5E',
    draw: (c) => `${jacket(c, '#FFFFFF', { tieColor: '#6F5BD3' })}
      <path d="M 250 300 L 262 364" stroke="#2F2B38" stroke-width="2"/>
      <rect x="252" y="362" width="24" height="30" rx="3" fill="#FFFFFF" stroke="#9A96A2" stroke-width="1.4"/>
      <rect x="257" y="368" width="14" height="9" rx="1.5" fill="#C7D6F0"/>`,
  },
  teacher: {
    color: '#C9A77E',
    draw: (c, p) => `${torso(c)}${vneck(p, 12, 16)}
      <path d="M 176 298 L 200 376 L 224 298 Z" fill="#F5F1EA" ${S('#F5F1EA', 1.6)}/>
      ${shirtCollar('#F5F1EA')}
      <path d="M 176 298 L 196 400 M 224 298 L 204 400" stroke="${line(c)}" stroke-width="2"/>
      <path d="M 178 304 L 197 396 M 222 304 L 203 396" stroke="${shade(c, 0.2)}" stroke-width="6" opacity="0.5"/>
      ${button(193, 352, light(c, 0.3))}${button(196, 380, light(c, 0.3))}
      <g stroke="${shade(c, 0.18)}" stroke-width="1.5" opacity="0.55">${Array.from({ length: 9 }, (_, i) => `<path d="M ${70 + i * 10} 400 L ${80 + i * 10} 340"/><path d="M ${330 - i * 10} 400 L ${320 - i * 10} 340"/>`).join('')}</g>`,
  },
  athlete: {
    color: '#6F5BD3',
    draw: (c) => `${torso(c)}
      <path d="M 172 296 L 172 322 Q 200 330 228 322 L 228 296 Q 200 304 172 296 Z" fill="${shade(c, 0.1)}" ${S(c)}/>
      <path d="M 200 322 L 200 400" stroke="#E8E4EE" stroke-width="3"/>
      <rect x="196" y="336" width="8" height="14" rx="2" fill="#E8E4EE"/>
      <path d="M 96 336 C 110 316 140 306 164 302 M 304 336 C 290 316 260 306 236 302" fill="none" stroke="#FFFFFF" stroke-width="6"/>
      <path d="M 88 346 C 102 326 136 312 162 308 M 312 346 C 298 326 264 312 238 308" fill="none" stroke="#FFFFFF" stroke-width="6"/>
      ${folds(c)}`,
  },
  hoodie: {
    color: '#E6A0B4',
    draw: (c) => `${torso(c)}
      <path d="M 150 302 C 140 330 176 346 200 346 C 224 346 260 330 250 302 C 240 318 222 324 200 324 C 178 324 160 318 150 302 Z" fill="${shade(c, 0.15)}" ${S(c)}/>
      <path d="M 186 330 L 182 372 M 214 330 L 218 372" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
      <circle cx="182" cy="374" r="3" fill="#FFFFFF"/><circle cx="218" cy="374" r="3" fill="#FFFFFF"/>
      <path d="M 150 400 Q 200 384 250 400" fill="none" stroke="${line(c)}" stroke-width="2"/>
      ${folds(c)}`,
  },
  casual: {
    color: '#5C7FB8',
    draw: (c, p) => `${torso(c)}
      <path d="M 170 298 L 200 400 L 230 298 Q 200 306 170 298 Z" fill="#F4F1EC" stroke="#CFCAD4" stroke-width="1.6"/>
      <path d="M 184 298 Q 200 314 216 298" fill="${p.skin}" stroke="#CFCAD4" stroke-width="1.6"/>
      <path d="M 170 298 L 152 324 L 164 330 L 188 400 L 200 400 Z" fill="${shade(c, 0.1)}" ${S(c)}/>
      <path d="M 230 298 L 248 324 L 236 330 L 212 400 L 200 400 Z" fill="${shade(c, 0.1)}" ${S(c)}/>
      <g fill="none" stroke="${light(c, 0.5)}" stroke-width="1.6" stroke-dasharray="4 3"><path d="M 110 344 L 150 344"/><path d="M 250 344 L 290 344"/></g>
      ${button(144, 354, light(c, 0.5), 2.6)}${button(256, 354, light(c, 0.5), 2.6)}
      <path d="M 196 350 l 4 -5 l 4 5 l -4 5 z" fill="#E6A0B4"/>`,
  },
  suit: {
    color: '#1F1D26',
    draw: (c) => `${jacket(c, '#FFFFFF', { tieColor: '#2B2835' })}
      <path d="M 256 344 L 276 340 L 274 348 Z" fill="#FFFFFF"/>
      ${button(196, 384, '#3A3644')}`,
  },
  military: {
    color: '#2E4A3A',
    draw: (c) => `${torso(c)}
      <path d="M 174 290 L 174 318 Q 200 326 226 318 L 226 290 Q 200 298 174 290 Z" fill="${shade(c, 0.12)}" ${S(c)}/>
      <path d="M 180 312 L 200 322 L 220 312" fill="none" stroke="#E2BE5E" stroke-width="2.5"/>
      <path d="M 96 334 L 150 312 L 158 326 L 104 348 Z M 304 334 L 250 312 L 242 326 L 296 348 Z" fill="#E2BE5E" stroke="#A8863A" stroke-width="1.6"/>
      <g stroke="#E2BE5E" stroke-width="2">${Array.from({ length: 6 }, (_, i) => `<path d="M ${102 + i * 9} ${346 - i * 3.6} l -2 10"/><path d="M ${298 - i * 9} ${346 - i * 3.6} l 2 10"/>`).join('')}</g>
      ${[340, 364, 388].map((y) => button(184, y, '#E2BE5E') + button(216, y, '#E2BE5E')).join('')}
      <path d="M 240 318 C 262 350 258 372 232 392" fill="none" stroke="#E2BE5E" stroke-width="3"/>
      <path d="M 244 322 C 272 352 266 378 238 398" fill="none" stroke="#E2BE5E" stroke-width="2" opacity="0.8"/>
      <rect x="120" y="360" width="30" height="7" rx="2" fill="#B8394A"/><rect x="120" y="369" width="30" height="7" rx="2" fill="#3D6FB8"/>`,
  },
  mage: {
    color: '#4B3A8C',
    draw: (c) => `<path d="M 96 316 C 120 262 280 262 304 316 L 300 340 L 100 340 Z" fill="${shade(c, 0.2)}" ${S(c)}/>
      ${torso(c)}
      <path d="M 168 299 L 200 400 L 232 299" fill="none" stroke="#E2BE5E" stroke-width="5"/>
      <path d="M 150 300 Q 200 324 250 300" fill="none" stroke="#E2BE5E" stroke-width="3"/>
      <circle cx="200" cy="318" r="9" fill="#7FD8E8" stroke="#E2BE5E" stroke-width="3"/>
      <circle cx="197" cy="315" r="2.5" fill="#FFFFFF"/>
      <g fill="#E2BE5E" opacity="0.9"><path d="M 118 370 l 2.5 5 l 5.5 0.8 l -4 3.8 l 1 5.4 l -5 -2.6 l -5 2.6 l 1 -5.4 l -4 -3.8 l 5.5 -0.8 z"/><path d="M 282 360 l 2 4 l 4.4 0.6 l -3.2 3 l 0.8 4.4 l -4 -2 l -4 2 l 0.8 -4.4 l -3.2 -3 l 4.4 -0.6 z"/></g>
      ${folds(c)}`,
  },
  knight: {
    color: '#B8394A',
    draw: (c) => `${torso(c)}
      <path d="M 150 300 Q 200 316 250 300 L 262 400 L 138 400 Z" fill="#C9CED8" stroke="#6B7384" stroke-width="2"/>
      <path d="M 170 330 Q 200 342 230 330 M 164 362 Q 200 374 236 362" fill="none" stroke="#8B93A4" stroke-width="2"/>
      <path d="M 200 306 L 200 400" stroke="#E8ECF2" stroke-width="3" opacity="0.8"/>
      <path d="M 64 372 C 66 330 104 308 150 304 C 158 328 150 352 128 368 C 110 380 84 382 64 372 Z" fill="#DDE1E8" stroke="#6B7384" stroke-width="2"/>
      <path d="M 336 372 C 334 330 296 308 250 304 C 242 328 250 352 272 368 C 290 380 316 382 336 372 Z" fill="#DDE1E8" stroke="#6B7384" stroke-width="2"/>
      <path d="M 78 356 C 96 330 120 318 144 316 M 322 356 C 304 330 280 318 256 316" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.7"/>
      <circle cx="200" cy="344" r="8" fill="#E2BE5E" stroke="#A8863A" stroke-width="1.6"/>`,
  },
  goth: {
    color: '#1E1A24',
    draw: (c, p) => `${torso(c)}${vneck(p, 30, 26)}
      <path d="M 166 298 Q 172 316 186 310 Q 194 326 200 314 Q 206 326 214 310 Q 228 316 234 298" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>
      <path d="M 178 262 Q 200 272 222 262" fill="none" stroke="#1E1A24" stroke-width="7"/>
      <path d="M 200 270 l 0 14 M 195 275 l 10 0" stroke="#C9CED8" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M 170 340 L 230 340 L 222 400 L 178 400 Z" fill="#5B2A6E" ${S('#5B2A6E', 1.6)}/>
      <g stroke="#E8E4EE" stroke-width="1.6">${[350, 364, 378, 392].map((y) => `<path d="M 190 ${y} L 210 ${y + 8} M 210 ${y} L 190 ${y + 8}"/>`).join('')}</g>
      ${folds(c)}`,
  },
  kimono: {
    color: '#C8506B',
    draw: (c, p) => `${torso(c)}${vneck(p, 50, 26)}
      <path d="M 174 298 L 214 390 L 226 384 L 186 296 Z" fill="#F5EFE6" stroke="${line(c)}" stroke-width="1.6"/>
      <path d="M 226 298 L 200 358 L 188 350 L 214 296 Z" fill="#F5EFE6" stroke="${line(c)}" stroke-width="1.6"/>
      <path d="M 150 300 L 206 400 M 250 300 L 200 356" stroke="${shade(c, 0.2)}" stroke-width="3"/>
      <rect x="90" y="378" width="220" height="22" fill="#E7C465" stroke="#A8863A" stroke-width="1.6"/>
      <g fill="${light(c, 0.55)}" opacity="0.9">${[[110, 336], [290, 330], [128, 364], [272, 360]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="3" cx="0" cy="-5"/><circle r="3" cx="5" cy="0"/><circle r="3" cx="0" cy="5"/><circle r="3" cx="-5" cy="0"/><circle r="2" fill="#E7C465"/></g>`).join('')}</g>`,
  },
  idol: {
    color: '#F2A7C0',
    draw: (c, p) => `${torso('#FFFFFF')}${vneck(p, 24, 20)}
      <path d="M 60 390 C 50 340 90 306 138 304 C 150 330 140 360 120 376 C 100 392 76 398 60 390 Z" fill="${c}" ${S(c)}/>
      <path d="M 340 390 C 350 340 310 306 262 304 C 250 330 260 360 280 376 C 300 392 324 398 340 390 Z" fill="${c}" ${S(c)}/>
      <path d="M 150 330 Q 200 346 250 330 L 256 400 L 144 400 Z" fill="${c}" ${S(c)}/>
      <path d="M 150 330 Q 160 340 170 332 Q 180 342 190 334 Q 200 344 210 334 Q 220 342 230 332 Q 240 340 250 330" fill="none" stroke="#FFFFFF" stroke-width="3"/>
      ${bow(shade(c, 0.1), 322, 1.05)}
      <path d="M 250 356 l 3 6 l 6.5 1 l -4.8 4.5 l 1.2 6.5 l -5.9 -3.1 l -5.9 3.1 l 1.2 -6.5 l -4.8 -4.5 l 6.5 -1 z" fill="#E7C465"/>`,
  },
  punk: {
    color: '#2A2730',
    draw: (c) => `${torso(c)}
      <path d="M 170 298 L 200 400 L 230 298 Q 200 306 170 298 Z" fill="#B8394A" stroke="#7E2433" stroke-width="1.6"/>
      <path d="M 188 330 l 12 16 l 12 -16" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>
      <path d="M 170 298 L 146 322 L 162 332 L 150 344 L 190 400 L 200 400 Z" fill="${shade(c, 0.15)}" ${S(c)}/>
      <path d="M 230 298 L 254 322 L 238 332 L 250 344 L 210 400 L 200 400 Z" fill="${shade(c, 0.15)}" ${S(c)}/>
      <g fill="#D7DBE3">${[[150, 326], [158, 336], [242, 326], [250, 336], [106, 346], [294, 346]].map(([x, y]) => `<path d="M ${x} ${y - 4} l 4 4 l -4 4 l -4 -4 z"/>`).join('')}</g>
      <path d="M 232 360 Q 262 380 286 356" fill="none" stroke="#C9CED8" stroke-width="3" stroke-dasharray="5 3"/>
      <path d="M 176 262 Q 200 272 224 262" fill="none" stroke="#2A2730" stroke-width="7"/>
      <g fill="#D7DBE3">${[184, 200, 216].map((x) => `<circle cx="${x}" cy="${x === 200 ? 270 : 268}" r="2.4"/>`).join('')}</g>`,
  },
  barista: {
    color: '#6B4A3A',
    draw: (c) => `${torso('#F4F1EC')}${folds('#F4F1EC')}
      ${shirtCollar('#F4F1EC')}
      <path d="M 186 300 L 200 316 L 214 300" fill="none" stroke="#CFCAD4" stroke-width="1.6"/>
      <path d="M 142 400 L 150 334 L 250 334 L 258 400 Z" fill="${c}" ${S(c)}/>
      <path d="M 150 334 L 140 300 M 250 334 L 260 300" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
      <rect x="182" y="350" width="36" height="24" rx="3" fill="${shade(c, 0.15)}" ${S(c, 1.4)}/>
      <path d="M 192 360 q 8 -8 16 0" fill="none" stroke="#F4F1EC" stroke-width="2"/>
      <path d="M 196 372 l 4 -6 l 4 6" fill="#F4F1EC"/>`,
  },
};

export function outfitColor(id: string, custom: string | null): string {
  return custom ?? (OUTFITS[id] ?? OUTFITS.casual).color;
}

export function outfit(id: string, custom: string | null, p: Palette): string {
  const o = OUTFITS[id] ?? OUTFITS.casual;
  return o.draw(outfitColor(id, custom), p);
}

export function outfitHead(id: string, custom: string | null, p: Palette): string {
  const o = OUTFITS[id] ?? OUTFITS.casual;
  return o.head ? o.head(outfitColor(id, custom), p) : '';
}
