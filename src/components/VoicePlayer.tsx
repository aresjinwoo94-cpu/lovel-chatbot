import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { formatDuration } from '@/lib/audio';
import { signedAudioUrl } from '@/lib/data';

interface Props {
  /** Ruta en Supabase Storage (bucket privado voice-messages). */
  path?: string | null;
  /** URI local ya lista (p. ej. la respuesta recién llegada o la grabación en preview). */
  localUri?: string | null;
  durationMs?: number | null;
  /** Reproduce automáticamente al montarse (respuesta de voz del avatar). */
  autoPlay?: boolean;
  /** Avisa cuando empieza/termina de sonar (para animar los labios del avatar). */
  onPlayingChange?: (playing: boolean) => void;
  tint?: string;
  seed?: string;
}

/** Barras de onda "dibujadas" (pseudoaleatorias pero estables por mensaje). */
function useBars(seed: string, count = 28) {
  return useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return Array.from({ length: count }, (_, i) => {
      h = (h * 1103515245 + 12345) >>> 0;
      const base = 0.3 + ((h >>> 8) % 70) / 100;
      return Math.min(1, base * (0.7 + 0.3 * Math.sin(i / 2.2)));
    });
  }, [seed, count]);
}

/** Reproductor de nota de voz estilo WhatsApp: play/pausa, onda con progreso y duración. */
export function VoicePlayer({ path, localUri, durationMs, autoPlay = false, onPlayingChange, tint = colors.roseDeep, seed }: Props) {
  const player = useAudioPlayer(localUri ? { uri: localUri } : null);
  const status = useAudioPlayerStatus(player);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(!!localUri);
  const bars = useBars(seed ?? path ?? localUri ?? 'voice');

  // Autoplay de la respuesta de voz del avatar.
  useEffect(() => {
    if (autoPlay && localUri) player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onPlayingChange?.(status.playing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.playing]);

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
      player.pause();
    }
  }, [status.didJustFinish, player]);

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (!loadedRef.current && path) {
      setLoading(true);
      try {
        player.replace({ uri: await signedAudioUrl(path) });
        loadedRef.current = true;
      } finally {
        setLoading(false);
      }
    }
    player.play();
  };

  const total = status.duration > 0 ? status.duration * 1000 : (durationMs ?? 0);
  const progress = total > 0 ? Math.min(1, (status.currentTime * 1000) / total) : 0;
  const canPlay = !!(path || localUri);

  return (
    <View className="flex-row items-center py-1" style={{ minWidth: 200 }}>
      <Pressable
        onPress={toggle}
        disabled={!canPlay}
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: canPlay ? tint : colors.line }}
        accessibilityLabel={status.playing ? 'Pausa' : 'Reproducir'}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name={status.playing ? 'pause' : 'play'} size={16} color="#fff" style={{ marginLeft: status.playing ? 0 : 2 }} />
        )}
      </Pressable>
      <View className="ml-3 h-7 flex-1 flex-row items-center">
        {bars.map((b, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              marginHorizontal: 1,
              height: `${Math.round(b * 100)}%`,
              borderRadius: 2,
              backgroundColor: i / bars.length <= progress && progress > 0 ? tint : colors.line,
            }}
          />
        ))}
      </View>
      <Text className="ml-2 w-10 text-right text-xs text-muted">
        {formatDuration(status.playing || progress > 0 ? status.currentTime * 1000 : total)}
      </Text>
    </View>
  );
}
