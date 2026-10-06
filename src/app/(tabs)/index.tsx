import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { type ComponentProps, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAvatar } from '@/components/AnimatedAvatar';
import { Logo } from '@/components/Logo';
import { Text } from '@/components/Themed';
import { Button, EmptyState, Menu, Muted, Title } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { type AvatarThread, deleteAvatar } from '@/lib/data';
import { showDialog } from '@/lib/dialog';
import { useI18n } from '@/lib/i18n';
import { useThreads } from '@/lib/threads';

type IconName = ComponentProps<typeof Ionicons>['name'];

const when = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

/** Acceso rápido (tarjeta con icono en un cuadro de color suave). */
function QuickAction({ icon, tint, bg, title, hint, onPress, width }: { icon: IconName; tint: string; bg: string; title: string; hint: string; onPress: () => void; width: number }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="rounded-xl border border-line bg-paper p-3.5 active:bg-subtle"
      style={{ width, cursor: 'pointer' } as object}
    >
      <View className="h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: bg }}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text className="mt-3 font-semibold text-[14px] tracking-tight text-ink" numberOfLines={1}>
        {title}
      </Text>
      <Text className="mt-0.5 text-[12px] leading-[17px] text-muted" numberOfLines={2}>
        {hint}
      </Text>
    </Pressable>
  );
}

