/**
 * Paleta del avatar 2D con nombres legibles (para la visión de Claude y los
 * prompts de Leonardo). Mantener en el MISMO orden que src/lib/avatarGeometry.ts.
 */
export const SKIN = {
  very_light: '#FBE3D3',
  light: '#F5D0B5',
  medium_light: '#E8B894',
  medium: '#C98E66',
  medium_dark: '#A86B45',
  dark: '#7A4A2E',
} as const;

export const HAIR = {
  dark_brown: '#3B2A25',
  brown: '#6B4431',
  auburn: '#A56B43',
  blonde: '#D9B26F',
  red: '#B8452F',
  gray: '#9A9A9A',
  black: '#1E1B1D',
} as const;

export const EYES = { brown: '#3B2A25', green: '#5B7F5A', blue: '#4F6F95', hazel: '#7A5A3A' } as const;

export const OUTFIT = {
  cream: '#F4EDE4',
  rose: '#E7B7B3',
  blue: '#A9C0D9',
  sage: '#B9CDB4',
  black: '#2E2A2B',
  mustard: '#E9D29B',
} as const;

export const HAIR_STYLES = ['long', 'bob', 'curly', 'bun', 'short', 'buzz'] as const;

/** Busca el nombre legible de un color hex (para prompts de imagen). */
export function nameOf<T extends Record<string, string>>(map: T, hex: unknown, fallback: keyof T): string {
  const hit = Object.entries(map).find(([, v]) => typeof hex === 'string' && v.toLowerCase() === hex.toLowerCase());
  return String(hit ? hit[0] : fallback).replace(/_/g, ' ');
}
