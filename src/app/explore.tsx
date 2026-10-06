import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Text } from '@/components/Themed';
import { Button, Display, Muted, Segmented } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { PRESETS } from '@/lib/character/catalog';
import { presetPortrait } from '@/lib/character/media';
import { useI18n } from '@/lib/i18n';
import { traitById } from '@/lib/roleplay';

type Filter = 'all' | 'female' | 'male';

/**
 * Explorar: la puerta de entrada. Sin cuenta: eliges un personaje listo o
 * creas el tuyo; la cuenta solo se pide al empezar la historia.
 */
export default function ExploreScreen() {
  const { t, language } = useI18n();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<Filter>('all');
  const maxW = 1080;
  const content = Math.min(width, maxW) - 32;
  const cols = content >= 900 ? 5 : content >= 640 ? 4 : content >= 420 ? 3 : 2;
  const gap = 12;
  const card = (content - (cols - 1) * gap) / cols;
  const list = PRESETS.filter((p) => filter === 'all' || p.gender === filter);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="border-b border-line bg-cream">
        <View className="h-14 w-full flex-row items-center justify-between self-center px-4" style={{ maxWidth: maxW }}>
          <Logo size={26} withName />
          <Button size="sm" variant="secondary" title={session ? t('explore.myStories') : t('login.signIn')} onPress={() => router.push(session ? '/(tabs)' : '/login')} />
        </View>
      </View>
      <ScrollView contentContainerClassName="pb-16" showsVerticalScrollIndicator={false}>
        <View className="w-full self-center px-4" style={{ maxWidth: maxW }}>
          <View className="pb-6 pt-8" style={{ maxWidth: 620 }}>
            <Display>{t('explore.title')}</Display>
            <Muted className="mt-2.5 text-[15px] leading-[22px]">{t('explore.subtitle')}</Muted>
            <View className="mt-5 flex-row">
              <Button title={t('explore.createOwn')} icon="add" onPress={() => router.push('/avatar/create')} />
            </View>
          </View>

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-semibold text-[16px] tracking-tight text-ink">{t('explore.characters')}</Text>
            <View style={{ width: 240 }}>
              <Segmented<Filter>
                value={filter}
                onChange={setFilter}
                options={[
                  { id: 'all', label: t('explore.all') },
                  { id: 'female', label: t('explore.female') },
                  { id: 'male', label: t('explore.male') },
                ]}
              />
            </View>
          </View>

          <View className="flex-row flex-wrap" style={{ gap }}>
            {list.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push({ pathname: '/avatar/create', params: { preset: p.id } })}
                accessibilityRole="button"
                accessibilityLabel={p.name}
                style={{ width: card }}
                className="active:opacity-90"
              >
                <View className="overflow-hidden rounded-2xl border border-line bg-subtle">
                  <Image source={presetPortrait(p.id)} style={{ width: card - 2, height: (card - 2) * 1.25 }} contentFit="cover" transition={200} />
                </View>
                <View className="px-0.5 pt-2.5">
                  <Text className="font-semibold text-[15px] tracking-tight text-ink">{p.name}</Text>
                  <Text className="mt-0.5 text-[13px] leading-[18px] text-muted" numberOfLines={2}>
                    {p.traits.map((id) => traitById(id)?.label[language]).filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
