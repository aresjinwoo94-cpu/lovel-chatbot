import '@/global.css';
import '@/lib/nativewindInterop';
// EAS Observe: se configura antes de que se monte ninguna pantalla.
import '@/lib/observe';

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { ObserveRoot } from 'expo-observe';
import { DarkTheme, DefaultTheme, type Href, router, Stack, ThemeProvider as NavThemeProvider, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppCrashFallback } from '@/components/AppCrashFallback';
import { PerfPanel } from '@/components/PerfPanel';
import { StageProvider } from '@/components/StageHost';
import { AgeGateProvider, useAgeGate } from '@/lib/ageGate';
import { startAnalytics, trackScreen } from '@/lib/analytics';
import { AuthProvider, useAuth } from '@/lib/auth';
import { DialogHost } from '@/lib/dialog';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider, useTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

/**
 * Navegación raíz.
 *  - Públicas: bienvenida (cuestionario), explorar y crear/personalizar (no hace falta cuenta).
 *  - Sin sesión o como invitado: login (crear cuenta conserva lo del invitado).
 *  - Con sesión: historias, chat, Pro y "start" (guarda el personaje creado antes del login).
 *  - Puerta 18+: hasta confirmar la mayoría de edad solo existen la puerta y las páginas
 *    legales; cualquier otra ruta (incluido un enlace directo) acaba en la puerta.
 */
function RootNavigator() {
  const { session, loading, isGuest } = useAuth();
  const { status: age, takeResume } = useAgeGate();
  const { colors, scheme, loaded: themeLoaded } = useTheme();
  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.cream, card: colors.paper, text: colors.ink, border: colors.line, primary: colors.primary } };
  }, [scheme, colors]);
  const adult = age === 'adult';

  // Analítica del panel privado: pantalla por patrón de ruta (sin ids: /chat/[avatarId]).
  const segments = useSegments();
  const route = `/${segments.filter((x) => !x.startsWith('(')).join('/')}`;
  useEffect(() => startAnalytics(), []);
  useEffect(() => trackScreen(route), [route]);

  // Quien llegó por un enlace (p. ej. restablecer contraseña o un chat) sigue ahí tras la puerta.
  useEffect(() => {
    if (!adult) return;
    const href = takeResume();
    if (href) router.replace(href as Href);
  }, [adult, takeResume]);
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const ready = !loading && age !== 'loading' && themeLoaded && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <NavThemeProvider value={navTheme}>
      {/* Escenario 3D único y persistente (chat y creador lo colocan en su hueco). */}
      <StageProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
        {/* Primera pantalla disponible mientras no se haya confirmado la edad. */}
        <Stack.Protected guard={!adult}>
          <Stack.Screen name="age-gate" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={adult}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="explore" options={{ animation: 'fade' }} />
          <Stack.Screen name="avatar/create" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="auth/callback" />
          {/* Invitados (sesión anónima) también pueden abrir el login para crear su cuenta. */}
          <Stack.Protected guard={!session || isGuest}>
            <Stack.Screen name="login" options={{ animation: 'fade' }} />
          </Stack.Protected>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="start" options={{ animation: 'fade' }} />
            <Stack.Screen name="chat/[avatarId]" />
            <Stack.Screen name="pro" options={{ presentation: 'modal' }} />
            {/* Panel privado del responsable (la función admin-stats comprueba la cuenta). */}
            <Stack.Screen name="admin" />
          </Stack.Protected>
        </Stack.Protected>
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
      </Stack>
      </StageProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <DialogHost />
      <PerfPanel />
    </NavThemeProvider>
  );
}

/**
 * ObserveRoot (EAS Observe) mide el tiempo hasta el primer render y, con su pantalla de error,
 * registra los fallos de render con la pila de componentes. Cada pantalla de entrada marca cuándo
 * está lista con useMarkInteractive() (src/lib/observe.ts).
 */
export default function RootLayout() {
  return (
    <ObserveRoot errorBoundaryFallback={(p) => <AppCrashFallback {...p} />}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <I18nProvider>
              <AuthProvider>
                <AgeGateProvider>
                  <RootNavigator />
                </AgeGateProvider>
              </AuthProvider>
            </I18nProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ObserveRoot>
  );
}
