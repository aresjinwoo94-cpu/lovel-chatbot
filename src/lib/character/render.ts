import { light, mix, shade } from './color';
import { ACCESSORIES, accessories, neckAccessories } from './extras';
import { eyeDefs, eyes } from './eyes';
import { body, brows, ears, facePath, marksOver, marksUnder, mouth, nose } from './face';
import { hairBack, hairDefs, hairFront, hairShadow } from './hair';
import { outfit, outfitHead } from './outfits';
import type { CharacterLook, Palette, RenderOptions } from './types';

/**
 * Dibuja el personaje completo como SVG (texto). Funciona igual en iOS,
 * Android y web (react-native-svg) y en el servidor si hiciera falta.
 */

export const BACKGROUNDS: Record<string, [string, string]> = {
  lilac: ['#E9E4FA', '#F8E8ED'],
  blush: ['#F8E8ED', '#FFFFFF'],
  cream: ['#F9F7F3', '#EFE9E0'],
  twilight: ['#6F5BD3', '#E6A0B4'],
  night: ['#2E2A4A', '#6F5BD3'],
  mint: ['#E3F3EA', '#F9F7F3'],
  sky: ['#DCEAFB', '#F4F0FC'],
  peach: ['#FBE3D6', '#F8E8ED'],
};

let counter = 0;

export function makePalette(look: CharacterLook, uid: string): Palette {
  const skin = look.skin;
  const hair = look.hairColor;
  return {
    skin,
    skinShade: mix(skin, '#B8707F', 0.26),
    skinDeep: mix(skin, '#8A4A5A', 0.45),
    skinLine: mix(skin, '#6B3A48', 0.6),
    blush: '#F08FA3',
    hair,
    hairShade: shade(hair, 0.26),
    hairDeep: shade(hair, 0.5),
    hairLight: light(hair, 0.42),
    hairLine: shade(hair, 0.62),
    eye: look.eyeColor,
    lash: mix(shade(hair, 0.72), '#241A2C', 0.55),
    outfit: look.outfitColor,
    id: (name: string) => `${uid}-${name}`,
  };
}

export function renderCharacter(look: CharacterLook, opts: RenderOptions = {}): string {
  const uid = (opts.uid ?? `ch${++counter}`).replace(/[^a-zA-Z0-9_-]/g, '');
  const p = makePalette(look, uid);
  const acc = look.accessories.filter((a) => ACCESSORIES[a]);
  const nonNeck = acc.filter((a) => ACCESSORIES[a].slot !== 'neck');
  const face = facePath(look.face);
  const bg = BACKGROUNDS[look.background] ?? BACKGROUNDS.lilac;
  const viewBox = opts.crop === 'face' ? '96 62 208 208' : '0 0 400 400';

  const defs = `<defs>
    <linearGradient id="${p.id('bg')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>
    <radialGradient id="${p.id('blush')}"><stop offset="0" stop-color="${p.blush}" stop-opacity="0.55"/><stop offset="1" stop-color="${p.blush}" stop-opacity="0"/></radialGradient>
    <clipPath id="${p.id('face')}"><path d="${face}"/></clipPath>
    ${hairDefs(p)}${eyeDefs(look.eyes, p)}
  </defs>`;

  const background =
    opts.background === false
      ? ''
      : `<rect x="-20" y="-20" width="440" height="440" fill="url(#${p.id('bg')})"/>
         <circle cx="200" cy="200" r="150" fill="#FFFFFF" opacity="${look.background === 'night' || look.background === 'twilight' ? 0.12 : 0.35}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  ${defs}
  ${background}
  ${accessories(nonNeck, 'behind', p)}
  ${hairBack(look.hair, p)}
  ${body(look.face, p)}
  ${outfit(look.outfit, look.outfitColor, p)}
  ${neckAccessories(acc, p)}
  ${ears(look.face, p)}
  <path d="${face}" fill="${p.skin}" stroke="${p.skinLine}" stroke-width="2"/>
  <g clip-path="url(#${p.id('face')})">
    <path d="${hairShadow(look.hair)}" fill="${p.skinShade}" transform="translate(4 9)"/>
  </g>
  ${marksUnder(look.marks, p)}
  ${eyes(look.eyes, p, opts.blink)}
  ${brows(look.brows, p)}
  ${nose(p)}
  ${mouth(look.mouth, opts.talk ?? 0)}
  ${marksOver(look.marks, p)}
  ${accessories(nonNeck, 'under', p)}
  ${hairFront(look.hair, p)}
  ${outfitHead(look.outfit, look.outfitColor, p)}
  ${accessories(nonNeck, 'over', p)}
</svg>`;
}
