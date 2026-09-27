import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/**
 * Punto de entrada: decide a dónde va cada persona.
 *  - sin sesión → login
 *  - sin avatares → bienvenida (crear el primero)
 *  - con avatares → lista de chats
 */
export default function Index() {
  const { session } = useAuth();
  const [hasAvatars, setHasAvatars] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('avatars')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setHasAvatars((count ?? 0) > 0));
  }, [session]);

  if (!session) return <Redirect href="/login" />;
  if (hasAvatars === null) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color={colors.roseDeep} />
      </View>
    );
  }
  return <Redirect href={hasAvatars ? '/(tabs)' : '/welcome'} />;
}
