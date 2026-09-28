/**
 * Paleta de personalización de los avatares VRM, con nombres legibles para la
 * visión de la IA. Mantener en el MISMO orden que src/lib/avatarOptions.ts.
 */
export const HAIR = {
  auburn: '#5A2A2E',
  black: '#15121A',
  dark_brown: '#2A1D24',
  brown: '#5A3A2E',
  blonde: '#D9B26F',
  red: '#B8452F',
  gray: '#B9B6C2',
  pink: '#E79AB8',
  blue: '#4A6FB5',
} as const;

export const EYES = { rose: '#C2366B', brown: '#6B3F2A', green: '#4F8A5B', blue: '#4F78B5', hazel: '#8A6A3A', violet: '#8E5BC8' } as const;

export const SKIN = {
  very_light: '#FCEAE0',
  light: '#F7D9C6',
  medium_light: '#EFC3A4',
  medium: '#D69E78',
  medium_dark: '#A8704B',
  dark: '#7A4A2E',
} as const;

export const OUTFIT = {
  black: '#1E1B22',
  cream: '#F4EDE4',
  rose: '#E7B7B3',
  blue: '#A9C0D9',
  sage: '#B9CDB4',
  purple: '#6B4E8C',
  wine: '#8C2F3E',
} as const;

/** Busca el nombre legible de un color hex (para prompts de imagen). */
export function nameOf<T extends Record<string, string>>(map: T, hex: unknown, fallback: keyof T): string {
  const hit = Object.entries(map).find(([, v]) => typeof hex === 'string' && v.toLowerCase() === hex.toLowerCase());
  return String(hit ? hit[0] : fallback).replace(/_/g, ' ');
}
