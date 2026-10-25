/**
 * Tokens de diseño de Lovel House en claro y oscuro (los mismos que tailwind.config.js,
 * que los lee como variables CSS: --c-<token>). Contraste mínimo WCAG AA en ambos temas
 * para texto normal (ink y muted sobre cream/paper/subtle).
 */
import { cssVarsDark, cssVarsLight, dark, light, type Palette } from './palettes';

export type { Palette };
export type Scheme = 'light' | 'dark';

export const PALETTES: Record<Scheme, Palette> = { light, dark };

let current: Scheme = 'light';
/** Lo actualiza ThemeProvider (src/lib/theme.tsx). */
export function setActiveScheme(s: Scheme) {
  current = s;
}
export const activeScheme = () => current;

/**
 * Colores para JS (iconos, SVG, estilos en línea) del tema activo. Cada lectura
 * devuelve el valor del tema actual; en componentes, mejor `useColors()` para que
 * se repinten al cambiar de tema.
 */
export const colors: Palette = Object.defineProperties(
  {} as Palette,
  Object.fromEntries(Object.keys(light).map((k) => [k, { enumerable: true, get: () => PALETTES[current][k as keyof Palette] }])),
);

/** Variables CSS (--c-ink: "36 34 41"…) de un tema. */
export const cssVars = (sch: Scheme): Record<string, string> => (sch === 'dark' ? cssVarsDark : cssVarsLight);

/** Familias cargadas con expo-font en src/app/_layout.tsx. */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

/**
 * Lado de las burbujas: como en cualquier chat, lo que escribes va a la
 * derecha y el personaje te responde desde la izquierda, con su foto al lado.
 */
export const BUBBLE_SIDE: Record<'user' | 'avatar', 'left' | 'right'> = {
  user: 'right',
  avatar: 'left',
};
