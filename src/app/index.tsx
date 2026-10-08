import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { loadDraft } from '@/lib/draft';
import { supabase } from '@/lib/supabase';

type Target = '/welcome' | '/start' | '/(tabs)' | { pathname: '/chat/[avatarId]'; params: { avatarId: string } };

/**
 * Punto de entrada: decide a dónde va cada persona.
 *  - sin sesión → bienvenida (cuestionario que lleva directo al chat, sin cuenta)
 *  - con sesión y un personaje creado antes de entrar → /start (se guarda y empieza la historia)
 *  - invitado con historia → su chat · con historias → inicio · sin historias → bienvenida
 */
export default function Index() {
  const { session, isGuest } = useAuth();
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!session) return setTarget('/welcome');
      const draft = await loadDraft();
      if (draft?.ready) return alive && setTarget('/start');
      const { data } = await supabase.from('avatars').select('id').order('last_message_at', { ascending: false, nullsFirst: false }).limit(1);
      const first = data?.[0]?.id as string | undefined;
      if (!alive) return;
      if (!first) setTarget('/welcome');
      else if (isGuest) setTarget({ pathname: '/chat/[avatarId]', params: { avatarId: first } });
      else setTarget('/(tabs)');
    })();
    return () => {
      alive = false;
    };
  }, [session, isGuest]);

  if (!target) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <Redirect href={target} />;
}
