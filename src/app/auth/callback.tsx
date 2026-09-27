import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { colors } from '@/constants/theme';
import { completeAuthFromUrl } from '@/lib/auth';

/**
 * Retorno de Google OAuth y de los enlaces del correo (confirmación / nueva contraseña).
 * Intercambia el código PKCE por una sesión y continúa.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; next?: string }>();

  useEffect(() => {
    (async () => {
      try {
        // En web, supabase-js ya procesa ?code= solo (detectSessionInUrl).
        if (Platform.OS !== 'web' && params.code) {
          await completeAuthFromUrl(Linking.createURL('auth/callback', { queryParams: { code: params.code } }));
        }
      } catch {
        // Si el código ya se usó (p. ej. lo procesó openAuthSessionAsync) seguimos igual.
      }
      if (params.next === 'password') router.replace({ pathname: '/(tabs)/settings', params: { password: '1' } });
      else router.replace('/');
    })();
  }, [params.code, params.next]);

  return (
    <View className="flex-1 items-center justify-center bg-cream">
      <ActivityIndicator color={colors.roseDeep} />
    </View>
  );
}
