import Constants from 'expo-constants';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, Muted, SectionLabel, Title, ToggleRow } from '@/components/ui';
import { colors } from '@/constants/theme';
import { callFunction } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { updateProfile } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import type { Language } from '@/lib/types';
import { TextInput } from '@/components/Themed';
import { showDialog } from '@/lib/dialog';

/** Configuración simple: idioma, privacidad, contraseña y borrado de datos. */
export default function SettingsScreen() {
  const { t, language, setLanguage } = useI18n();
  const { profile, refreshProfile, signOut } = useAuth();
  const params = useLocalSearchParams<{ password?: string }>();
  const [storeVoice, setStoreVoice] = useState(profile?.store_voice ?? true);
  const [showPassword, setShowPassword] = useState(params.password === '1');
  const [password, setPassword] = useState('');

  // Sincroniza con el perfil y con el enlace de "nueva contraseña" (ajuste de estado durante el render).
  const [seenVoice, setSeenVoice] = useState(profile?.store_voice);
  if (profile?.store_voice !== seenVoice) {
    setSeenVoice(profile?.store_voice);
    setStoreVoice(profile?.store_voice ?? true);
  }
  const [seenParam, setSeenParam] = useState(params.password);
  if (params.password !== seenParam) {
    setSeenParam(params.password);
    if (params.password === '1') setShowPassword(true);
  }

  const changeLanguage = async (lang: Language) => {
    setLanguage(lang);
    // El idioma también guía cómo habla el avatar (lo lee la Edge Function).
    await updateProfile({ language: lang }).catch(() => undefined);
  };

  const toggleVoice = async (v: boolean) => {
    setStoreVoice(v);
    try {
      await updateProfile({ store_voice: v });
      await refreshProfile();
    } catch (e) {
      setStoreVoice(!v);
      showDialog(t('common.error'), String(e));
    }
  };

  const savePassword = async () => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return showDialog(t('common.error'), error.message);
    setPassword('');
    setShowPassword(false);
    showDialog(t('settings.passwordSaved'));
  };

  const confirm = (title: string, body: string, action: () => Promise<void>) =>
    showDialog(title, body, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => action().catch((e) => showDialog(t('common.error'), String(e))),
      },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView contentContainerClassName="w-full max-w-[640px] self-center px-5 pb-10">
        <Title className="pb-3 pt-2 text-3xl">{t('settings.title')}</Title>

        <SectionLabel>{t('settings.language')}</SectionLabel>
        <View className="flex-row">
          <Chip label="Español" selected={language === 'es'} onPress={() => changeLanguage('es')} />
          <Chip label="English" selected={language === 'en'} onPress={() => changeLanguage('en')} />
        </View>

        <SectionLabel>{t('settings.privacy')}</SectionLabel>
        <Card>
          <ToggleRow label={t('settings.storeVoice')} hint={t('settings.storeVoiceHint')} value={storeVoice} onChange={toggleVoice} />
          <Muted className="mt-2">{t('settings.privacyNote')}</Muted>
        </Card>

        <SectionLabel>{t('settings.password')}</SectionLabel>
        {showPassword ? (
          <View className="flex-row items-center rounded-2xl border border-line bg-paper pl-4 pr-2">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('settings.newPassword')}
              placeholderTextColor={colors.muted}
              secureTextEntry
              autoComplete="new-password"
              className="h-12 flex-1 text-base text-ink"
            />
            <Button title={t('common.save')} variant="ghost" onPress={savePassword} disabled={password.length < 6} className="h-10 px-3" />
          </View>
        ) : (
          <Button title={t('settings.password')} variant="secondary" onPress={() => setShowPassword(true)} />
        )}

        <View className="mt-10">
          <Button
            title={t('settings.deleteChats')}
            variant="secondary"
            onPress={() =>
              confirm(t('settings.deleteChats'), t('settings.deleteChatsConfirm'), async () => {
                await callFunction('delete-data', { scope: 'conversations' });
                showDialog(t('common.ok'));
              })
            }
          />
          <Button
            title={t('settings.deleteAccount')}
            variant="danger"
            className="mt-3"
            onPress={() =>
              confirm(t('settings.deleteAccount'), t('settings.deleteAccountConfirm'), async () => {
                await callFunction('delete-data', { scope: 'account' });
                await signOut();
              })
            }
          />
        </View>

        <Muted className="mt-8 text-center text-xs">
          {t('appName')} · {t('settings.version', { v: Constants.expoConfig?.version ?? '1.0.0' })}
        </Muted>
      </ScrollView>
    </SafeAreaView>
  );
}
