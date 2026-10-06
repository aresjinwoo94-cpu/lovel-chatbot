/**
 * Tokens de diseño de Lovel House (los mismos que tailwind.config.js) para
 * los lugares donde necesitamos colores o fuentes en JS: SVG, iconos, estilos.
 */
export const colors = {
  /** Fondo general */
  cream: '#F9F7F3',
  /** Relleno neutro (controles, selección secundaria) */
  subtle: '#F2EFEA',
  /** Tarjetas y superficies */
  paper: '#FFFFFF',
  primary: '#6F5BD3',
  primarySoft: '#E9E4FA',
  primaryDeep: '#5A47B8',
  accent: '#E6A0B4',
  accentSoft: '#F8E8ED',
  /** Texto principal y secundario */
  ink: '#242229',
  muted: '#77737D',
  line: '#E8E4DE',
  /** En línea / éxito */
  success: '#69B58A',
} as const;

/** Familias cargadas con expo-font en src/app/_layout.tsx. */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

/**
 * Lado de las burbujas: como en cualquier chat, lo que escribes va a la
 * derecha y el personaje te responde desde la izquierda, con su foto al lado.
 */
export const BUBBLE_SIDE: Record<'user' | 'avatar', 'left' | 'right'> = {
  user: 'right',
  avatar: 'left',
};
