import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CharacterPortrait } from '@/components/CharacterPortrait';
import { Logo } from '@/components/Logo';
import { Text } from '@/components/Themed';
import { Muted } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { PRESETS } from '@/lib/character/options';
import { useI18n } from '@/lib/i18n';
import { traitById } from '@/lib/roleplay';

/**
 * Explorar: la puerta de entrada. Sin cuenta, eliges un personaje listo o
 * creas el tuyo; la cuenta solo se pide al empezar la historia.
 */
export default function ExploreScreen() {
  const { t, language } = useI18n();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const content = Math.min(width, 760) - 32;
  const cols = content > 560 ? 3 : 2;
  const card = (content - (cols - 1) * 12) / cols;

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView contentContainerClassName="pb-12" showsVerticalScrollIndicator={false}>
        <View className="w-full self-center px-4" style={{ maxWidth: 760 }}>
          <View className="flex-row items-center justify-between pt-2">
            <View className="flex-row items-center">
              <Logo size={34} />
              <Text className="ml-2 font-serif text-xl text-ink">{t('appName')}</Text>
            </View>
            <Pressable
              onPress={() => router.push(session ? '/(tabs)' : '/login')}
              className="rounded-full border border-line bg-paper px-4 py-2 active:opacity-80"
            >
              <Text className="font-semibold text-sm text-ink">{session ? t('explore.myStories') : t('login.signIn')}</Text>
            </Pressable>
          </View>

          <Animated.View entering={FadeInDown.duration(400)}>
            <Text className="mt-8 font-semibold text-xs uppercase tracking-widest text-primary">{t('explore.kicker')}</Text>
            <Text className="mt-2 font-serif text-[34px] leading-[40px] text-ink">{t('explore.title')}</Text>
            <Muted className="mt-3 text-[15px] leading-[22px]">{t('explore.subtitle')}</Muted>
          </Animated.View>

          <Pressable
            onPress={() => router.push('/avatar/create')}
            accessibilityRole="button"
            className="mt-6 flex-row items-center overflow-hidden rounded-3xl bg-primary p-5 active:opacity-90"
          >
            <View className="mr-4 h-14 w-14 items-center justify-center rounded-2xl bg-paper/20">
              <Ionicons name="color-palette-outline" size={28} color={colors.paper} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-lg text-paper">{t('explore.createOwn')}</Text>
              <Text className="mt-0.5 text-sm text-paper/80">{t('explore.createOwnHint')}</Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color={colors.paper} />
          </Pressable>

          <Text className="mb-3 mt-8 font-bold text-lg text-ink">{t('explore.characters')}</Text>
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {PRESETS.map((p, i) => (
              <Animated.View key={p.id} entering={FadeInDown.delay(80 * i).duration(380)} style={{ width: card }}>
                <Pressable
                  onPress={() => router.push({ pathname: '/avatar/create', params: { preset: p.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={p.name}
                  className="overflow-hidden rounded-3xl border border-line bg-paper active:opacity-90"
                >
                  <CharacterPortrait look={p.look} gender={p.gender} size={card} animate={false} />
                  <View className="p-3">
                    <Text className="font-serif text-[22px] leading-7 text-ink">{p.name}</Text>
                    <Muted className="mt-0.5 text-xs leading-4" numberOfLines={2}>
                      {p.tagline[language]}
                    </Muted>
                    <View className="mt-2 flex-row flex-wrap">
                      {p.traits.slice(0, 3).map((id) => (
                        <Text key={id} className="mb-1 mr-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary-deep">
                          {traitById(id)?.emoji} {traitById(id)?.label[language]}
                        </Text>
                      ))}
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
