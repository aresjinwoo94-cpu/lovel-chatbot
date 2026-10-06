import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Field, ListRow, Muted, SectionLabel, Title } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { FREE_TEXT_LIMIT, FREE_VOICE_LIMIT, openBillingPortal } from '@/lib/billing';
import { countUserMessages, updateProfile } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/Themed';
import { showDialog } from '@/lib/dialog';

/** Perfil del usuario: nombre, plan, estadísticas y cerrar sesión. */
export default function ProfileScreen() {
  const { t } = useI18n();
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ avatars: 0, messages: 0 });

  const [seenName, setSeenName] = useState(profile?.display_name);
  if (profile?.display_name !== seenName) {
    setSeenName(profile?.display_name);
    setName(profile?.display_name ?? '');
  }

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      (async () => {
        const [{ count }, messages] = await Promise.all([
          supabase.from('avatars').select('id', { count: 'exact', head: true }),
          countUserMessages(),
        ]);
        setStats({ avatars: count ?? 0, messages });
      })();
    }, [refreshProfile]),
  );

  const save = async () => {
    try {
      await updateProfile({ display_name: name.trim() });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      showDialog(t('common.error'), String(e));
    }
  };

  const email = session?.user.email ?? '';
  const initial = (name || email || '?').trim().charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <ScrollView contentContainerClassName="w-full max-w-[640px] self-center px-4 pb-12">
        <Title className="pb-1 pt-4 text-[24px] leading-[30px]">{t('profile.title')}</Title>

        <View className="mt-4 flex-row items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
            <Text className="font-semibold text-[22px] text-primary-deep">{initial}</Text>
          </View>
          <View className="ml-3.5 flex-1">
            <Text className="font-semibold text-[17px] tracking-tight text-ink" numberOfLines={1}>
              {name || email.split('@')[0]}
            </Text>
            <Muted className="text-[13px]" numberOfLines={1}>
              {email}
            </Muted>
          </View>
        </View>
        <View className="mt-4 flex-row gap-2">
          <Stat label={t('profile.statCharacters')} value={stats.avatars} />
          <Stat label={t('profile.statMessages')} value={stats.messages} />
          {profile ? <Stat label={t('profile.statSince')} value={new Date(profile.created_at).toLocaleDateString([], { month: 'short', year: 'numeric' })} /> : null}
        </View>

        <SectionLabel>{t('profile.name')}</SectionLabel>
        <View className="flex-row items-start">
          <View className="flex-1">
            <Field value={name} onChangeText={setName} placeholder={t('profile.name')} maxLength={40} />
          </View>
          <Button title={saved ? t('common.saved') : t('common.save')} variant="secondary" onPress={save} disabled={name.trim() === (profile?.display_name ?? '')} className="ml-2" />
        </View>

        <SectionLabel>{t('profile.plan')}</SectionLabel>
        <Card className="p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-[16px] tracking-tight text-ink">{profile?.is_pro ? t('profile.pro') : t('profile.free')}</Text>
            {profile?.is_pro ? (
              <View className="rounded-full bg-primary-soft px-2.5 py-1">
                <Text className="font-semibold text-[12px] text-primary-deep">{t('pro.active')}</Text>
              </View>
            ) : null}
          </View>
          {profile && !profile.is_pro ? (
            <View className="mt-3 gap-3">
              <Usage label={t('profile.usageText')} used={profile.free_messages_used ?? 0} max={FREE_TEXT_LIMIT} />
              <Usage label={t('profile.usageVoice')} used={profile.free_voice_used ?? 0} max={FREE_VOICE_LIMIT} />
            </View>
          ) : null}
          {profile?.is_pro && profile.current_period_end ? (
            <Muted className="mt-1 text-[13px]">{t('profile.renews', { date: new Date(profile.current_period_end).toLocaleDateString() })}</Muted>
          ) : null}
          {profile?.is_pro ? (
            <Button
              title={t('pro.manage')}
              variant="secondary"
              size="sm"
              onPress={() => openBillingPortal().then(refreshProfile).catch((e) => showDialog(t('common.error'), String(e)))}
              className="mt-4 self-start"
            />
          ) : (
            <Button title={t('profile.upgrade')} variant="brand" size="sm" onPress={() => router.push('/pro')} className="mt-4 self-start" />
          )}
        </Card>

        <Card className="mt-6">
          <ListRow icon="log-out-outline" label={t('profile.signOut')} onPress={() => signOut()} last />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-1 rounded-xl border border-line bg-paper px-3 py-2.5">
      <Text className="font-semibold text-[17px] tracking-tight text-ink" numberOfLines={1}>
        {value}
      </Text>
      <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Usage({ label, used, max }: { label: string; used: number; max: number }) {
  const n = Math.min(used, max);
  return (
    <View>
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-ink">{label}</Text>
        <Text className="text-[13px] text-muted" style={{ fontVariant: ['tabular-nums'] }}>
          {n} / {max}
        </Text>
      </View>
      <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-subtle">
        <View className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, backgroundColor: n >= max ? colors.accent : colors.primary }} />
      </View>
    </View>
  );
}
