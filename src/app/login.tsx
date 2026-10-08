import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAvatar } from '@/components/AnimatedAvatar';
import { Logo } from '@/components/Logo';
import { Text } from '@/components/Themed';
import { Button, Field, Muted } from '@/components/ui';
import { colors } from '@/constants/theme';
import { AuthFlowError, useAuth } from '@/lib/auth';
import { showDialog } from '@/lib/dialog';
import { type CharacterDraft, loadDraft } from '@/lib/draft';
import { useI18n } from '@/lib/i18n';

/**
 * Registro / Login: Google o correo + contraseña.
 * Solo se pide cuando hace falta guardar: si vienes del creador, muestra a tu
 * personaje esperándote y, al entrar, la historia empieza sola.
 */
export default function LoginScreen() {
  const { t } = useI18n();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset, isGuest } = useAuth();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [draft, setDraft] = useState<CharacterDraft | null>(null);
  // Invitado: lo normal es crear su cuenta (conserva personaje e historia).
  const [mode, setMode] = useState<'signIn' | 'signUp'>(isGuest ? 'signUp' : 'signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);

  useEffect(() => {
    loadDraft().then((d) => {
      if (d?.ready) {
        setDraft(d);
        setMode('signUp');
      }
    });
  }, []);

  const fail = (e: unknown) => {
    if (e instanceof AuthFlowError) {
      if (e.code === 'GOOGLE_DISABLED') showDialog(t('common.error'), t('login.googleUnavailable'));
      return; // cancelado por la persona: nada que mostrar
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (/invalid login credentials/i.test(msg)) return showDialog(t('login.badCredentials'));
    if (/at least 6/i.test(msg)) return showDialog(t('login.weakPassword'));
    showDialog(t('common.error'), msg);
  };

  const google = async () => {
    setBusy('google');
    try {
      await signInWithGoogle();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    setBusy('email');
    try {
      if (mode === 'signIn') await signInWithEmail(email, password);
      else {
        const { needsConfirmation } = await signUpWithEmail(email, password);
        if (needsConfirmation) return showDialog(t('login.checkEmail'));
      }
      // Con sesión: el inicio decide (personaje pendiente → /start, historias → lista).
      router.replace((isGuest && mode === 'signUp' && next ? next : '/') as never);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return showDialog(t('login.needEmail'));
    try {
      await sendPasswordReset(email);
      showDialog(t('login.resetSent'));
    } catch (e) {
      fail(e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-5 py-10" keyboardShouldPersistTaps="handled">
          <View className="w-full self-center" style={{ maxWidth: 380 }}>
            {isGuest ? (
              <View className="items-center">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
                  <Ionicons name="bookmark" size={20} color={colors.primaryDeep} />
                </View>
                <Text className="mt-5 text-center font-semibold text-[24px] leading-[30px] tracking-tighter text-ink">{t('login.guestTitle')}</Text>
                <Muted className="mt-2 text-center text-[15px] leading-[22px]">{t('login.guestBody')}</Muted>
              </View>
            ) : draft ? (
              <View className="items-center">
                <AnimatedAvatar avatar={{ appearance: draft.look, gender: draft.gender, avatar_image_url: draft.snapshot }} size={96} presence="happy" />
                <Text className="mt-5 text-center font-semibold text-[24px] leading-[30px] tracking-tighter text-ink">{t('login.draftTitle', { name: draft.name })}</Text>
                <Muted className="mt-2 text-center text-[15px] leading-[22px]">{t('login.draftBody', { name: draft.name })}</Muted>
              </View>
            ) : (
              <View className="items-center">
                <Logo size={44} />
                <Text className="mt-5 font-semibold text-[26px] leading-[32px] tracking-tighter text-ink">{t('appName')}</Text>
                <Muted className="mt-2 text-center text-[15px] leading-[22px]">{t('login.tagline')}</Muted>
              </View>
            )}

            <Pressable
              onPress={google}
              disabled={busy !== null}
              accessibilityRole="button"
              className="mt-8 h-11 flex-row items-center justify-center rounded-full border border-line bg-paper active:bg-subtle"
            >
              <Ionicons name="logo-google" size={18} color={colors.ink} />
              <Text className="ml-2.5 font-semibold text-[15px] text-ink">{busy === 'google' ? '…' : t('login.google')}</Text>
            </Pressable>

            <View className="my-5 flex-row items-center">
              <View className="h-px flex-1 bg-line" />
              <Muted className="mx-3 text-[13px]">{t('login.or')}</Muted>
              <View className="h-px flex-1 bg-line" />
            </View>

            <View className="gap-2.5">
              <Field value={email} onChangeText={setEmail} placeholder={t('login.email')} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
              <Field
                value={password}
                onChangeText={setPassword}
                placeholder={t('login.password')}
                secureTextEntry
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                onSubmitEditing={submit}
              />
            </View>

            <Button
              title={mode === 'signIn' ? t('login.signIn') : t('login.signUp')}
              onPress={submit}
              loading={busy === 'email'}
              disabled={!email.trim() || password.length < 6}
              className="mt-4"
            />

            <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} className="mt-5 items-center py-1">
              <Text className="font-semibold text-[14px] text-primary">{mode === 'signIn' ? t('login.toSignUp') : t('login.toSignIn')}</Text>
            </Pressable>
            {isGuest && mode === 'signIn' ? <Muted className="mt-1 text-center text-[12px]">{t('login.guestSignIn')}</Muted> : null}
            {mode === 'signIn' ? (
              <Pressable onPress={forgot} className="mt-2 items-center py-1">
                <Muted>{t('login.forgot')}</Muted>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => (isGuest ? (router.canGoBack() ? router.back() : router.replace('/')) : router.replace(draft ? '/avatar/create' : '/welcome'))}
              className="mt-2 items-center py-1"
            >
              <Muted>{isGuest ? t('pro.notNow') : draft ? t('login.keepEditing', { name: draft.name }) : t('login.explore')}</Muted>
            </Pressable>

            <View className="mt-8 flex-row items-center justify-center">
              <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
              <Muted className="ml-1 text-[12px]">{t('login.privacy')}</Muted>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
