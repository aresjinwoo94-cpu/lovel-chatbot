import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { AnimatedAvatar, type AvatarLike } from './AnimatedAvatar';
import { Button, Muted } from './ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { startProCheckout } from '@/lib/billing';
import { useI18n } from '@/lib/i18n';
import { Text } from '@/components/Themed';
import { showDialog } from '@/lib/dialog';

interface Props {
  visible: boolean;
  avatar: (AvatarLike & { name: string }) | null;
  onClose: () => void;
  onUpgraded: () => void;
  /** Por qué aparece (p. ej. "Usaste tus 3 notas de voz gratis"). */
  reason?: string | null;
}

/**
 * Modal del plan Pro. Solo una opción: suscripción mensual de $9.90.
 * Aparece al agotar los 25 mensajes o las 3 notas de voz gratuitas.
 */
export function PaywallModal({ visible, avatar, onClose, onUpgraded, reason }: Props) {
  const { t } = useI18n();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const features = [t('pro.f1'), t('pro.f2'), t('pro.f3'), t('pro.f4')];

  const upgrade = async () => {
    setLoading(true);
    try {
      const ok = await startProCheckout();
      await refreshProfile();
      if (ok) {
        showDialog(t('pro.success'));
        onUpgraded();
      }
    } catch (e) {
      showDialog(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} className="flex-1 justify-end bg-black/30">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel={t('pro.notNow')} />
        <Animated.View entering={SlideInDown.springify().damping(18)} className="w-full max-w-lg self-center rounded-t-[32px] bg-cream px-6 pb-10 pt-6">
          {avatar ? (
            <View className="items-center">
              <AnimatedAvatar avatar={avatar} size={84} ring mood="happy" badge="❤️" />
            </View>
          ) : null}
          {reason ? <Text className="mt-4 text-center font-semibold text-xs uppercase tracking-widest text-primary">{reason}</Text> : null}
          <Text className="mt-2 text-center font-serif text-[26px] leading-8 text-ink">{t('pro.title')}</Text>
          {avatar ? <Muted className="mt-2 text-center">{t('pro.body', { name: avatar.name })}</Muted> : null}

          <View className="mt-5 rounded-3xl border border-line bg-paper p-4">
            <View className="flex-row items-baseline justify-between">
              <Text className="font-serif text-xl text-ink">Pro</Text>
              <Text className="font-semibold text-lg text-ink">{t('pro.price')}</Text>
            </View>
            <Muted className="mt-1">{t('pro.priceNote')}</Muted>
            <View className="mt-3">
              {features.map((f) => (
                <View key={f} className="mt-2 flex-row items-center">
                  <Ionicons name="heart" size={14} color={colors.accent} />
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
