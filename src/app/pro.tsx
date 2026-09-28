import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Button, Muted } from '@/components/ui';
import { colors, serif } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { openBillingPortal, startProCheckout, waitForPro } from '@/lib/billing';
import { useI18n } from '@/lib/i18n';

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
  const features = [t('pro.f1'), t('pro.f2'), t('pro.f3'), t('pro.f4'), t('pro.f5')];

  // Retorno desde Stripe en web: esperamos a que el webhook active Pro.
  useEffect(() => {
    if (status !== 'success') return;
    waitForPro().then(async (ok) => {
      await refreshProfile();
      setConfirming(false);
      if (ok) Alert.alert(t('pro.success'));
    });
  }, [status, refreshProfile, t]);

  const upgrade = async () => {
    setLoading(true);
    try {
      const ok = await startProCheckout();
      await refreshProfile();
      if (ok) {
        Alert.alert(t('pro.success'));
        router.back();
      }
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-row justify-end px-4 pt-2">
        <Pressable onPress={close} hitSlop={10} accessibilityLabel={t('pro.notNow')}>
          <Ionicons name="close" size={26} color={colors.ink} />
        </Pressable>
      </View>
      <ScrollView contentContainerClassName="px-7 pb-10">
        <View className="items-center">
          <Logo size={88} />
          <Text style={{ fontFamily: serif }} className="mt-5 text-center text-2xl leading-8 text-ink">
            Lovel House Pro
          </Text>
          <Text className="mt-2 text-xl font-semibold text-ink">{t('pro.price')}</Text>
          <Muted className="mt-1 text-center">{t('pro.priceNote')}</Muted>
        </View>

        <View className="mt-6 rounded-2xl border border-line bg-paper p-5">
          {features.map((f) => (
            <View key={f} className="my-1.5 flex-row items-center">
              <Ionicons name="heart" size={15} color={colors.rose} />
              <Text className="ml-3 text-base text-ink">{f}</Text>
            </View>
          ))}
        </View>

        {confirming ? (
          <Muted className="mt-6 text-center">{t('pro.pending')}</Muted>
        ) : profile?.is_pro ? (
          <>
            <View className="mt-6 items-center rounded-full bg-rose-soft py-3">
              <Text className="text-rose-deep">{t('pro.active')}</Text>
            </View>
            <Button title={t('pro.manage')} variant="secondary" onPress={() => openBillingPortal().then(refreshProfile)} className="mt-3" />
          </>
        ) : (
          <Button title={t('pro.cta')} onPress={upgrade} loading={loading} className="mt-6" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
