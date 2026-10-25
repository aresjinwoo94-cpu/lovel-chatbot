import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { loadDraft } from '@/lib/draft';
import { supabase } from '@/lib/supabase';
import { perfPhase } from '@/lib/perfMeter';
import { cachedThreads } from '@/lib/threads';
import { useColors } from '@/lib/theme';

type Target = '/welcome' | '/start' | '/(tabs)' | { pathname: '/chat/[avatarId]'; params: { avatarId: string } };

/**
 * Punto de entrada: decide a dónde va cada persona.
 *  - sin sesión → bienvenida (cuestionario que lleva directo al chat, sin cuenta)
 *  - con sesión y un personaje creado antes de entrar → /start (se guarda y empieza la historia)
 *  - invitado con historia → su chat · con historias → inicio · sin historias → bienvenida
 */
export default function Index() {
  const colors = useColors();
  const { session, isGuest } = useAuth();
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!session) return setTarget('/welcome');
      const draft = await loadDraft();
      if (draft?.ready) return alive && setTarget('/start');
      // con la lista guardada de la última vez no hace falta preguntar al servidor
      const cached = await cachedThreads(session.user.id);
      let first = cached?.[0]?.id;
      if (!first) {
        const { data } = await supabase.from('avatars').select('id').order('last_message_at', { ascending: false, nullsFirst: false }).limit(1);
        first = data?.[0]?.id as string | undefined;
      }
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
  perfPhase('ruta decidida');
  return <Redirect href={target} />;
}
