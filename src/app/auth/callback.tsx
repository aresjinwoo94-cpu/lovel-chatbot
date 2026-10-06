import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { colors } from '@/constants/theme';
import { authErrorFromUrl, completeAuthFromUrl } from '@/lib/auth';
import { showDialog } from '@/lib/dialog';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

/**
 * Retorno de Google OAuth y de los enlaces del correo (confirmación / nueva contraseña).
 * Espera a tener sesión ANTES de seguir (antes se redirigía al login demasiado pronto)
 * y muestra el error si Google o Supabase devolvieron uno.
 */
export default function AuthCallback() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ code?: string; next?: string }>();

  useEffect(() => {
    (async () => {
      let problem: string | null = null;
      try {
        if (Platform.OS === 'web') {
          problem = authErrorFromUrl(window.location.href);
          // supabase-js procesa ?code= al iniciar (detectSessionInUrl); getSession espera a que termine.
          const { data } = await supabase.auth.getSession();
          if (!data.session && !problem && params.code) {
            const { error } = await supabase.auth.exchangeCodeForSession(params.code);
            if (error) problem = error.message;
          }
        } else if (params.code) {
          await completeAuthFromUrl(Linking.createURL('auth/callback', { queryParams: { code: params.code } }));
        }
      } catch (e) {
        // Si el código ya se usó (p. ej. lo procesó openAuthSessionAsync) y hay sesión, seguimos.
        const { data } = await supabase.auth.getSession();
        if (!data.session) problem = e instanceof Error ? e.message : String(e);
      }
      if (problem) showDialog(t('common.error'), problem);
      if (params.next === 'password') router.replace({ pathname: '/(tabs)/settings', params: { password: '1' } });
      else router.replace('/');
    })();
  }, [params.code, params.next, t]);

  return (
    <View className="flex-1 items-center justify-center bg-paper">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
