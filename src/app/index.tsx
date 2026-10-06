import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { loadDraft } from '@/lib/draft';
import { supabase } from '@/lib/supabase';

type Target = '/explore' | '/start' | '/(tabs)';

/**
 * Punto de entrada: decide a dónde va cada persona.
 *  - sin sesión → explorar personajes (sin pedir cuenta)
 *  - con sesión y un personaje creado antes de entrar → /start (se guarda y empieza la historia)
 *  - con historias → lista de historias · sin historias → explorar
 */
export default function Index() {
  const { session } = useAuth();
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!session) return setTarget('/explore');
      const draft = await loadDraft();
      if (draft?.ready) return alive && setTarget('/start');
      const { count } = await supabase.from('avatars').select('id', { count: 'exact', head: true });
      if (alive) setTarget((count ?? 0) > 0 ? '/(tabs)' : '/explore');
    })();
    return () => {
      alive = false;
    };
  }, [session]);

  if (!target) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <Redirect href={target} />;
}
