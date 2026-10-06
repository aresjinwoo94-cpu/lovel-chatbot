import Constants from 'expo-constants';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Field, ListRow, Muted, Segmented, SectionLabel, Title, ToggleRow } from '@/components/ui';
import { callFunction } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { updateProfile } from '@/lib/data';
import { showDialog } from '@/lib/dialog';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import type { Language } from '@/lib/types';

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
      <ScrollView contentContainerClassName="w-full max-w-[640px] self-center px-4 pb-12">
        <Title className="pb-1 pt-4 text-[24px] leading-[30px]">{t('settings.title')}</Title>

        <SectionLabel>{t('settings.language')}</SectionLabel>
        <View style={{ maxWidth: 280 }}>
          <Segmented<Language>
            value={language}
            onChange={changeLanguage}
            options={[
              { id: 'es', label: 'Español' },
              { id: 'en', label: 'English' },
            ]}
          />
        </View>

        <SectionLabel>{t('settings.privacy')}</SectionLabel>
        <Card>
          <ToggleRow label={t('settings.storeVoice')} hint={t('settings.storeVoiceHint')} value={storeVoice} onChange={toggleVoice} />
        </Card>
        <Muted className="mt-2 px-1 text-[13px] leading-[18px]">{t('settings.privacyNote')}</Muted>

        <SectionLabel>{t('settings.password')}</SectionLabel>
        {showPassword ? (
          <View className="flex-row items-start">
            <View className="flex-1">
              <Field value={password} onChangeText={setPassword} placeholder={t('settings.newPassword')} secureTextEntry autoComplete="new-password" />
            </View>
            <Button title={t('common.save')} onPress={savePassword} disabled={password.length < 6} className="ml-2" />
          </View>
        ) : (
          <Card>
            <ListRow icon="key-outline" label={t('settings.password')} onPress={() => setShowPassword(true)} last />
          </Card>
        )}

        <SectionLabel>{t('settings.data')}</SectionLabel>
        <Card>
          <ListRow
            icon="trash-outline"
            label={t('settings.deleteChats')}
            onPress={() =>
              confirm(t('settings.deleteChats'), t('settings.deleteChatsConfirm'), async () => {
                await callFunction('delete-data', { scope: 'conversations' });
                showDialog(t('common.ok'));
              })
            }
          />
          <ListRow
            icon="person-remove-outline"
            label={t('settings.deleteAccount')}
            danger
            last
            onPress={() =>
              confirm(t('settings.deleteAccount'), t('settings.deleteAccountConfirm'), async () => {
                await callFunction('delete-data', { scope: 'account' });
                await signOut('local');
              })
            }
          />
        </Card>

        <Muted className="mt-8 text-center text-[12px]">
          {t('appName')} · {t('settings.version', { v: Constants.expoConfig?.version ?? '1.0.0' })}
        </Muted>
      </ScrollView>
    </SafeAreaView>
  );
}
