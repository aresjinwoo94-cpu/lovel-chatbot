import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Button, IconButton, Muted } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { openBillingPortal, startProCheckout, waitForPro } from '@/lib/billing';
import { useI18n } from '@/lib/i18n';
import { Text } from '@/components/Themed';
import { showDialog } from '@/lib/dialog';

/**
 * Página del plan Pro (también es la URL de retorno de Stripe Checkout en web:
 * /pro?status=success). Solo suscripción mensual: $9.90 USD.
 */
export default function ProScreen() {
  const { t } = useI18n();
  const { profile, refreshProfile } = useAuth();
  const { status } = useLocalSearchParams<{ status?: string }>();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(status === 'success');
  const features = [t('pro.f1'), t('pro.f2'), t('pro.f3'), t('pro.f4')];

  // Retorno desde Stripe en web: esperamos a que el webhook active Pro.
  useEffect(() => {
    if (status !== 'success') return;
    waitForPro().then(async (ok) => {
      await refreshProfile();
      setConfirming(false);
      if (ok) showDialog(t('pro.success'));
    });
  }, [status, refreshProfile, t]);

  const upgrade = async () => {
    setLoading(true);
    try {
      const ok = await startProCheckout();
      await refreshProfile();
      if (ok) {
        showDialog(t('pro.success'));
        router.back();
      }
    } catch (e) {
      showDialog(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="h-14 flex-row items-center justify-end px-2">
        <IconButton icon="close" label={t('pro.notNow')} onPress={close} />
      </View>
      <ScrollView contentContainerClassName="w-full max-w-[440px] self-center px-5 pb-12">
        <Logo size={36} />
        <Text className="mt-5 font-semibold text-[26px] leading-[32px] tracking-tighter text-ink">Lovel House Pro</Text>
        <Muted className="mt-2 text-[15px] leading-[22px]">{t('pro.priceNote')}</Muted>

        <View className="mt-6 rounded-2xl border border-line bg-paper p-5">
          <View className="flex-row items-baseline">
            <Text className="font-semibold text-[30px] tracking-tighter text-ink">{t('pro.price')}</Text>
          </View>
          <View className="mt-4 border-t border-line pt-2">
            {features.map((f) => (
              <View key={f} className="mt-2.5 flex-row items-center">
                <Ionicons name="checkmark" size={17} color={colors.primary} />
                <Text className="ml-2.5 text-[15px] text-ink">{f}</Text>
              </View>
            ))}
          </View>

          {confirming ? (
            <Muted className="mt-6 text-center">{t('pro.pending')}</Muted>
          ) : profile?.is_pro ? (
            <>
              <View className="mt-6 h-11 items-center justify-center rounded-full bg-primary-soft">
                <Text className="font-semibold text-[14px] text-primary-deep">{t('pro.active')}</Text>
              </View>
              <Button title={t('pro.manage')} variant="secondary" onPress={() => openBillingPortal().then(refreshProfile)} className="mt-2" />
            </>
          ) : (
            <Button title={t('pro.cta')} variant="brand" onPress={upgrade} loading={loading} className="mt-6" />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
