import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Text } from '@/components/Themed';
import { Button, Muted } from '@/components/ui';
import { useAgeGate } from '@/lib/ageGate';
import { useI18n } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

function LegalLinks() {
  const { t } = useI18n();
  return (
    <View className="mt-6 flex-row items-center justify-center" style={{ gap: 6 }}>
      <Link href="/terms" className="text-[12px] text-muted underline">
        {t('legal.terms')}
      </Link>
      <Text className="text-[12px] text-muted">·</Text>
      <Link href="/privacy" className="text-[12px] text-muted underline">
        {t('legal.privacy')}
      </Link>
    </View>
  );
}

/**
 * PUERTA 18+ — lo primero que ve cualquiera que llega sin haber confirmado su edad.
 * Mientras no se confirme, el resto de la app no está disponible (ver _layout.tsx).
 */
export default function AgeGate() {
  const colors = useColors();
  const { t } = useI18n();
  const { status, confirmAdult, declareMinor } = useAgeGate();

  if (status === 'minor') {
    return (
      <SafeAreaView className="flex-1 bg-paper">
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 pb-10">
          <Animated.View entering={FadeIn.duration(300)} className="w-full items-center self-center" style={{ maxWidth: 420 }}>
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-subtle">
              <Ionicons name="hand-left-outline" size={26} color={colors.ink} />
            </View>
            <Text className="mt-5 text-center font-semibold text-[24px] leading-[30px] tracking-tighter text-ink">{t('age.minorTitle')}</Text>
            <Muted className="mt-3 text-center text-[15px] leading-[22px]">{t('age.minorBody')}</Muted>
            <LegalLinks />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="h-14 flex-row items-center px-4">
        <Logo size={24} withName />
      </View>
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 pb-10">
        <View className="w-full self-center" style={{ maxWidth: 420 }}>
          <Animated.View entering={FadeInDown.duration(400)} className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-ink">
              <Text className="font-bold text-[18px] tracking-tight text-paper">18+</Text>
            </View>
            <Text className="mt-5 text-center font-semibold text-[26px] leading-[32px] tracking-tighter text-ink">{t('age.title')}</Text>
            <Muted className="mt-3 text-center text-[15px] leading-[22px]">{t('age.body')}</Muted>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(150).duration(400)} className="mt-8" style={{ gap: 10 }}>
            <Button title={t('age.adult')} size="lg" onPress={confirmAdult} />
            <Button title={t('age.minor')} size="lg" variant="secondary" onPress={declareMinor} />
            <Text className="mt-2 text-center text-[12px] leading-[17px] text-muted">{t('age.note')}</Text>
          </Animated.View>
          <LegalLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
