/**
 * Paleta del avatar 2D con nombres legibles (para la visión de Claude y los
 * prompts de Leonardo). Mantener en el MISMO orden que src/lib/avatarGeometry.ts.
 */
export const SKIN = {
  very_light: '#FCEAE0',
  light: '#F7D9C6',
  medium_light: '#EFC3A4',
  medium: '#D69E78',
  medium_dark: '#A8704B',
  dark: '#7A4A2E',
} as const;

export const HAIR = {
  dark_brown: '#2A1D24',
  brown: '#5A3A2E',
  auburn: '#5A2A2E',
  blonde: '#D9B26F',
  red: '#B8452F',
  gray: '#B9B6C2',
  black: '#15121A',
} as const;

export const EYES = { brown: '#6B3F2A', green: '#4F8A5B', blue: '#4F78B5', hazel: '#8A6A3A', rose: '#C2366B' } as const;

export const OUTFIT = {
  black: '#1E1B22',
  cream: '#F4EDE4',
  rose: '#E7B7B3',
  blue: '#A9C0D9',
  sage: '#B9CDB4',
  purple: '#6B4E8C',
} as const;

export const HAIR_STYLES = ['side', 'long', 'bob', 'curly', 'bun', 'short', 'buzz'] as const;

/** Busca el nombre legible de un color hex (para prompts de imagen). */
export function nameOf<T extends Record<string, string>>(map: T, hex: unknown, fallback: keyof T): string {
  const hit = Object.entries(map).find(([, v]) => typeof hex === 'string' && v.toLowerCase() === hex.toLowerCase());
  return String(hit ? hit[0] : fallback).replace(/_/g, ' ');
}
