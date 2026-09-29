import { light, shade } from './color';
import type { Palette } from './types';

/**
 * Ojos anime por capas: línea de pestañas, esclerótica, iris con degradado,
 * pupila y brillos. Cada estilo cambia la forma real del ojo (no solo el color).
 * Coordenadas locales del ojo izquierdo: x negativo = esquina exterior.
 */
interface EyeStyle {
  w: number;
  h: number;
  /** Altura de la esquina exterior (negativo = hacia arriba, ojos rasgados). */
  tilt: number;
  /** Profundidad del párpado inferior (fracción de h). */
  lower: number;
  /** Grosor de la línea superior de pestañas. */
  lid: number;
  /** Largo del "rabito" de la pestaña exterior. */
  wing: number;
  iris: [number, number];
  pupil: 'round' | 'slit' | 'star' | 'heart' | 'ring';
  shine: 'classic' | 'sparkle' | 'soft' | 'star' | 'heart';
  /** Pestañas sueltas en la esquina exterior. */
  lashes: 0 | 1 | 2 | 3;
  /** Párpado superior caído (0..1): mirada somnolienta. */
  flat?: number;
}

export const EYE_STYLES: Record<string, EyeStyle> = {
  sparkle: { w: 23, h: 26, tilt: -3, lower: 0.95, lid: 6, wing: 6, iris: [0.76, 0.9], pupil: 'round', shine: 'sparkle', lashes: 2 },
  almond: { w: 25, h: 20, tilt: -6, lower: 0.85, lid: 6, wing: 8, iris: [0.62, 0.98], pupil: 'round', shine: 'classic', lashes: 2 },
  gentle: { w: 23, h: 24, tilt: 5, lower: 0.95, lid: 5.5, wing: 3, iris: [0.74, 0.92], pupil: 'round', shine: 'soft', lashes: 1 },
  cat: { w: 24, h: 21, tilt: -10, lower: 0.8, lid: 7, wing: 10, iris: [0.62, 0.98], pupil: 'slit', shine: 'classic', lashes: 2 },
  sleepy: { w: 24, h: 23, tilt: -2, lower: 0.9, lid: 6.5, wing: 4, iris: [0.72, 0.95], pupil: 'round', shine: 'soft', lashes: 1, flat: 0.5 },
  round: { w: 21, h: 28, tilt: 0, lower: 1, lid: 5.5, wing: 3, iris: [0.82, 0.86], pupil: 'round', shine: 'sparkle', lashes: 1 },
  calm: { w: 24, h: 18, tilt: -3, lower: 0.8, lid: 4.8, wing: 0, iris: [0.62, 1.02], pupil: 'round', shine: 'classic', lashes: 0 },
  fierce: { w: 25, h: 18, tilt: -9, lower: 0.72, lid: 6.2, wing: 2, iris: [0.56, 1.04], pupil: 'round', shine: 'classic', lashes: 0 },
  starry: { w: 22, h: 26, tilt: -2, lower: 0.95, lid: 5.8, wing: 5, iris: [0.78, 0.9], pupil: 'star', shine: 'star', lashes: 2 },
  dreamy: { w: 23, h: 25, tilt: 2, lower: 0.95, lid: 5.8, wing: 5, iris: [0.76, 0.9], pupil: 'heart', shine: 'heart', lashes: 2 },
  mystic: { w: 24, h: 22, tilt: -5, lower: 0.88, lid: 6, wing: 6, iris: [0.7, 0.96], pupil: 'ring', shine: 'soft', lashes: 1 },
  narrow: { w: 26, h: 15, tilt: -7, lower: 0.7, lid: 5, wing: 5, iris: [0.52, 1.12], pupil: 'round', shine: 'classic', lashes: 1 },
};

const LEFT = { x: 166, y: 192 };
const RIGHT = { x: 234, y: 192 };

function geometry(s: EyeStyle) {
  const { w, h, tilt } = s;
  const drop = s.flat ? h * s.flat : 0;
  const upperC1 = [-w * 0.75, -h * 0.95 + tilt * 0.4 + drop] as const;
  const upperC2 = [w * 0.45, -h * 1.05 + drop] as const;
  const outer = [-w, tilt] as const;
  const inner = [w, 3] as const;
  const upper = `M ${outer[0]} ${outer[1]} C ${upperC1[0]} ${upperC1[1]} ${upperC2[0]} ${upperC2[1]} ${inner[0]} ${inner[1]}`;
  const lowerY = h * s.lower;
  const lowerBack = `C ${w * 0.55} ${lowerY} ${-w * 0.62} ${lowerY} ${outer[0]} ${outer[1]}`;
  const sclera = `${upper} ${lowerBack} Z`;
  const t = s.lid;
  const wingTip = [-w - s.wing, tilt - s.wing * 0.55] as const;
  const lash = [
    `M ${wingTip[0]} ${wingTip[1]}`,
    `C ${-w * 0.82} ${upperC1[1] - t} ${upperC2[0]} ${upperC2[1] - t * 0.7} ${inner[0] + 1} ${inner[1] - 1}`,
    `L ${inner[0]} ${inner[1] + 1}`,
    `C ${upperC2[0]} ${upperC2[1]} ${upperC1[0]} ${upperC1[1]} ${outer[0]} ${outer[1] + 1.5}`,
    'Z',
  ].join(' ');
  const irisX = -w * 0.04;
  const irisY = h * 0.1 + drop * 0.25;
  const rx = w * s.iris[0];
  const ry = h * s.iris[1] * (s.flat ? 0.95 : 1);
  return { sclera, lash, irisX, irisY, rx, ry, lowerY, drop, upperC1, upperC2, outer, inner, wingTip };
}

