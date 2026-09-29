import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import LottieView from 'lottie-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { AnimatedAvatar, type AvatarLike } from './AnimatedAvatar';
import { VoicePlayer } from './VoicePlayer';
import { Text } from '@/components/Themed';
import { colors } from '@/constants/theme';
import { formatDuration } from '@/lib/audio';
import { useI18n } from '@/lib/i18n';

interface Props {
  avatar: AvatarLike;
  onSend: (uri: string, durationMs: number) => void;
  onClose: () => void;
  /** Avisa si la vista previa está sonando (el personaje mueve los labios). */
  onPreviewPlaying?: (playing: boolean) => void;
  /** Notas de voz gratis que quedan (null = Pro). */
  voiceLeft?: number | null;
}

const MIN_MS = 700;
const MAX_MS = 120_000;

type Phase = 'preparing' | 'recording' | 'stopping' | 'preview' | 'error';
type ErrorKey = 'voice.permission' | 'voice.permissionBlocked' | 'voice.noMic' | 'voice.micBusy' | 'voice.insecure' | 'voice.unsupported' | 'voice.tooShort' | 'common.error';

/** Traduce los errores del navegador / sistema a un mensaje claro. */
function classify(e: unknown): ErrorKey {
  const name = (e as { name?: string })?.name ?? '';
  const msg = String((e as { message?: string })?.message ?? e).toLowerCase();
  if (name === 'NotAllowedError' || name === 'SecurityError' || msg.includes('permission') || msg.includes('denied')) return 'voice.permissionBlocked';
  if (name === 'NotFoundError' || msg.includes('not found') || msg.includes('no audio input')) return 'voice.noMic';
  if (name === 'NotReadableError' || msg.includes('could not start') || msg.includes('in use')) return 'voice.micBusy';
  return 'common.error';
}

/** Comprobaciones previas en web (https, API de micrófono y MediaRecorder). */
function webSupport(): ErrorKey | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  if (!window.isSecureContext) return 'voice.insecure';
  if (!navigator.mediaDevices?.getUserMedia || typeof (window as { MediaRecorder?: unknown }).MediaRecorder === 'undefined') return 'voice.unsupported';
  return null;
}

/**
 * Panel de nota de voz:
 *  1. Prepara el micrófono (con mensajes claros si falla el permiso o el dispositivo).
 *  2. Graba con onda en vivo (máximo 2 minutos).
 *  3. Vista previa: tu personaje "escucha" tu nota.
 *  4. Enviar o descartar.
 */
