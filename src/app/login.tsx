import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CharacterPortrait } from '@/components/CharacterPortrait';
import { Logo } from '@/components/Logo';
import { Text, TextInput } from '@/components/Themed';
import { Button, Muted } from '@/components/ui';
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
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } = useAuth();
  const [draft, setDraft] = useState<CharacterDraft | null>(null);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
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
      router.replace('/');
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
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8" keyboardShouldPersistTaps="handled">
          <View className="w-full max-w-md self-center">
            {draft ? (
              <View className="items-center">
                <View className="rounded-full border-4 border-paper" style={{ shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 16, elevation: 4 }}>
                  <CharacterPortrait look={draft.look} gender={draft.gender} size={132} crop="face" circle />
                </View>
                <Text className="mt-4 text-center font-serif text-[28px] leading-[34px] text-ink">{t('login.draftTitle', { name: draft.name })}</Text>
                <Muted className="mt-2 text-center text-base leading-6">{t('login.draftBody', { name: draft.name })}</Muted>
              </View>
            ) : (
              <View className="items-center">
                <Logo size={84} />
                <Text className="mt-4 font-serif text-[32px] leading-[38px] text-ink">{t('appName')}</Text>
                <Muted className="mt-2 text-center text-base leading-6">{t('login.tagline')}</Muted>
              </View>
            )}

            <Pressable
              onPress={google}
              disabled={busy !== null}
              accessibilityRole="button"
              className="mt-8 h-14 flex-row items-center justify-center rounded-full border border-line bg-paper active:opacity-80"
            >
              <Ionicons name="logo-google" size={18} color={colors.ink} />
              <Text className="ml-3 font-semibold text-base text-ink">{busy === 'google' ? '…' : t('login.google')}</Text>
            </Pressable>

            <View className="my-6 flex-row items-center">
              <View className="h-px flex-1 bg-line" />
              <Muted className="mx-3">{t('login.or')}</Muted>
              <View className="h-px flex-1 bg-line" />
            </View>

            <View className="rounded-3xl border border-line bg-paper">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('login.email')}
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                className="h-14 border-b border-line px-5 text-base text-ink"
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('login.password')}
                placeholderTextColor={colors.muted}
                secureTextEntry
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                className="h-14 px-5 text-base text-ink"
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
              <Text className="font-semibold text-sm text-primary">{mode === 'signIn' ? t('login.toSignUp') : t('login.toSignIn')}</Text>
            </Pressable>
            {mode === 'signIn' ? (
              <Pressable onPress={forgot} className="mt-2 items-center py-1">
                <Muted>{t('login.forgot')}</Muted>
              </Pressable>
            ) : null}
            <Pressable onPress={() => router.replace(draft ? '/avatar/create' : '/explore')} className="mt-2 items-center py-1">
              <Muted>{draft ? t('login.keepEditing', { name: draft.name }) : t('login.explore')}</Muted>
            </Pressable>

            <View className="mt-8 flex-row items-center justify-center">
              <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
              <Muted className="ml-1 text-xs">{t('login.privacy')}</Muted>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