function star(cx: number, cy: number, r: number, inner = 0.42) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * inner;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

function sparkle4(cx: number, cy: number, r: number) {
  const k = r * 0.22;
  return `M ${cx} ${cy - r} Q ${cx + k} ${cy - k} ${cx + r} ${cy} Q ${cx + k} ${cy + k} ${cx} ${cy + r} Q ${cx - k} ${cy + k} ${cx - r} ${cy} Q ${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
}

function heart(cx: number, cy: number, s: number) {
  return `M ${cx} ${cy + s * 0.9} C ${cx - s * 1.4} ${cy} ${cx - s * 0.8} ${cy - s * 1.1} ${cx} ${cy - s * 0.35} C ${cx + s * 0.8} ${cy - s * 1.1} ${cx + s * 1.4} ${cy} ${cx} ${cy + s * 0.9} Z`;
}

/** Cuerpo del ojo (se refleja para el ojo derecho). */
function eyeBody(s: EyeStyle, p: Palette, side: 'L' | 'R') {
  const g = geometry(s);
  const clip = p.id(`eyeclip${side}`);
  const grad = p.id('iris');
  const pupilColor = shade(p.eye, 0.78);
  let pupil = '';
  switch (s.pupil) {
    case 'slit':
      pupil = `<ellipse cx="${g.irisX}" cy="${g.irisY + 1}" rx="${g.rx * 0.16}" ry="${g.ry * 0.78}" fill="${pupilColor}"/>`;
      break;
    case 'star':
      pupil = `<path d="${star(g.irisX, g.irisY + 2, g.rx * 0.5)}" fill="${pupilColor}"/>`;
      break;
    case 'heart':
      pupil = `<path d="${heart(g.irisX, g.irisY + 2, g.rx * 0.42)}" fill="${pupilColor}"/>`;
      break;
    case 'ring':
      pupil = `<ellipse cx="${g.irisX}" cy="${g.irisY + 1}" rx="${g.rx * 0.5}" ry="${g.ry * 0.52}" fill="none" stroke="${pupilColor}" stroke-width="2.4"/>
      <ellipse cx="${g.irisX}" cy="${g.irisY + 1}" rx="${g.rx * 0.2}" ry="${g.ry * 0.22}" fill="${light(p.eye, 0.55)}"/>`;
      break;
    default:
      pupil = `<ellipse cx="${g.irisX}" cy="${g.irisY + 1}" rx="${g.rx * 0.42}" ry="${g.ry * 0.46}" fill="${pupilColor}"/>`;
  }
  const lashes =
    s.lashes > 0
      ? Array.from({ length: s.lashes }, (_, i) => {
          const bx = -s.w * (0.78 - i * 0.2);
          const by = g.upperC1[1] * (0.62 - i * 0.12) - s.lid * 0.4;
          return `<path d="M ${bx} ${by + 3} Q ${bx - 5} ${by - 4} ${bx - 10 + i * 2} ${by - 5 + i} Q ${bx - 3} ${by} ${bx + 3} ${by + 3} Z" fill="${p.lash}"/>`;
        }).join('')
      : '';
  return `
    <path d="${g.sclera}" fill="#FFFFFF"/>
    <g clip-path="url(#${clip})">
      <ellipse cx="${g.irisX}" cy="${g.irisY}" rx="${g.rx}" ry="${g.ry}" fill="url(#${grad})"/>
      <ellipse cx="${g.irisX}" cy="${g.irisY + g.ry * 0.52}" rx="${g.rx * 0.62}" ry="${g.ry * 0.3}" fill="${light(p.eye, 0.55)}" opacity="0.7"/>
      ${pupil}
      <ellipse cx="${g.irisX}" cy="${g.irisY}" rx="${g.rx}" ry="${g.ry}" fill="none" stroke="${shade(p.eye, 0.62)}" stroke-width="1.6"/>
      <path d="${g.sclera}" fill="none" stroke="${p.lash}" stroke-opacity="0.18" stroke-width="7" transform="translate(0 -3)"/>
    </g>
    <path d="${g.lash}" fill="${p.lash}"/>
    ${lashes}
    <path d="M ${-s.w * 0.9} ${g.outer[1] + 3} C ${-s.w * 0.62} ${g.lowerY * 0.98} ${-s.w * 0.1} ${g.lowerY * 1.02} ${s.w * 0.2} ${g.lowerY * 0.96}" fill="none" stroke="${p.lash}" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
    ${s.h >= 20 && !s.flat ? `<path d="M ${-s.w * 0.6} ${g.upperC1[1] - s.lid - 2} Q ${-s.w * 0.1} ${-s.h * 1.02 - s.lid - 3} ${s.w * 0.45} ${g.upperC2[1] * 0.92 - s.lid}" fill="none" stroke="${p.skinLine}" stroke-width="1.2" stroke-linecap="round" opacity="0.35"/>` : ''}`;
}

/** Brillos: sin reflejar, para que la luz venga del mismo lado en ambos ojos. */
function eyeShine(s: EyeStyle, mirrored: boolean) {
  const g = geometry(s);
  const k = mirrored ? -1 : 1;
  const ix = g.irisX * k;
  const hx = ix - g.rx * 0.34;
  const hy = g.irisY - g.ry * 0.38;
  const small = `<circle cx="${ix + g.rx * 0.4}" cy="${g.irisY + g.ry * 0.34}" r="${Math.max(1.8, g.rx * 0.13)}" fill="#FFFFFF"/>`;
  switch (s.shine) {
    case 'sparkle':
      return `<ellipse cx="${hx}" cy="${hy}" rx="${g.rx * 0.34}" ry="${g.ry * 0.3}" fill="#FFFFFF" transform="rotate(-20 ${hx} ${hy})"/>
        <path d="${sparkle4(ix + g.rx * 0.34, g.irisY - g.ry * 0.46, g.rx * 0.34)}" fill="#FFFFFF"/>
        ${small}<circle cx="${ix - g.rx * 0.1}" cy="${g.irisY + g.ry * 0.5}" r="1.2" fill="#FFFFFF" opacity="0.9"/>`;
    case 'soft':
      return `<ellipse cx="${hx}" cy="${hy}" rx="${g.rx * 0.38}" ry="${g.ry * 0.26}" fill="#FFFFFF" opacity="0.92" transform="rotate(-15 ${hx} ${hy})"/>${small}`;
    case 'star':
      return `<path d="${star(hx, hy, g.rx * 0.36)}" fill="#FFFFFF"/>${small}`;
    case 'heart':
      return `<path d="${heart(hx, hy, g.rx * 0.28)}" fill="#FFFFFF"/>${small}`;
    default:
      return `<ellipse cx="${hx}" cy="${hy}" rx="${g.rx * 0.3}" ry="${g.ry * 0.3}" fill="#FFFFFF" transform="rotate(-20 ${hx} ${hy})"/>${small}`;
  }
}

function closedEye(s: EyeStyle, p: Palette) {
  const y = s.tilt * 0.5;
  return `<path d="M ${-s.w - s.wing * 0.6} ${y - 1} Q ${-s.w * 0.1} ${s.h * 0.42} ${s.w} 4" fill="none" stroke="${p.lash}" stroke-width="${s.lid * 0.75}" stroke-linecap="round"/>
  ${s.lashes ? `<path d="M ${-s.w * 0.75} ${s.h * 0.18} L ${-s.w * 0.95} ${s.h * 0.4}" stroke="${p.lash}" stroke-width="1.6" stroke-linecap="round"/>` : ''}`;
}

export function eyeDefs(styleId: string, p: Palette): string {
  const s = EYE_STYLES[styleId] ?? EYE_STYLES.sparkle;
  const g = geometry(s);
  return `
  <linearGradient id="${p.id('iris')}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${shade(p.eye, 0.62)}"/>
    <stop offset="0.45" stop-color="${p.eye}"/>
    <stop offset="1" stop-color="${light(p.eye, 0.42)}"/>
  </linearGradient>
  <clipPath id="${p.id('eyeclipL')}"><path d="${g.sclera}"/></clipPath>
  <clipPath id="${p.id('eyeclipR')}"><path d="${g.sclera}"/></clipPath>`;
}

export function eyes(styleId: string, p: Palette, blink = false): string {
  const s = EYE_STYLES[styleId] ?? EYE_STYLES.sparkle;
  if (blink) {
    return `<g transform="translate(${LEFT.x} ${LEFT.y})">${closedEye(s, p)}</g>
    <g transform="translate(${RIGHT.x} ${RIGHT.y}) scale(-1 1)">${closedEye(s, p)}</g>`;
  }
  return `
  <g transform="translate(${LEFT.x} ${LEFT.y})">${eyeBody(s, p, 'L')}${eyeShine(s, false)}</g>
  <g transform="translate(${RIGHT.x} ${RIGHT.y}) scale(-1 1)">${eyeBody(s, p, 'R')}</g>
  <g transform="translate(${RIGHT.x} ${RIGHT.y})">${eyeShine(s, true)}</g>`;
}
