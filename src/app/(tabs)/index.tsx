import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAvatar } from '@/components/AnimatedAvatar';
import { Button, Muted, Title } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { deleteAvatar, fetchAvatarThreads, type AvatarThread } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { Text } from '@/components/Themed';
import { showDialog } from '@/lib/dialog';

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

  const load = useCallback(async () => {
    try {
      setThreads(await fetchAvatarThreads());
    } catch (e) {
      showDialog(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setLoaded(true);
    }
  }, [t]);

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
      <View className="w-full flex-row items-center justify-between self-center px-5 pb-3 pt-2" style={{ maxWidth: 760 }}>
        <Title className="text-3xl">{t('chats.title')}</Title>
        <Pressable onPress={newAvatar} hitSlop={10} accessibilityLabel={t('chats.new')} className="h-11 w-11 items-center justify-center rounded-full bg-primary">
          <Ionicons name="add" size={24} color={colors.paper} />
        </Pressable>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ width: '100%', maxWidth: 760, alignSelf: 'center' }}
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
        ItemSeparatorComponent={() => <View className="ml-[88px] h-px bg-line" />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/chat/[avatarId]', params: { avatarId: item.id } })}
            onLongPress={() => confirmDelete(item)}
            className="flex-row items-center px-5 py-3 active:bg-primary-soft"
          >
            <AnimatedAvatar avatar={item} size={58} animate={false} />
            <View className="ml-4 flex-1">
              <View className="flex-row items-baseline justify-between">
                <Text className="font-serif text-[19px] text-ink" numberOfLines={1}>
                  {item.name}
                </Text>
                <Muted className="text-xs">{when(item.last_message_at ?? item.created_at)}</Muted>
              </View>
              <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
                {preview(item)}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loaded ? (
            <View className="items-center px-10 pt-24">
              <Muted className="text-center text-base">{t('chats.empty')}</Muted>
              <Button title={t('chats.new')} onPress={() => router.push('/explore')} className="mt-5" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
