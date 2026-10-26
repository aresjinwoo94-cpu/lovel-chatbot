import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { PlatinoBalance, PlatinoIcon } from '@/components/Platino';
import { Text } from '@/components/Themed';
import { Button, IconButton, Muted } from '@/components/ui';
import { track } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import { checkoutErrorKey, checkoutSince, openBillingPortal, type Purchase, startCheckout, waitForPurchase } from '@/lib/billing';
import { showDialog } from '@/lib/dialog';
import { type TFunction, useI18n } from '@/lib/i18n';
import { formatPlatino, formatUsd, PACKS, PRO, type ProductId } from '@/lib/platino';
import { useColors } from '@/lib/theme';
import { usePlatino } from '@/lib/usePlatino';

/** Confirmación de lo que se acreditó: Pro o el Platino del paquete. */
const purchaseText = (p: Purchase, t: TFunction, language: 'es' | 'en') =>
  p.kind === 'pack' ? t('platino.bought.ok', { n: formatPlatino(p.platino, language) }) : t('pro.success');

/**
 * Planes y Platino (WP-11). También es la URL de retorno de Stripe Checkout en web
 * (/pro?status=success). Todo con su precio real, sin letra pequeña: Gratis (40 Platino
 * al día), Pro ($9.90/mes) y paquetes que no caducan.
 */
export default function ProScreen() {
  const colors = useColors();
  const { t, language } = useI18n();
  const { profile, refreshProfile, isGuest } = useAuth();
  const platino = usePlatino();
  const { status } = useLocalSearchParams<{ status?: string }>();
  const [loading, setLoading] = useState<ProductId | null>(null);
  const [confirming, setConfirming] = useState(status === 'success');
  const isPro = !!profile?.is_pro;
  const month = language === 'en' ? 'month' : 'mes';
  useEffect(() => {
    track('pro_viewed');
  }, []);

  // Retorno desde Stripe en web: esperamos a que el webhook acredite (Pro o un paquete).
  useEffect(() => {
    if (status !== 'success') return;
    (async () => {
      const done = await waitForPurchase(checkoutSince());
      await refreshProfile();
      setConfirming(false);
      showDialog(done ? purchaseText(done, t, language) : t('platino.bought.pending'));
    })();
  }, [status, refreshProfile, t, language]);

  const buy = async (product: ProductId) => {
    if (isGuest) {
      router.push({ pathname: '/login', params: { next: '/pro' } });
      return;
    }
    setLoading(product);
    try {
      const done = await startCheckout(product);
      await refreshProfile();
      if (done) showDialog(purchaseText(done, t, language));
    } catch (e) {
      showDialog(t('plans.title'), t(checkoutErrorKey(e)));
    } finally {
      setLoading(null);
    }
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const check = (label: string) => (
    <View key={label} className="mt-2.5 flex-row items-start">
      <Ionicons name="checkmark" size={17} color={colors.primary} style={{ marginTop: 1 }} />
      <Text className="ml-2.5 flex-1 text-[14px] leading-[20px] text-ink">{label}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="h-14 flex-row items-center justify-end px-2">
        <IconButton icon="close" label={t('pro.notNow')} onPress={close} />
      </View>
      <ScrollView contentContainerClassName="w-full max-w-[520px] self-center px-5 pb-12">
        <Logo size={36} />
        <Text className="mt-5 font-semibold text-[26px] leading-[32px] tracking-tighter text-ink">{t('plans.title')}</Text>
        {platino ? (
          <View className="mt-3 flex-row items-center">
            <Muted className="mr-2 text-[14px]">{t('platino.infoTitle')}:</Muted>
            <PlatinoBalance total={platino.total} size="md" tone="ink" />
          </View>
        ) : null}
        <Muted className="mt-2 text-[14px] leading-[20px]">{isGuest ? t('platino.howGuest') : isPro ? t('platino.howPro') : t('platino.how')}</Muted>

        {confirming ? <Muted className="mt-6 text-center">{t('pro.pending')}</Muted> : null}

        {/* Gratis */}
        <View className="mt-6 rounded-2xl border border-line bg-paper p-5">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-semibold text-[17px] text-ink">{t('plans.free')}</Text>
            <Text className="font-semibold text-[17px] text-ink">{t('plans.freePrice')}</Text>
          </View>
          {!isPro && !isGuest ? <Muted className="mt-0.5 text-[12px]">{t('plans.current')}</Muted> : null}
          <View className="mt-2">{[t('plans.free1'), t('plans.free2'), t('plans.free3')].map(check)}</View>
        </View>

        {/* Pro */}
        <View className="mt-3 rounded-2xl border-2 border-primary bg-paper p-5">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-semibold text-[17px] text-ink">Pro</Text>
            <Text className="font-semibold text-[22px] tracking-tighter text-ink">
              {formatUsd(PRO.usd)}
              <Text className="text-[13px] text-muted"> / {month}</Text>
            </Text>
          </View>
          <Muted className="mt-0.5 text-[12px] leading-[17px]">{t('pro.priceNote')}</Muted>
          <View className="mt-2">{[t('pro.f1'), t('pro.f2'), t('pro.f3'), t('pro.f4')].map(check)}</View>
          {isPro ? (
            <>
              <View className="mt-4 rounded-xl border border-line bg-subtle px-3 py-2.5">
                <Text className="font-semibold text-[13px] text-ink">{t('plans.proYours')}</Text>
                {profile?.current_period_end ? (
                  <Text className="mt-0.5 text-[12px] leading-[17px] text-muted">
                    {t('plans.proRenews', { date: new Date(profile.current_period_end).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES') })}
                  </Text>
                ) : null}
              </View>
              <Button title={t('pro.manage')} variant="secondary" onPress={() => openBillingPortal().then(refreshProfile, (e) => showDialog(t('pro.manage'), t(checkoutErrorKey(e))))} className="mt-3" />
            </>
          ) : (
            <Button title={`${t('home.upgrade')} · ${formatUsd(PRO.usd)} / ${month}`} variant="brand" onPress={() => buy('pro')} loading={loading === 'pro'} disabled={!!loading} className="mt-4" />
          )}
        </View>

        {/* Paquetes */}
        <Text className="mt-8 font-semibold text-[17px] text-ink">{t('platino.packsTitle')}</Text>
        <Muted className="mt-1 text-[13px] leading-[18px]">{t('platino.payNote')}</Muted>
        {PACKS.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => buy(p.id)}
            disabled={!!loading}
            accessibilityRole="button"
            className="mt-3 flex-row items-center rounded-2xl border border-line bg-paper px-4 py-3.5 active:bg-subtle"
          >
            <PlatinoIcon size={24} />
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-[15px] text-ink">{t(p.kind === 'trial' ? 'platino.pack.trial' : 'platino.pack.medium')}</Text>
              <Text className="text-[13px] text-muted">{t('platino.packAmount', { n: formatPlatino(p.platino, language) })}</Text>
            </View>
            <Text className="font-semibold text-[15px] text-ink">{loading === p.id ? '…' : formatUsd(p.usd)}</Text>
          </Pressable>
        ))}

        {/* Legal junto al pago */}
        <View className="mt-6 flex-row flex-wrap items-center justify-center">
          <Muted className="text-center text-[12px] leading-[17px]">{t('platino.legal')} </Muted>
          <Pressable onPress={() => router.push('/terms')} accessibilityRole="link">
            <Text className="text-[12px] text-muted underline">{t('legal.terms')}</Text>
          </Pressable>
          <Muted className="text-[12px]"> · </Muted>
          <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link">
            <Text className="text-[12px] text-muted underline">{t('legal.privacy')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
