import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { Body, Muted } from './ui';
import { colors, serif } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

/**
 * Campo de "Situación personalizada".
 * Pensado para NO agobiar: una pregunta cálida, un campo amplio, dos ejemplos
 * mínimos que se pueden tocar, y una ayuda suave que solo aparece si la pides.
 * Sin contador ni límites duros.
 */
export function SituationField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  const [showTip, setShowTip] = useState(false);
  const examples = [t('create.situation.ex1'), t('create.situation.ex2')];

  return (
    <View>
      <Text style={{ fontFamily: serif }} className="text-lg leading-7 text-ink">
        {t('create.situation.intro')}
      </Text>

      <View className="mt-4 rounded-2xl border border-line bg-paper px-4 py-3">
        <TextInput
          value={value}
          onChangeText={onChange}
          multiline
          placeholder={t('create.situation.placeholder')}
          placeholderTextColor={colors.muted}
          className="min-h-[120px] text-base leading-6 text-ink"
          textAlignVertical="top"
          accessibilityLabel={t('create.situation.q')}
        />
      </View>

      <Pressable onPress={() => setShowTip((v) => !v)} className="mt-3 flex-row items-center self-start" hitSlop={8}>
        <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
        <Muted className="ml-1">{t('create.situation.help')}</Muted>
      </Pressable>

      {showTip ? (
        <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} className="mt-2 rounded-xl bg-rose-soft px-4 py-3">
          <Body className="text-sm">{t('create.situation.tip')}</Body>
        </Animated.View>
      ) : null}

      <Muted className="mb-2 mt-5 uppercase tracking-widest">{t('create.situation.examples')}</Muted>
      {examples.map((ex) => (
        <Pressable
          key={ex}
          onPress={() => onChange(ex)}
          className="mb-2 flex-row items-center rounded-xl border border-dashed border-line px-4 py-3 active:bg-blush"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.roseDeep} />
          <Text className="ml-2 flex-1 text-sm text-ink">“{ex}”</Text>
        </Pressable>
      ))}
    </View>
  );
}
