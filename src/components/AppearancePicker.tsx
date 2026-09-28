import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';

import { Chip, Muted, SectionLabel, Swatch } from './ui';
import { colors } from '@/constants/theme';
import { callFunction } from '@/lib/api';
import { BACKGROUNDS, EYE_COLORS, HAIR_COLORS, HAIR_STYLES, OUTFIT_COLORS, SKIN_TONES } from '@/lib/avatarGeometry';
import { useI18n } from '@/lib/i18n';
import type { AvatarAppearance, Gender, HairStyle } from '@/lib/types';

interface Props {
  gender: Gender;
  appearance: AvatarAppearance;
  onChange: (a: AvatarAppearance) => void;
  description: string;
  onDescriptionChange: (d: string) => void;
}

/**
 * Apariencia del avatar: elegir con selects visuales, o partir de una foto.
 * La foto se analiza (Claude visión) para traducirla a rasgos del dibujo 2D
 * y NO se guarda en ningún lado.
 */
export function AppearancePicker({ gender, appearance, onChange, description, onDescriptionChange }: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'select' | 'photo'>('select');
  const [analyzing, setAnalyzing] = useState(false);
  const [photoDone, setPhotoDone] = useState(false);

  const set = <K extends keyof AvatarAppearance>(key: K, value: AvatarAppearance[K]) => onChange({ ...appearance, [key]: value });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    setAnalyzing(true);
    try {
      const res = await callFunction<{ appearance: Partial<AvatarAppearance>; description: string }>('analyze-appearance', {
        imageBase64: asset.base64,
        mediaType: asset.mimeType ?? 'image/jpeg',
        gender,
        note: description,
      });
      onChange({ ...appearance, ...res.appearance });
      if (res.description) onDescriptionChange(res.description);
      setPhotoDone(true);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View>
      {/* Selector de modo: Elegir / Desde una foto */}
      <View className="flex-row rounded-full border border-line bg-paper p-1">
        {(['select', 'photo'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            className={`flex-1 flex-row items-center justify-center rounded-full py-2 ${mode === m ? 'bg-ink' : ''}`}
          >
            <Ionicons name={m === 'select' ? 'color-palette-outline' : 'image-outline'} size={16} color={mode === m ? colors.cream : colors.ink} />
            <Text className={`ml-2 text-sm ${mode === m ? 'text-cream' : 'text-ink'}`}>
              {m === 'select' ? t('create.appearance.select') : t('create.appearance.upload')}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'photo' ? (
        <View className="mt-4 items-center rounded-2xl border border-dashed border-line bg-paper px-4 py-6">
          {analyzing ? (
            <>
              <ActivityIndicator color={colors.roseDeep} />
              <Muted className="mt-3">{t('create.appearance.analyzing')}</Muted>
            </>
          ) : (
            <>
              <Pressable onPress={pickPhoto} className="flex-row items-center rounded-full bg-rose-soft px-5 py-3 active:opacity-80">
                <Ionicons name="images-outline" size={18} color={colors.roseDeep} />
                <Text className="ml-2 text-base text-rose-deep">{t('create.appearance.pick')}</Text>
              </Pressable>
              <Muted className="mt-3 text-center">{photoDone ? t('create.appearance.photoDone') : t('create.appearance.photoNote')}</Muted>
            </>
          )}
        </View>
      ) : null}

      <SectionLabel>{t('create.appearance.style')}</SectionLabel>
      <View className="flex-row flex-wrap">
        {HAIR_STYLES.map((s: HairStyle) => (
          <Chip key={s} label={t(`hair.${s}`)} selected={appearance.hairStyle === s} onPress={() => set('hairStyle', s)} />
        ))}
      </View>

      <SectionLabel>{t('create.appearance.hair')}</SectionLabel>
      <View className="flex-row flex-wrap">
        {HAIR_COLORS.map((c) => (
          <Swatch key={c} color={c} selected={appearance.hairColor === c} onPress={() => set('hairColor', c)} />
        ))}
      </View>

      <SectionLabel>{t('create.appearance.skin')}</SectionLabel>
      <View className="flex-row flex-wrap">
        {SKIN_TONES.map((c) => (
          <Swatch key={c} color={c} selected={appearance.skinTone === c} onPress={() => set('skinTone', c)} />
        ))}
      </View>

      <SectionLabel>{t('create.appearance.eyes')}</SectionLabel>
      <View className="flex-row flex-wrap">
        {EYE_COLORS.map((c) => (
          <Swatch key={c} color={c} selected={appearance.eyeColor === c} onPress={() => set('eyeColor', c)} />
        ))}
      </View>

      <SectionLabel>{t('create.appearance.outfit')}</SectionLabel>
      <View className="flex-row flex-wrap">
        {OUTFIT_COLORS.map((c) => (
          <Swatch key={c} color={c} selected={appearance.outfitColor === c} onPress={() => set('outfitColor', c)} />
        ))}
      </View>

      <SectionLabel>{t('create.appearance.background')}</SectionLabel>
      <View className="flex-row flex-wrap">
        {BACKGROUNDS.map((bg) => (
          <Swatch
            key={bg.join()}
            color={bg[0]}
            second={bg[bg.length - 1]}
            selected={appearance.background.join() === bg.join()}
            onPress={() => set('background', bg)}
          />
        ))}
      </View>

      <View className="mt-3 flex-row flex-wrap">
        <Chip label={t('create.appearance.glasses')} selected={appearance.glasses} onPress={() => set('glasses', !appearance.glasses)} />
        <Chip label={t('create.appearance.freckles')} selected={appearance.freckles} onPress={() => set('freckles', !appearance.freckles)} />
        <Chip label={t('create.appearance.beard')} selected={appearance.beard} onPress={() => set('beard', !appearance.beard)} />
      </View>

      <SectionLabel>{t('create.appearance.describe')}</SectionLabel>
      <View className="rounded-2xl border border-line bg-paper px-4 py-3">
        <TextInput
          value={description}
          onChangeText={onDescriptionChange}
          placeholder={t('create.appearance.describe.placeholder')}
          placeholderTextColor={colors.muted}
          multiline
          className="min-h-[56px] text-base text-ink"
          textAlignVertical="top"
        />
      </View>
    </View>
  );
}
