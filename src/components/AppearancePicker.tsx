import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Muted, SectionLabel, Swatch } from './ui';
import { colors } from '@/constants/theme';
import { callFunction } from '@/lib/api';
import { BACKGROUNDS, BASE_MODELS, EYE_COLORS, HAIR_COLORS, OUTFIT_COLORS, SKIN_TONES } from '@/lib/avatarOptions';
import { uploadCustomVrm } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import type { AvatarAppearance, Gender } from '@/lib/types';

interface Props {
  gender: Gender;
  appearance: AvatarAppearance;
  onChange: (a: AvatarAppearance) => void;
  description: string;
  onDescriptionChange: (d: string) => void;
  isPro: boolean;
}

const MAX_VRM_BYTES = 45 * 1024 * 1024;

/**
 * Personalización del avatar, como en VRoid / los VTubers:
 *  - Modelo base (peinado y ropa) o tu propio VRM (Pro)
 *  - Colores de pelo, ojos, piel y ropa
 *  - Escena de fondo
 *  - O "Desde una foto": la IA elige los colores; la foto no se guarda.
 */
export function AppearancePicker({ gender, appearance, onChange, description, onDescriptionChange, isPro }: Props) {
  const { t } = useI18n();
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoDone, setPhotoDone] = useState(false);
  const customModel = /^https?:/.test(appearance.model);

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
      const { hairColor, eyeColor, skinTone, outfitColor } = res.appearance;
      onChange({
        ...appearance,
        ...(hairColor ? { hairColor } : {}),
        ...(eyeColor ? { eyeColor } : {}),
        ...(skinTone ? { skinTone } : {}),
        ...(outfitColor ? { outfitColor } : {}),
      });
      if (res.description) onDescriptionChange(res.description);
      setPhotoDone(true);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const pickVrm = async () => {
    if (!isPro) {
      router.push('/pro');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, base64: false });
    if (result.canceled || !result.assets[0]) return;
    const file = result.assets[0];
    if (!file.name.toLowerCase().endsWith('.vrm')) {
      Alert.alert(t('create.appearance.vrmOnly'));
      return;
    }
    if (file.size && file.size > MAX_VRM_BYTES) {
      Alert.alert(t('create.appearance.vrmTooBig'));
      return;
    }
    setUploading(true);
    try {
      const base64 =
        Platform.OS === 'web'
          ? await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
              reader.onerror = reject;
              fetch(file.uri)
                .then((r) => r.blob())
                .then((b) => reader.readAsDataURL(b), reject);
            })
          : await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const url = await uploadCustomVrm(base64);
      set('model', url);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <View>
      {/* Modelo base (peinado y ropa) */}
      <SectionLabel>{t('create.appearance.model')}</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
        {BASE_MODELS.map((m) => {
          const selected = appearance.model === m.id;
          return (
            <Pressable key={m.id} onPress={() => set('model', m.id)} className="mr-3 items-center" accessibilityRole="radio" accessibilityState={{ selected }}>
              <View className={`overflow-hidden rounded-2xl border-2 ${selected ? 'border-ink' : 'border-transparent'}`}>
                <Image source={m.thumb} style={{ width: 76, height: 76 }} contentFit="cover" />
              </View>
              <Text className={`mt-1 text-xs ${selected ? 'font-semibold text-ink' : 'text-muted'}`}>{t(m.labelKey)}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={pickVrm} className="items-center" accessibilityLabel={t('create.appearance.uploadVrm')}>
          <View
            className={`h-[80px] w-[80px] items-center justify-center rounded-2xl border-2 border-dashed ${customModel ? 'border-ink bg-rose-soft' : 'border-line bg-paper'}`}
          >
            {uploading ? (
              <ActivityIndicator color={colors.roseDeep} />
            ) : (
              <Ionicons name={isPro ? (customModel ? 'checkmark-circle' : 'cloud-upload-outline') : 'lock-closed-outline'} size={24} color={colors.roseDeep} />
            )}
          </View>
          <Text className="mt-1 text-xs text-muted">{t('create.appearance.uploadVrm')}</Text>
        </Pressable>
      </ScrollView>
      <Muted className="mt-2 text-xs">{t('create.appearance.vrmHint')}</Muted>

      {/* Desde una foto */}
      <Pressable
        onPress={pickPhoto}
        disabled={analyzing}
        className="mt-4 flex-row items-center rounded-2xl border border-dashed border-line bg-paper px-4 py-3 active:opacity-80"
      >
        {analyzing ? <ActivityIndicator color={colors.roseDeep} /> : <Ionicons name="image-outline" size={18} color={colors.roseDeep} />}
        <View className="ml-3 flex-1">
          <Text className="text-sm text-ink">{analyzing ? t('create.appearance.analyzing') : t('create.appearance.upload')}</Text>
          <Muted className="text-xs">{photoDone ? t('create.appearance.photoDone') : t('create.appearance.photoNote')}</Muted>
        </View>
      </Pressable>

      <SectionLabel>{t('create.appearance.hair')}</SectionLabel>
      <View className="flex-row flex-wrap">
        {HAIR_COLORS.map((c) => (
          <Swatch key={c} color={c} selected={appearance.hairColor === c} onPress={() => set('hairColor', c)} />
        ))}
      </View>

      <SectionLabel>{t('create.appearance.eyes')}</SectionLabel>
      <View className="flex-row flex-wrap">
        {EYE_COLORS.map((c) => (
          <Swatch key={c} color={c} selected={appearance.eyeColor === c} onPress={() => set('eyeColor', c)} />
        ))}
      </View>

      <SectionLabel>{t('create.appearance.skin')}</SectionLabel>
      <View className="flex-row flex-wrap">
        {SKIN_TONES.map((c) => (
          <Swatch key={c} color={c} selected={appearance.skinTone === c} onPress={() => set('skinTone', c)} />
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
