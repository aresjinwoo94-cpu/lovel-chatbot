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

function readWebPref(): ThemePref {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

interface ThemeState {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  scheme: Scheme;
  colors: Palette;
  /** Preferencia guardada ya leída (la raíz espera a esto para quitar el splash). */
  loaded: boolean;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // En web, AsyncStorage es localStorage: se lee al instante (sin parpadeo del tema).
  const [pref, setPrefState] = useState<ThemePref>(() => (Platform.OS === 'web' ? readWebPref() : 'system'));
  const [loaded, setLoaded] = useState(Platform.OS === 'web');
  const system = useColorScheme();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') {
          setPrefState(v);
          // teclado, alertas y selectores del sistema también siguen la elección guardada
          Appearance.setColorScheme(v === 'system' ? 'unspecified' : v);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
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

  const value = useMemo(() => ({ pref, setPref, scheme, colors: PALETTES[scheme], loaded }), [pref, setPref, scheme, loaded]);
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
