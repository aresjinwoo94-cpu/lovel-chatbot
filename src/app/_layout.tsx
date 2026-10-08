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
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { DialogHost } from '@/lib/dialog';
import { I18nProvider } from '@/lib/i18n';

SplashScreen.preventAutoHideAsync();

/**
 * Navegación raíz.
 *  - Públicas: bienvenida (cuestionario), explorar y crear/personalizar (no hace falta cuenta).
 *  - Sin sesión o como invitado: login (crear cuenta conserva lo del invitado).
 *  - Con sesión: historias, chat, Pro y "start" (guarda el personaje creado antes del login).
 */
function RootNavigator() {
  const { session, loading, isGuest } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const ready = !loading && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
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
      </Stack>
      <DialogHost />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
