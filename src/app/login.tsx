import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Button, Muted } from '@/components/ui';
import { colors, serif } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

/** Registro / Login: Google o correo + contraseña. */
export default function LoginScreen() {
  const { t } = useI18n();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);

  const fail = (e: unknown) => Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));

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
        if (needsConfirmation) Alert.alert(t('login.checkEmail'));
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return Alert.alert(t('login.needEmail'));
    try {
      await sendPasswordReset(email);
      Alert.alert(t('login.resetSent'));
    } catch (e) {
      fail(e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-8 py-10" keyboardShouldPersistTaps="handled">
          <View className="items-center">
            <Logo size={96} />
            <Text style={{ fontFamily: serif }} className="mt-5 text-3xl text-ink">
              {t('appName')}
            </Text>
            <Muted className="mt-2 text-center text-base">{t('login.tagline')}</Muted>
          </View>

          <Pressable
            onPress={google}
            disabled={busy !== null}
            className="mt-10 h-12 flex-row items-center justify-center rounded-full border border-line bg-paper active:opacity-80"
          >
            <Ionicons name="logo-google" size={18} color={colors.ink} />
            <Text className="ml-3 text-base font-semibold text-ink">{busy === 'google' ? '…' : t('login.google')}</Text>
          </Pressable>

          <View className="my-6 flex-row items-center">
            <View className="h-px flex-1 bg-line" />
            <Muted className="mx-3">{t('login.or')}</Muted>
            <View className="h-px flex-1 bg-line" />
          </View>

          <View className="rounded-2xl border border-line bg-paper">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('login.email')}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              className="h-12 border-b border-line px-4 text-base text-ink"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('login.password')}
              placeholderTextColor={colors.muted}
              secureTextEntry
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              className="h-12 px-4 text-base text-ink"
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

          <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} className="mt-5 items-center">
            <Text className="text-sm text-rose-deep">{mode === 'signIn' ? t('login.toSignUp') : t('login.toSignIn')}</Text>
          </Pressable>
          {mode === 'signIn' ? (
            <Pressable onPress={forgot} className="mt-3 items-center">
              <Muted>{t('login.forgot')}</Muted>
            </Pressable>
          ) : null}

          <View className="mt-10 flex-row items-center justify-center">
            <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
            <Muted className="ml-1 text-xs">{t('login.privacy')}</Muted>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
