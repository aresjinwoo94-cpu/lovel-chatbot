import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppearancePicker } from '@/components/AppearancePicker';
import { SituationField } from '@/components/SituationField';
import { StepDiagram } from '@/components/StepDiagram';
import { Button, Chip, Muted, SectionLabel, Title } from '@/components/ui';
import { VrmAvatar, type VrmAvatarHandle } from '@/components/VrmAvatar';
import { colors, serif } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { DEFAULT_APPEARANCE } from '@/lib/avatarOptions';
import { createAvatar, saveAvatarThumbnail } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import type { AvatarAppearance, Gender } from '@/lib/types';

/**
 * Creación de avatar en 4 pasos (los 4 campos obligatorios):
 *   1. Género   2. Edad   3. Apariencia   4. Situación personalizada
 * Un paso a la vez, con vista previa viva del avatar arriba, para que se sienta
 * como una conversación y no como un formulario.
 */
export default function AvatarCreatorScreen() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const isPro = !!profile?.is_pro;

  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<Gender | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState(26);
  const [appearance, setAppearance] = useState<AvatarAppearance>(DEFAULT_APPEARANCE);
  const stage = useRef<VrmAvatarHandle>(null);
  const [description, setDescription] = useState('');
  const [situation, setSituation] = useState('');
  const [saving, setSaving] = useState(false);

  const steps = [t('create.step.gender'), t('create.step.age'), t('create.step.appearance'), t('create.step.situation')];
  const displayName = name.trim() || t('create.defaultName');

  const chooseGender = (g: Gender) => setGender(g);

  const canContinue = step === 0 ? gender !== null : step === 3 ? situation.trim().length > 0 : true;

  const save = async () => {
    if (!gender) return;
    setSaving(true);
    try {
      // Captura del avatar tal como lo ve la persona (se usa como foto de perfil)
      const snapshot = await stage.current?.snapshot().catch(() => null);
      const avatar = await createAvatar({
        name: displayName,
        gender,
        age,
        appearance,
        appearance_description: description.trim(),
        situation_description: situation.trim(),
      });
      if (snapshot) await saveAvatarThumbnail(avatar.id, snapshot).catch(() => undefined);
      router.replace({ pathname: '/chat/[avatarId]', params: { avatarId: avatar.id } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('AVATAR_LIMIT')) {
        Alert.alert(t('create.limitReached'), undefined, [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('pro.cta'), onPress: () => router.push('/pro') },
        ]);
      } else {
        Alert.alert(t('common.error'), msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const next = () => (step < 3 ? setStep(step + 1) : save());
  const back = () => (step > 0 ? setStep(step - 1) : router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Encabezado */}
        <View className="flex-row items-center px-4 pb-2 pt-1">
          <Pressable onPress={back} hitSlop={10} accessibilityLabel={t('create.back')}>
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
          <Title className="ml-2 text-xl">{t('create.title')}</Title>
        </View>

        <StepDiagram steps={steps} current={step} />

        <ScrollView className="flex-1" contentContainerClassName="px-6 pb-8" keyboardShouldPersistTaps="handled">
          {/* Vista previa viva: el avatar VRM se actualiza al personalizarlo */}
          <View className="my-4 items-center">
            <VrmAvatar
              ref={stage}
              appearance={appearance}
              mood={step === 3 ? 'happy' : 'idle'}
              style={{ width: '100%', height: step === 2 ? 300 : 240, borderRadius: 24 }}
            />
            <Text style={{ fontFamily: serif }} className="mt-3 text-lg text-ink">
              {displayName}
              {step >= 1 ? <Text className="text-muted">{`  ·  ${t('create.age.years', { n: age })}`}</Text> : null}
            </Text>
          </View>

          <Animated.View key={step} entering={FadeInRight.duration(260)}>
            {step === 0 ? (
              <View>
                <Title className="text-xl">{t('create.gender.q')}</Title>
                <View className="mt-4 flex-row flex-wrap">
                  {(['female', 'male', 'other'] as const).map((g) => (
                    <Chip key={g} label={t(`create.gender.${g}`)} selected={gender === g} onPress={() => chooseGender(g)} />
                  ))}
                </View>
                <SectionLabel>{t('create.name')}</SectionLabel>
                <View className="rounded-2xl border border-line bg-paper px-4">
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t('create.name.placeholder')}
                    placeholderTextColor={colors.muted}
                    className="h-12 text-base text-ink"
                    maxLength={40}
                    returnKeyType="done"
                  />
                </View>
              </View>
            ) : null}

            {step === 1 ? (
              <View>
                <Title className="text-xl">{t('create.age.q')}</Title>
                <Text style={{ fontFamily: serif }} className="mt-6 text-center text-5xl text-ink">
                  {age}
                </Text>
                <Slider
                  style={{ marginTop: 12, height: 40 }}
                  minimumValue={18}
                  maximumValue={60}
                  step={1}
                  value={age}
                  onValueChange={(v) => setAge(Math.round(v))}
                  minimumTrackTintColor={colors.roseDeep}
                  maximumTrackTintColor={colors.line}
                  thumbTintColor={colors.ink}
                  accessibilityLabel={t('create.age.q')}
                />
                <View className="flex-row justify-between">
                  <Muted>18</Muted>
                  <Muted>60</Muted>
                </View>
              </View>
            ) : null}

            {step === 2 ? (
              <View>
                <Title className="mb-4 text-xl">{t('create.appearance.q')}</Title>
                <AppearancePicker
                  gender={gender ?? 'female'}
                  appearance={appearance}
                  onChange={setAppearance}
                  description={description}
                  onDescriptionChange={setDescription}
                  isPro={isPro}
                />
              </View>
            ) : null}

            {step === 3 ? (
              <View>
                <SituationField value={situation} onChange={setSituation} />
              </View>
            ) : null}
          </Animated.View>
        </ScrollView>

        {/* Pie con acciones */}
        <View className="flex-row items-center border-t border-line bg-cream px-6 py-3">
          {step > 0 ? <Button title={t('create.back')} variant="ghost" onPress={back} className="mr-2" /> : null}
          <Button
            title={saving ? t('create.saving', { name: displayName }) : step === 3 ? t('create.save') : t('create.next')}
            onPress={next}
            disabled={!canContinue}
            loading={saving}
            className="flex-1"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
