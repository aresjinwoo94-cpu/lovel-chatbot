import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Muted, SectionLabel, Title } from '@/components/ui';
import { colors, serif } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { openBillingPortal } from '@/lib/billing';
import { countUserMessages, updateProfile } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

/** Perfil del usuario: nombre, plan, estadísticas y cerrar sesión. */
export default function ProfileScreen() {
  const { t } = useI18n();
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ avatars: 0, messages: 0 });

  useEffect(() => setName(profile?.display_name ?? ''), [profile?.display_name]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [{ count }, messages] = await Promise.all([
          supabase.from('avatars').select('id', { count: 'exact', head: true }),
          countUserMessages(),
        ]);
        setStats({ avatars: count ?? 0, messages });
      })();
    }, []),
  );

  const save = async () => {
    try {
      await updateProfile({ display_name: name.trim() });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      Alert.alert(t('common.error'), String(e));
    }
  };

  const email = session?.user.email ?? '';
  const initial = (name || email || '?').trim().charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10">
        <Title className="pb-3 pt-2 text-3xl">{t('profile.title')}</Title>

        <View className="items-center py-4">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-blush">
            <Text style={{ fontFamily: serif }} className="text-4xl text-rose-deep">
              {initial}
            </Text>
          </View>
          <Text style={{ fontFamily: serif }} className="mt-3 text-xl text-ink">
            {name || email}
          </Text>
          <Muted>{email}</Muted>
          <Muted className="mt-1">{t('profile.stats', stats)}</Muted>
          {profile ? <Muted className="mt-1 text-xs">{t('profile.since', { date: new Date(profile.created_at).toLocaleDateString() })}</Muted> : null}
        </View>

        <SectionLabel>{t('profile.name')}</SectionLabel>
        <View className="flex-row items-center rounded-2xl border border-line bg-paper pl-4 pr-2">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('profile.name')}
            placeholderTextColor={colors.muted}
            className="h-12 flex-1 text-base text-ink"
            maxLength={40}
          />
          <Button title={saved ? t('common.saved') : t('common.save')} variant="ghost" onPress={save} className="h-10 px-3" />
        </View>

        <SectionLabel>{t('profile.plan')}</SectionLabel>
        <Card>
          <View className="flex-row items-center justify-between">
            <Text style={{ fontFamily: serif }} className="text-lg text-ink">
              {profile?.is_pro ? t('profile.pro') : t('profile.free')}
            </Text>
            {profile?.is_pro ? (
              <View className="rounded-full bg-rose-soft px-3 py-1">
                <Text className="text-xs text-rose-deep">{t('pro.active')}</Text>
              </View>
            ) : null}
          </View>
          {profile?.is_pro && profile.current_period_end ? (
            <Muted className="mt-1">{t('profile.renews', { date: new Date(profile.current_period_end).toLocaleDateString() })}</Muted>
          ) : null}
          {profile?.is_pro ? (
            <Button
              title={t('pro.manage')}
              variant="secondary"
              onPress={() => openBillingPortal().then(refreshProfile).catch((e) => Alert.alert(t('common.error'), String(e)))}
              className="mt-4"
            />
          ) : (
            <Button title={t('profile.upgrade')} onPress={() => router.push('/pro')} className="mt-4" />
          )}
        </Card>

        <Button title={t('profile.signOut')} variant="danger" onPress={signOut} className="mt-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
