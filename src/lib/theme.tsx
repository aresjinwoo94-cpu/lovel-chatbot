import AsyncStorage from '@react-native-async-storage/async-storage';
import { vars } from 'nativewind';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme, View } from 'react-native';

import { cssVars, PALETTES, type Palette, type Scheme, setActiveScheme } from '@/constants/theme';

/**
 * Tema claro / oscuro.
 *  - Preferencia "Sistema / Claro / Oscuro" (por defecto Sistema), guardada en el dispositivo.
 *  - Sistema = el tema del teléfono (app.json: userInterfaceStyle "automatic") o, en web,
 *    prefers-color-scheme; cambia en vivo.
 *  - Los colores de Tailwind son variables CSS (--c-*): en web se escriben en <html>, en
 *    móvil se aplican con vars() en la raíz. Para JS (iconos), useColors().
 */
export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'lovel.theme.v1';

interface ThemeState {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  scheme: Scheme;
  colors: Palette;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>('system');
  const system = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v);
      })
      .catch(() => undefined);
  }, []);

  const scheme: Scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  setActiveScheme(scheme);

  // Web: variables en <html> (también las ven los modales y diálogos fuera del árbol).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const root = document.documentElement;
    for (const [k, v] of Object.entries(cssVars(scheme))) root.style.setProperty(k, v);
    root.style.colorScheme = scheme;
    root.style.backgroundColor = PALETTES[scheme].cream;
  }, [scheme]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem(KEY, p).catch(() => undefined);
    // En el móvil, los elementos del sistema (teclado, alertas) siguen la elección.
    if (Platform.OS !== 'web') Appearance.setColorScheme(p === 'system' ? 'unspecified' : p);
  }, []);

  const value = useMemo(() => ({ pref, setPref, scheme, colors: PALETTES[scheme] }), [pref, setPref, scheme]);
  const rootVars = useMemo(() => (Platform.OS === 'web' ? undefined : vars(cssVars(scheme))), [scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1, backgroundColor: PALETTES[scheme].cream }, rootVars]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}

/** Colores del tema activo para JS (iconos, estilos en línea); se repinta al cambiar de tema. */
export const useColors = () => useTheme().colors;
