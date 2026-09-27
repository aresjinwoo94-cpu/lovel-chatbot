import { router } from 'expo-router';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAvatar } from '@/components/AnimatedAvatar';
import { Button, Muted } from '@/components/ui';
import { serif } from '@/constants/theme';
import { REFERENCE_APPEARANCE } from '@/lib/avatarGeometry';
import { useI18n } from '@/lib/i18n';

/**
 * Onboarding inicial: "Bienvenido a Lovel House. ¿Quieres crear tu primer avatar?"
 * Muestra el avatar de referencia (la chica 2D del diseño) saludando.
 */
export default function WelcomeScreen() {
  const { t } = useI18n();
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 items-center justify-center px-8">
        <Animated.View entering={FadeInUp.duration(500)}>
          <AnimatedAvatar
            avatar={{ appearance: REFERENCE_APPEARANCE, gender: 'female', age: 26 }}
            size={180}
            ring
            mood="happy"
            badge="❤️"
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(500)} className="mt-8 items-center">
          <Text style={{ fontFamily: serif }} className="text-center text-3xl leading-10 text-ink">
            {t('welcome.title')}
          </Text>
          <Text style={{ fontFamily: serif }} className="mt-3 text-center text-xl leading-8 text-ink">
            {t('welcome.question')}
          </Text>
          <Muted className="mt-4 text-center text-base leading-6">{t('welcome.body')}</Muted>
        </Animated.View>
      </View>
      <Animated.View entering={FadeInDown.delay(400).duration(500)} className="px-8 pb-6">
        <Button title={t('welcome.cta')} onPress={() => router.push('/avatar/create')} />
        <Button title={t('welcome.later')} variant="ghost" onPress={() => router.replace('/(tabs)')} className="mt-1" />
      </Animated.View>
    </SafeAreaView>
  );
}
