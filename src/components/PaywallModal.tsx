import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { AnimatedAvatar, type AvatarLike } from './AnimatedAvatar';
import { PlatinoIcon } from './Platino';
import { Button, IconButton, Muted } from './ui';
import { Text } from '@/components/Themed';
import { track } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import { checkoutErrorKey, startCheckout } from '@/lib/billing';
import { showDialog } from '@/lib/dialog';
import { useI18n } from '@/lib/i18n';
import { formatPlatino, formatUsd, PACKS, PLATINO_COST, type PlatinoKind, type PlatinoState, PRO, resetIn } from '@/lib/platino';

interface Props {
  visible: boolean;
  avatar: (AvatarLike & { name: string }) | null;
  onClose: () => void;
  onUpgraded: () => void;
  /** Sin Platino para esto (texto o nota de voz), o solo ver el saldo ('info'). */
  mode: PlatinoKind | 'info';
  platino: PlatinoState | null;
}

/**
 * Hoja del Platino (WP-11). Al quedarse sin Platino: mensaje amable, cuándo vuelve el
 * diario y las opciones (esperar, paquete de prueba, Pro), siempre con el precio real.
 * Tocando el saldo: el desglose y cómo funciona. Nunca aparece a mitad de una respuesta:
 * el Platino se descuenta antes de que el personaje empiece a responder.
 */
export function PaywallModal({ visible, avatar, onClose, onUpgraded, mode, platino }: Props) {
  const { t, language } = useI18n();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const isPro = !!platino?.isPro;
  const total = platino?.total ?? 0;
  useEffect(() => {
    if (visible) track('paywall_shown', { reason: mode });
  }, [visible, mode]);

  const buy = async (product: 'pro' | 'pack_400' | 'pack_1200') => {
    setLoading(product);
    try {
      const done = await startCheckout(product);
      await refreshProfile();
      if (done) {
        showDialog(done.kind === 'pack' ? t('platino.bought.ok', { n: formatPlatino(done.platino, language) }) : t('pro.success'));
        onUpgraded();
      }
    } catch (e) {
      showDialog(t('platino.packsTitle'), t(checkoutErrorKey(e)));
    } finally {
      setLoading(null);
    }
  };

  const short = mode !== 'info' && total > 0 && total < PLATINO_COST[mode];
  const title = mode === 'info' ? t('platino.infoTitle') : short ? t('platino.shortTitle', { n: PLATINO_COST[mode] - total }) : t('platino.emptyTitle');
  const rows: [string, number][] = platino
    ? ([
        [t('platino.daily'), platino.daily],
        [t('platino.sub'), platino.sub],
        [t('platino.gift'), platino.gift],
        [t('platino.bought'), platino.bought],
      ] as [string, number][]).filter(([label, n], i) => n > 0 || i === 0 || (i === 1 && isPro))
    : [];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} className="flex-1 justify-end bg-black/30 sm:items-center sm:justify-center">
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel={t('pro.notNow')} />
        <Animated.View entering={SlideInDown.duration(240)} className="w-full self-center rounded-t-3xl border border-line bg-paper px-5 pb-8 pt-5 sm:rounded-3xl" style={{ maxWidth: 440 }}>
          <View className="flex-row items-center">
            {avatar && mode !== 'info' ? <AnimatedAvatar avatar={avatar} size={40} presence="idle" /> : <PlatinoIcon size={32} />}
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-[19px] leading-[25px] tracking-tighter text-ink">{title}</Text>
            </View>
            <IconButton icon="close" size={34} label={t('pro.notNow')} onPress={onClose} />
          </View>

          {mode !== 'info' ? (
            <Muted className="mt-3 text-[14px] leading-[20px]">
              {isPro ? t('platino.emptyBodyPro', { time: resetIn(language) }) : t('platino.emptyBody', { name: avatar?.name ?? '', time: resetIn(language) })}
            </Muted>
          ) : (
            <Muted className="mt-3 text-[14px] leading-[20px]">{platino?.guest ? t('platino.howGuest') : isPro ? t('platino.howPro') : t('platino.how')}</Muted>
          )}

          {/* saldo por tipo */}
          <View className="mt-4 rounded-2xl border border-line px-4 py-2">
            {rows.map(([label, n]) => (
              <View key={label} className="flex-row items-center justify-between py-1.5">
                <Text className="text-[13px] text-muted">{label}</Text>
                <View className="flex-row items-center">
                  <PlatinoIcon size={12} />
                  <Text className="ml-1 font-semibold text-[13px] text-ink">{formatPlatino(n, language)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* opciones, siempre con el precio en dinero real */}
          {!platino?.guest ? (
            <View className="mt-4">
              {PACKS.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => buy(p.id)}
                  disabled={!!loading}
                  accessibilityRole="button"
                  className="mb-2 flex-row items-center rounded-2xl border border-line px-4 py-3 active:bg-subtle"
                >
                  <PlatinoIcon size={20} />
                  <View className="ml-3 flex-1">
                    <Text className="font-semibold text-[14px] text-ink">{t(p.kind === 'trial' ? 'platino.pack.trial' : 'platino.pack.medium')}</Text>
                    <Text className="text-[12px] text-muted">{t('platino.packAmount', { n: formatPlatino(p.platino, language) })}</Text>
                  </View>
                  <Text className="font-semibold text-[14px] text-ink">{loading === p.id ? '…' : formatUsd(p.usd)}</Text>
                </Pressable>
              ))}
              <Muted className="mb-1 text-center text-[11px] leading-[15px]">{t('platino.payNote')}</Muted>
              {!isPro ? (
                <Button
                  title={`${t('home.upgrade')} · ${formatUsd(PRO.usd)} / ${language === 'en' ? 'month' : 'mes'}`}
                  variant="brand"
                  onPress={() => buy('pro')}
                  loading={loading === 'pro'}
                  className="mt-2"
                />
              ) : null}
              {!isPro ? <Muted className="mt-1 text-center text-[11px] leading-[15px]">{t('pro.priceNote')}</Muted> : null}
              <Pressable
                onPress={() => {
                  onClose();
                  router.push('/pro');
                }}
                className="mt-2 items-center py-1"
              >
                <Text className="text-[12px] text-muted underline">{t('plans.title')}</Text>
              </Pressable>
            </View>
          ) : null}

          {mode !== 'info' ? <Button title={t('platino.wait')} variant="ghost" onPress={onClose} className="mt-1" /> : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