export function VoiceRecorder({ avatar, onSend, onClose, onPreviewPlaying, voiceLeft = null }: Props) {
  const { t } = useI18n();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const [phase, setPhaseState] = useState<Phase>('preparing');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<{ key: ErrorKey; detail?: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(32).fill(0.08));
  const lastMs = useRef(0);
  const phaseRef = useRef<Phase>('preparing');

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const fail = useCallback(
    (key: ErrorKey, detail?: string) => {
      setError({ key, detail });
      setPhase('error');
    },
    [setPhase],
  );

  const begin = useCallback(async () => {
    setError(null);
    setNote(null);
    setPhase('preparing');
    const unsupported = webSupport();
    if (unsupported) return fail(unsupported);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return fail(perm.canAskAgain === false ? 'voice.permissionBlocked' : 'voice.permission');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      lastMs.current = 0;
      setElapsed(0);
      setLevels(Array(32).fill(0.08));
      setPhase('recording');
    } catch (e) {
      const key = classify(e);
      fail(key, key === 'common.error' ? String((e as Error)?.message ?? e) : undefined);
    }
  }, [recorder, fail, setPhase]);

  // Empieza a grabar en cuanto se abre el panel.
  useEffect(() => {
    const start = setTimeout(begin, 0);
    return () => {
      clearTimeout(start);
      // Si se cierra el panel a mitad de grabación, soltamos el micrófono.
      if (phaseRef.current === 'recording') recorder.stop().catch(() => undefined);
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(
    async (reachedMax = false) => {
      if (phaseRef.current !== 'recording') return;
      setPhase('stopping');
      const ms = Math.max(recorder.getStatus().durationMillis, lastMs.current);
      try {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      } catch (e) {
        return fail(classify(e), String((e as Error)?.message ?? e));
      }
      if (ms < MIN_MS || !recorder.uri) return fail('voice.tooShort');
      if (reachedMax) setNote(t('voice.maxReached'));
      setDuration(ms);
      setUri(recorder.uri);
      setPhase('preview');
    },
    [recorder, fail, t, setPhase],
  );

  // Mientras graba: tiempo, onda en vivo (dB → 0..1) y límite de 2 minutos.
  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => {
      const st = recorder.getStatus();
      if (!st.isRecording) return;
      lastMs.current = st.durationMillis;
      setElapsed(st.durationMillis);
      const level = st.metering == null ? 0.25 + Math.random() * 0.35 : Math.max(0.08, Math.min(1, (st.metering + 55) / 50));
      setLevels((prev) => [...prev.slice(1), level]);
      if (st.durationMillis >= MAX_MS) stop(true);
    }, 90);
    return () => clearInterval(id);
  }, [phase, recorder, stop]);

  const discard = async () => {
    if (phaseRef.current === 'recording') {
      await recorder.stop().catch(() => undefined);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    }
    onPreviewPlaying?.(false);
    onClose();
  };

  const canRetry = error && !['voice.insecure', 'voice.unsupported', 'voice.noMic'].includes(error.key);

  return (
    <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(180)} className="border-t border-line bg-paper px-4 pb-4 pt-3">
      {phase === 'preparing' ? (
        <View className="h-36 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
          <Text className="mt-3 text-sm text-muted">{t('voice.preparing')}</Text>
        </View>
      ) : null}

      {phase === 'error' && error ? (
        <View className="items-center py-2" accessibilityLiveRegion="polite">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
            <Ionicons name="mic-off-outline" size={24} color={colors.ink} />
          </View>
          <Text className="mt-3 text-center text-[15px] leading-[22px] text-ink">{t(error.key)}</Text>
          {error.detail ? <Text className="mt-1 text-center text-xs text-muted">{error.detail}</Text> : null}
          <View className="mt-4 w-full flex-row">
            <Pressable onPress={discard} className="h-12 flex-1 items-center justify-center rounded-full border border-line bg-paper">
              <Text className="font-semibold text-base text-ink">{t('common.cancel')}</Text>
            </Pressable>
            {canRetry ? (
              <Pressable onPress={begin} className="ml-2 h-12 flex-1 flex-row items-center justify-center rounded-full bg-primary active:opacity-80">
                <Ionicons name="refresh" size={16} color={colors.paper} />
                <Text className="ml-2 font-semibold text-base text-paper">{t('common.retry')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {phase === 'recording' || phase === 'stopping' ? (
        <View>
          <View className="flex-row items-center">
            <Animated.View entering={FadeIn} className="mr-2 h-2.5 w-2.5 rounded-full bg-accent" />
            <Text className="font-semibold text-sm text-ink">{t('voice.recording')}</Text>
            <Text className="ml-auto text-sm text-muted">
              {formatDuration(elapsed)} / {formatDuration(MAX_MS)}
            </Text>
          </View>
          <View className="my-4 h-12 flex-row items-center">
            {levels.map((l, i) => (
              <View key={i} style={{ flex: 1, marginHorizontal: 1.5, height: `${Math.round(l * 100)}%`, borderRadius: 3, backgroundColor: colors.primary }} />
            ))}
          </View>
          <View className="flex-row items-center justify-between">
            <Pressable onPress={discard} hitSlop={10} accessibilityLabel={t('voice.discard')} className="h-12 w-12 items-center justify-center rounded-full bg-cream">
              <Ionicons name="trash-outline" size={22} color={colors.muted} />
            </Pressable>
            <Pressable
              onPress={() => stop()}
              disabled={phase === 'stopping'}
              accessibilityLabel={t('voice.stop')}
              className="h-16 w-16 items-center justify-center rounded-full bg-primary active:opacity-80"
            >
              {phase === 'stopping' ? <ActivityIndicator color={colors.paper} /> : <View className="h-5 w-5 rounded-sm bg-paper" />}
            </Pressable>
            <View className="h-12 w-12" />
          </View>
          {voiceLeft != null ? <Text className="mt-2 text-center text-[11px] text-muted">{t('voice.left', { n: voiceLeft })}</Text> : null}
        </View>
      ) : null}

      {phase === 'preview' ? (
        <View>
          <Text className="mb-3 text-center text-sm text-muted">{note ?? t('voice.preview')}</Text>
          <View className="flex-row items-center">
            {/* Tu personaje "escucha" tu nota */}
            <AnimatedAvatar avatar={avatar} size={60} mood={previewPlaying ? 'speaking' : 'idle'} />
            <View className="ml-3 flex-1">
              <VoicePlayer
                localUri={uri}
                durationMs={duration}
                autoPlay
                onPlayingChange={(p) => {
                  setPreviewPlaying(p);
                  onPreviewPlaying?.(p);
                }}
                tint={colors.success}
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
              onPress={() => {
                onPreviewPlaying?.(false);
                if (uri) onSend(uri, duration);
              }}
              className="h-12 flex-1 flex-row items-center justify-center rounded-full bg-primary active:opacity-80"
            >
              <Ionicons name="send" size={16} color={colors.paper} />
              <Text className="ml-2 font-semibold text-base text-paper">{t('voice.send')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}