/** INICIO: saludo, accesos rápidos y tus historias recientes (tabla en escritorio, lista en móvil). */
export default function HomeScreen() {
  const { t } = useI18n();
  const { profile, session } = useAuth();
  const { threads, loaded, failed, refresh } = useThreads();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const wide = width >= 900;
  const maxW = 1040;
  const inner = Math.min(width - (wide ? 248 : 0), maxW) - (wide ? 64 : 32);
  const cols = inner >= 760 ? 4 : 2;
  const cardW = (inner - (cols - 1) * 12) / cols;

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const hour = new Date().getHours();
  const greet = hour < 12 ? t('home.morning') : hour < 20 ? t('home.afternoon') : t('home.evening');
  const name = profile?.display_name || session?.user.email?.split('@')[0] || '';

  const newCharacter = () => {
    if (!profile?.is_pro && threads.length >= 1) {
      showDialog(t('create.limitReached'), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('pro.cta'), onPress: () => router.push('/pro') },
      ]);
      return;
    }
    router.push('/avatar/create');
  };

  const open = (a: AvatarThread) => router.push({ pathname: '/chat/[avatarId]', params: { avatarId: a.id } });
  const confirmDelete = (a: AvatarThread) =>
    showDialog(t('chats.deleteConfirm', { name: a.name }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('chats.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteAvatar(a.id);
          refresh();
        },
      },
    ]);

  const preview = (a: AvatarThread) => {
    if (!a.last_content && a.last_kind !== 'voice') return t('chats.startHint');
    const text = a.last_kind === 'voice' ? t('chats.voice') : (a.last_content ?? '').replace(/\*[^*]*\*/g, '').replace(/\s+/g, ' ').trim();
    return a.last_role === 'user' ? `${t('export.you')}: ${text}` : text;
  };

  const last = threads[0];

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      {!wide ? (
        <View className="h-14 flex-row items-center justify-between border-b border-line px-4">
          <Logo size={24} withName />
          <Button size="sm" title={t('nav.new')} icon="add" onPress={newCharacter} />
        </View>
      ) : null}
      <ScrollView
        contentContainerClassName="pb-16"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View className="w-full self-center" style={{ maxWidth: maxW, paddingHorizontal: wide ? 32 : 16 }}>
          <View className="pb-6 pt-8">
            <Title className="text-[26px] leading-[32px] tracking-tightest">
              {greet}
              {name ? `, ${name}` : ''}
            </Title>
            <Muted className="mt-1">{t('home.subtitle')}</Muted>
          </View>

          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            <QuickAction width={cardW} icon="sparkles-outline" tint={colors.primaryDeep} bg={colors.primarySoft} title={t('home.create')} hint={t('home.createHint')} onPress={newCharacter} />
            <QuickAction width={cardW} icon="compass-outline" tint="#9C4A62" bg={colors.accentSoft} title={t('home.explore')} hint={t('home.exploreHint')} onPress={() => router.push('/explore')} />
            {last ? (
              <QuickAction width={cardW} icon="chatbubble-ellipses-outline" tint="#2F7A4F" bg="#E3F2E9" title={t('home.continue')} hint={t('home.continueHint', { name: last.name })} onPress={() => open(last)} />
            ) : null}
            {!profile?.is_pro ? <QuickAction width={cardW} icon="diamond-outline" tint="#8A6420" bg="#F6EDD8" title={t('home.upgrade')} hint={t('home.upgradeHint')} onPress={() => router.push('/pro')} /> : null}
          </View>

          <Text className="mb-2 mt-10 font-semibold text-[15px] tracking-tight text-ink">{t('home.recent')}</Text>
          {!loaded ? (
            <View className="py-16">
              <ActivityIndicator color={colors.muted} />
            </View>
          ) : failed && !threads.length ? (
            <EmptyState icon="cloud-offline-outline" title={t('common.error')} action={<Button size="sm" variant="secondary" title={t('common.retry')} onPress={refresh} />} />
          ) : !threads.length ? (
            <View className="rounded-xl border border-dashed border-line">
              <EmptyState icon="chatbubbles-outline" title={t('chats.empty')} text={t('home.createHint')} action={<Button size="sm" title={t('nav.new')} icon="add" onPress={newCharacter} />} />
            </View>
          ) : (
            <View className="overflow-hidden rounded-xl border border-line">
              {wide ? (
                <View className="h-9 flex-row items-center border-b border-line bg-cream px-4">
                  <Text className="w-[220px] font-medium text-[12px] text-muted">{t('home.colName')}</Text>
                  <Text className="flex-1 font-medium text-[12px] text-muted">{t('home.colLast')}</Text>
                  <Text className="w-[90px] text-right font-medium text-[12px] text-muted">{t('home.colWhen')}</Text>
                  <View className="w-10" />
                </View>
              ) : null}
              {threads.map((a, i) => (
                <Pressable
                  key={a.id}
                  onPress={() => open(a)}
                  onLongPress={() => confirmDelete(a)}
                  accessibilityRole="button"
                  accessibilityLabel={a.name}
                  className={`flex-row items-center px-4 py-2.5 active:bg-subtle ${i < threads.length - 1 ? 'border-b border-line' : ''}`}
                  style={{ cursor: 'pointer' } as object}
                >
                  {wide ? (
                    <>
                      <View className="w-[220px] flex-row items-center pr-3">
                        <AnimatedAvatar avatar={a} size={32} />
                        <Text className="ml-3 flex-1 font-semibold text-[14px] text-ink" numberOfLines={1}>
                          {a.name}
                        </Text>
                      </View>
                      <Text className="flex-1 pr-3 text-[13px] text-muted" numberOfLines={1}>
                        {preview(a)}
                      </Text>
                      <Text className="w-[90px] text-right text-[12px] text-muted">{when(a.last_message_at ?? a.created_at)}</Text>
                    </>
                  ) : (
                    <>
                      <AnimatedAvatar avatar={a} size={44} />
                      <View className="ml-3 flex-1">
                        <View className="flex-row items-baseline justify-between">
                          <Text className="mr-3 flex-1 font-semibold text-[15px] tracking-tight text-ink" numberOfLines={1}>
                            {a.name}
                          </Text>
                          <Text className="text-[12px] text-muted">{when(a.last_message_at ?? a.created_at)}</Text>
                        </View>
                        <Text className="mt-0.5 text-[13px] text-muted" numberOfLines={1}>
                          {preview(a)}
                        </Text>
                      </View>
                    </>
                  )}
                  <View className="ml-1 w-10 items-end">
                    <Menu
                      label={t('chats.delete')}
                      items={[
                        { label: t('home.continue'), icon: 'chatbubble-outline', onPress: () => open(a) },
                        { label: t('chats.delete'), icon: 'trash-outline', danger: true, onPress: () => confirmDelete(a) },
                      ]}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
