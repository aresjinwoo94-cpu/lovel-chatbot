import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAvatar } from '@/components/AnimatedAvatar';
import { Text } from '@/components/Themed';
import { Button, Muted } from '@/components/ui';
import { colors } from '@/constants/theme';
import { createFromDraft, isAvatarLimit } from '@/lib/createCharacter';
import { showDialog } from '@/lib/dialog';
import { type CharacterDraft, clearDraft, loadDraft } from '@/lib/draft';
import { useI18n } from '@/lib/i18n';

/**
 * Justo después de iniciar sesión: guarda el personaje que se creó sin cuenta
 * y abre el chat, donde el personaje escribe el primer mensaje.
 */
export default function StartScreen() {
  const { t } = useI18n();
  const [draft, setDraft] = useState<CharacterDraft | null>(null);
  const [limit, setLimit] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const d = await loadDraft();
      if (!d?.ready) return router.replace('/');
      setDraft(d);
      try {
        const avatar = await createFromDraft(d);
        await clearDraft();
        router.replace({ pathname: '/chat/[avatarId]', params: { avatarId: avatar.id } });
      } catch (e) {
        if (isAvatarLimit(e)) {
          await clearDraft();
          setLimit(true);
        } else {
          showDialog(t('common.error'), e instanceof Error ? e.message : String(e), [
            { text: t('common.retry'), onPress: () => router.replace('/start') },
            { text: t('common.back'), style: 'cancel', onPress: () => router.replace('/avatar/create') },
          ]);
        }
      }
    })();
  }, [t]);

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-cream px-8">
      {draft ? <AnimatedAvatar avatar={{ appearance: draft.look, gender: draft.gender, avatar_image_url: draft.snapshot }} size={96} presence={limit ? 'idle' : 'thinking'} /> : null}
      {limit ? (
        <View className="mt-6 w-full max-w-sm items-center">
          <Text className="text-center font-semibold text-[22px] leading-[28px] tracking-tighter text-ink">{t('start.limit')}</Text>
          <Muted className="mt-2 text-center">{t('create.limitReached')}</Muted>
          <Button title={t('pro.cta')} onPress={() => router.replace('/pro')} className="mt-6 w-full" />
          <Button title={t('start.goToStories')} variant="secondary" onPress={() => router.replace('/(tabs)')} className="mt-3 w-full" />
        </View>
      ) : (
        <View className="mt-6 items-center">
          <ActivityIndicator color={colors.primary} />
          {draft ? <Muted className="mt-3 text-center">{t('start.preparing', { name: draft.name })}</Muted> : null}
        </View>
      )}
    </SafeAreaView>
  );
}
