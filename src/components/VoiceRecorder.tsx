import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { AnimatedAvatar, type AvatarLike } from './AnimatedAvatar';
import { VoicePlayer } from './VoicePlayer';
import { colors } from '@/constants/theme';
import { formatDuration } from '@/lib/audio';
import { useI18n } from '@/lib/i18n';

interface Props {
  avatar: AvatarLike;
  onSend: (uri: string, durationMs: number) => void;
  onClose: () => void;
  /** Avisa si la vista previa está sonando (el avatar 3D del encabezado mueve los labios). */
  onPreviewPlaying?: (playing: boolean) => void;
}

const MIN_MS = 700;

/**
 * Panel de nota de voz:
 *  1. Graba (onda en vivo según el volumen del micrófono).
 *  2. Preview: escuchas tu nota mientras el avatar la "escucha" moviendo los labios,
 *     con ondas de sonido animadas.
 *  3. Enviar o descartar.
 */
export function VoiceRecorder({ avatar, onSend, onClose, onPreviewPlaying }: Props) {
  const { t } = useI18n();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, 90);
  const [phase, setPhase] = useState<'recording' | 'preview'>('recording');
  const [uri, setUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(32).fill(0.08));
  const started = useRef(false);

  // Empieza a grabar en cuanto se abre el panel.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('voice.permission'));
        onClose();
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    })().catch((e) => {
      Alert.alert(t('common.error'), String(e));
      onClose();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Onda en vivo a partir del nivel del micrófono (dB → 0..1).
  useEffect(() => {
    if (!state.isRecording) return;
    const db = state.metering ?? -60;
    const level = Math.max(0.08, Math.min(1, (db + 55) / 50));
    setLevels((prev) => [...prev.slice(1), level]);
  }, [state.metering, state.durationMillis, state.isRecording]);

  const stop = async () => {
    const ms = state.durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (ms < MIN_MS || !recorder.uri) {
      Alert.alert(t('voice.tooShort'));
      onClose();
      return;
    }
    setDuration(ms);
    setUri(recorder.uri);
    setPhase('preview');
  };

  const discard = async () => {
    if (state.isRecording) {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    }
    onClose();
  };

  return (
    <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(180)} className="border-t border-line bg-paper px-4 pb-4 pt-3">
      {phase === 'recording' ? (
        <View>
          <View className="flex-row items-center">
            <Animated.View entering={FadeIn} className="mr-2 h-2.5 w-2.5 rounded-full bg-rose-deep" />
            <Text className="text-sm text-ink">{t('voice.recording')}</Text>
            <Text className="ml-auto text-sm text-muted">{formatDuration(state.durationMillis)}</Text>
          </View>
          <View className="my-4 h-12 flex-row items-center">
            {levels.map((l, i) => (
              <View key={i} style={{ flex: 1, marginHorizontal: 1.5, height: `${Math.round(l * 100)}%`, borderRadius: 3, backgroundColor: colors.rose }} />
            ))}
          </View>
          <View className="flex-row items-center justify-between">
            <Pressable onPress={discard} hitSlop={10} className="h-12 w-12 items-center justify-center rounded-full bg-cream">
              <Ionicons name="trash-outline" size={22} color={colors.muted} />
            </Pressable>
            <Pressable
              onPress={stop}
              accessibilityLabel={t('voice.stop')}
              className="h-16 w-16 items-center justify-center rounded-full bg-rose-deep active:opacity-80"
            >
              <View className="h-5 w-5 rounded-sm bg-paper" />
            </Pressable>
            <View className="h-12 w-12" />
          </View>
        </View>
      ) : (
        <View>
          <Text className="mb-3 text-center text-sm text-muted">{t('voice.preview')}</Text>
          <View className="flex-row items-center">
            {/* El avatar "escucha" tu nota: labios y cabeza se mueven mientras suena */}
            <AnimatedAvatar avatar={avatar} size={64} mood={previewPlaying ? 'speaking' : 'idle'} badge={previewPlaying ? '🗣️' : null} />
            <View className="ml-3 flex-1">
              <VoicePlayer
                localUri={uri}
                durationMs={duration}
                autoPlay
                onPlayingChange={(p) => {
                  setPreviewPlaying(p);
                  onPreviewPlaying?.(p);
                }}
                tint={colors.sage}
              />
            </View>
          </View>
          <View className="mt-1 h-10 items-center justify-center">
            {previewPlaying ? (
              <View style={{ width: 76, height: 40, overflow: 'hidden' }}>
                <LottieView source={require('@/assets/lottie/soundwave.json')} autoPlay loop style={{ width: 76, height: 40 }} />
              </View>
            ) : null}
          </View>
          <View className="flex-row">
            <Pressable onPress={discard} className="mr-2 h-12 flex-1 flex-row items-center justify-center rounded-full border border-line bg-paper">
              <Ionicons name="trash-outline" size={18} color={colors.muted} />
              <Text className="ml-2 text-base text-ink">{t('voice.discard')}</Text>
            </Pressable>
            <Pressable
              onPress={() => uri && onSend(uri, duration)}
              className="h-12 flex-1 flex-row items-center justify-center rounded-full bg-ink active:opacity-80"
            >
              <Ionicons name="send" size={16} color={colors.cream} />
              <Text className="ml-2 text-base font-semibold text-cream">{t('voice.send')}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Animated.View>
  );
}
