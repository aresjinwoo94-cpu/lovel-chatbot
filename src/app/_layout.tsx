import '@/global.css';
import '@/lib/nativewindInterop';

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, type Href, router, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AgeGateProvider, useAgeGate } from '@/lib/ageGate';
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
    PlusJakartaSans_800ExtraBold,
  });
  const ready = !loading && age !== 'loading' && themeLoaded && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <NavThemeProvider value={navTheme}>
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
          </Stack.Protected>
        </Stack.Protected>
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <DialogHost />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
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
  );
}
