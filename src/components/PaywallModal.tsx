import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { AnimatedAvatar, type AvatarLike } from './AnimatedAvatar';
import { Button, IconButton, Muted } from './ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { isBillingDisabled, startProCheckout } from '@/lib/billing';
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
      if (isBillingDisabled(e)) showDialog(t('pro.title'), t('billing.disabled'));
      else showDialog(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} className="flex-1 justify-end bg-black/30 sm:items-center sm:justify-center">
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel={t('pro.notNow')} />
        <Animated.View entering={SlideInDown.duration(240)} className="w-full self-center rounded-t-3xl border border-line bg-paper px-5 pb-8 pt-5 sm:rounded-3xl" style={{ maxWidth: 440 }}>
          <View className="flex-row items-center">
            {avatar ? <AnimatedAvatar avatar={avatar} size={40} presence="idle" /> : null}
            <View className={avatar ? 'ml-3 flex-1' : 'flex-1'}>
              {reason ? <Text className="font-medium text-[12px] text-primary">{reason}</Text> : null}
              <Text className="font-semibold text-[20px] leading-[26px] tracking-tighter text-ink">{t('pro.title')}</Text>
            </View>
            <IconButton icon="close" size={34} label={t('pro.notNow')} onPress={onClose} />
          </View>
          {avatar ? <Muted className="mt-3 text-[14px] leading-[20px]">{t('pro.body', { name: avatar.name })}</Muted> : null}

          <View className="mt-4 rounded-2xl border border-line p-4">
            <View className="flex-row items-baseline justify-between">
              <Text className="font-semibold text-[15px] text-ink">Pro</Text>
              <Text className="font-semibold text-[17px] tracking-tight text-ink">{t('pro.price')}</Text>
            </View>
            <Muted className="mt-0.5 text-[13px]">{t('pro.priceNote')}</Muted>
            <View className="mt-3 border-t border-line pt-1">
              {features.map((f) => (
                <View key={f} className="mt-2.5 flex-row items-center">
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                  <Text className="ml-2.5 text-[14px] text-ink">{f}</Text>
                </View>
              ))}
            </View>
          </View>

          <Button title={t('pro.cta')} variant="brand" onPress={upgrade} loading={loading} className="mt-5" />
          <Button title={t('pro.notNow')} variant="ghost" onPress={onClose} className="mt-1" />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
