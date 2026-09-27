import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { AnimatedAvatar, type AvatarLike } from './AnimatedAvatar';
import { Button, Muted } from './ui';
import { colors, serif } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { startProCheckout } from '@/lib/billing';
import { useI18n } from '@/lib/i18n';

interface Props {
  visible: boolean;
  avatar: (AvatarLike & { name: string }) | null;
  onClose: () => void;
  onUpgraded: () => void;
}

/**
 * Modal suave y cálido del plan Pro. Solo una opción: suscripción mensual de $9.90.
 * Aparece tras 5 mensajes o 2 minutos de conversación gratuita.
 */
export function PaywallModal({ visible, avatar, onClose, onUpgraded }: Props) {
  const { t } = useI18n();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const features = [t('pro.f1'), t('pro.f2'), t('pro.f3'), t('pro.f4'), t('pro.f5')];

  const upgrade = async () => {
    setLoading(true);
    try {
      const ok = await startProCheckout();
      await refreshProfile();
      if (ok) {
        Alert.alert(t('pro.success'));
        onUpgraded();
      }
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} className="flex-1 justify-end bg-black/30">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel={t('pro.notNow')} />
        <Animated.View entering={SlideInDown.springify().damping(18)} className="rounded-t-3xl bg-cream px-6 pb-10 pt-6">
          {avatar ? (
            <View className="items-center">
              <AnimatedAvatar avatar={avatar} size={84} ring mood="happy" badge="❤️" />
            </View>
          ) : null}
          <Text style={{ fontFamily: serif }} className="mt-4 text-center text-xl leading-7 text-ink">
            {t('pro.title')}
          </Text>
          {avatar ? <Muted className="mt-2 text-center">{t('pro.body', { name: avatar.name })}</Muted> : null}

          <View className="mt-5 rounded-2xl border border-line bg-paper p-4">
            <View className="flex-row items-baseline justify-between">
              <Text style={{ fontFamily: serif }} className="text-lg text-ink">
                Pro
              </Text>
              <Text className="text-lg font-semibold text-ink">{t('pro.price')}</Text>
            </View>
            <Muted className="mt-1">{t('pro.priceNote')}</Muted>
            <View className="mt-3">
              {features.map((f) => (
                <View key={f} className="mt-2 flex-row items-center">
                  <Ionicons name="heart" size={14} color={colors.rose} />
                  <Text className="ml-2 text-[15px] text-ink">{f}</Text>
                </View>
              ))}
            </View>
          </View>

          <Button title={t('pro.cta')} onPress={upgrade} loading={loading} className="mt-5" />
          <Button title={t('pro.notNow')} variant="ghost" onPress={onClose} className="mt-1" />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
