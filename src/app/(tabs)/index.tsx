import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAvatar } from '@/components/AnimatedAvatar';
import { Text } from '@/components/Themed';
import { Button, EmptyState, IconButton, Title } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { deleteAvatar, fetchAvatarThreads, type AvatarThread } from '@/lib/data';
import { showDialog } from '@/lib/dialog';
import { useI18n } from '@/lib/i18n';

const when = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

/** Tus historias: cada personaje con el último mensaje de vuestra conversación. */
export default function ChatsScreen() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [threads, setThreads] = useState<AvatarThread[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setThreads(await fetchAvatarThreads());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const newAvatar = () => {
    if (!profile?.is_pro && threads.length >= 1) {
      showDialog(t('create.limitReached'), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('pro.cta'), onPress: () => router.push('/pro') },
      ]);
      return;
    }
    router.push('/explore');
  };

  const confirmDelete = (a: AvatarThread) =>
    showDialog(t('chats.deleteConfirm', { name: a.name }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('chats.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteAvatar(a.id);
          load();
        },
      },
    ]);

  const preview = (a: AvatarThread) => {
    if (!a.last_content && a.last_kind !== 'voice') return t('chats.startHint');
    const text = a.last_kind === 'voice' ? t('chats.voice') : (a.last_content ?? '').replace(/\*[^*]*\*/g, '').replace(/\s+/g, ' ').trim();
    return a.last_role === 'user' ? `${t('export.you')}: ${text}` : text;
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="w-full flex-row items-center justify-between self-center px-4 pb-3 pt-4" style={{ maxWidth: 760 }}>
        <Title className="text-[24px] leading-[30px]">{t('chats.title')}</Title>
        <Button size="sm" variant="primary" icon="add" title={t('chats.new')} onPress={newAvatar} />
      </View>

      <FlatList
        data={threads}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 8, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/chat/[avatarId]', params: { avatarId: item.id } })}
            onLongPress={() => confirmDelete(item)}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            className="flex-row items-center rounded-xl px-3 py-2.5 active:bg-subtle"
          >
            <AnimatedAvatar avatar={item} size={48} />
            <View className="ml-3 flex-1">
              <View className="flex-row items-baseline justify-between">
                <Text className="mr-3 flex-1 font-semibold text-[15px] tracking-tight text-ink" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-[12px] text-muted">{when(item.last_message_at ?? item.created_at)}</Text>
              </View>
              <Text className="mt-0.5 text-[14px] text-muted" numberOfLines={1}>
                {preview(item)}
              </Text>
            </View>
            <View className="ml-1 opacity-60">
              <IconButton icon="ellipsis-horizontal" size={32} label={t('chats.delete')} onPress={() => confirmDelete(item)} />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !loaded ? (
            <View className="pt-24">
              <ActivityIndicator color={colors.muted} />
            </View>
          ) : failed ? (
            <EmptyState icon="cloud-offline-outline" title={t('common.error')} action={<Button size="sm" variant="secondary" title={t('common.retry')} onPress={load} />} />
          ) : (
            <EmptyState icon="chatbubbles-outline" title={t('chats.title')} text={t('chats.empty')} action={<Button title={t('chats.new')} icon="add" onPress={() => router.push('/explore')} />} />
          )
        }
      />
    </SafeAreaView>
  );
}
