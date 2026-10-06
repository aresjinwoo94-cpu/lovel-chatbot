import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { AnimatedAvatar, type AvatarLike } from './AnimatedAvatar';
import { Button, IconButton } from './ui';
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
    <Animated.View entering={SlideInDown.duration(220)} exiting={SlideOutDown.duration(180)} className="border-t border-line bg-paper px-4 pb-4 pt-3">
      <View className="w-full self-center" style={{ maxWidth: 760 }}>
        {phase === 'preparing' ? (
          <View className="h-28 items-center justify-center">
            <ActivityIndicator color={colors.muted} />
            <Text className="mt-3 text-[13px] text-muted">{t('voice.preparing')}</Text>
          </View>
        ) : null}

        {phase === 'error' && error ? (
          <View className="items-center py-2" accessibilityLiveRegion="polite">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-subtle">
              <Ionicons name="mic-off-outline" size={20} color={colors.ink} />
            </View>
            <Text className="mt-3 text-center text-[14px] leading-[20px] text-ink">{t(error.key)}</Text>
            {error.detail ? <Text className="mt-1 text-center text-[12px] text-muted">{error.detail}</Text> : null}
            <View className="mt-4 w-full flex-row gap-2">
              <Button title={t('common.cancel')} variant="secondary" onPress={discard} className="flex-1" />
              {canRetry ? <Button title={t('common.retry')} icon="refresh" onPress={begin} className="flex-1" /> : null}
            </View>
          </View>
        ) : null}

        {phase === 'recording' || phase === 'stopping' ? (
          <View>
            <View className="flex-row items-center">
              <AnimatedAvatar avatar={avatar} size={28} presence="listening" />
              <Text className="ml-2 font-medium text-[13px] text-ink">{t('voice.recording')}</Text>
              <Text className="ml-auto text-[13px] text-muted" style={{ fontVariant: ['tabular-nums'] }}>
                {formatDuration(elapsed)} / {formatDuration(MAX_MS)}
              </Text>
            </View>
            <View className="my-3 h-10 flex-row items-center">
              {levels.map((l, i) => (
                <View key={i} style={{ flex: 1, marginHorizontal: 1.5, height: `${Math.round(l * 100)}%`, borderRadius: 2, backgroundColor: colors.primary, opacity: 0.35 + l * 0.65 }} />
              ))}
            </View>
            <View className="flex-row items-center justify-between">
              <IconButton icon="trash-outline" variant="outline" size={44} label={t('voice.discard')} onPress={discard} />
              <Pressable
                onPress={() => stop()}
                disabled={phase === 'stopping'}
                accessibilityRole="button"
                accessibilityLabel={t('voice.stop')}
                className="h-14 w-14 items-center justify-center rounded-full bg-ink active:opacity-80"
              >
                {phase === 'stopping' ? <ActivityIndicator color={colors.paper} /> : <View className="h-4 w-4 rounded-[3px] bg-paper" />}
              </Pressable>
              <View className="h-11 w-11" />
            </View>
            {voiceLeft != null ? <Text className="mt-2 text-center text-[11px] text-muted">{t('voice.left', { n: voiceLeft })}</Text> : null}
          </View>
        ) : null}

        {phase === 'preview' ? (
          <View>
            <Text className="mb-3 text-[13px] text-muted">{note ?? t('voice.preview')}</Text>
            <View className="flex-row items-center">
              {/* Tu personaje "escucha" tu nota */}
              <AnimatedAvatar avatar={avatar} size={40} presence={previewPlaying ? 'listening' : 'idle'} />
              <View className="ml-3 flex-1 rounded-2xl border border-line px-3 py-2">
                <VoicePlayer
                  localUri={uri}
                  durationMs={duration}
                  autoPlay
                  onPlayingChange={(p) => {
                    setPreviewPlaying(p);
                    onPreviewPlaying?.(p);
                  }}
                  tint={colors.primary}
                />
              </View>
            </View>
            <View className="mt-3 flex-row gap-2">
              <Button title={t('voice.discard')} variant="secondary" icon="trash-outline" onPress={discard} className="flex-1" />
              <Button
                title={t('voice.send')}
                variant="brand"
                icon="arrow-up"
                onPress={() => {
                  onPreviewPlaying?.(false);
                  if (uri) onSend(uri, duration);
                }}
                className="flex-1"
              />
            </View>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}
