import { Image } from 'expo-image';
import { useEffect } from 'react';
import { View, type ImageSourcePropType } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/constants/theme';
import { normalizeLook } from '@/lib/character/catalog';
import { faceImage } from '@/lib/character/media';
import type { Presence } from '@/lib/character/types';

export type { Presence };
/** Compatibilidad con el nombre anterior. */
export type AvatarMood = Presence;

export interface AvatarLike {
  appearance: unknown;
  gender?: string;
  avatar_image_url?: string | null;
}

interface Props {
  avatar?: AvatarLike;
  /** Imagen directa (si no se pasa `avatar`). */
  source?: ImageSourcePropType;
  presence?: Presence;
  size?: number;
  /** Punto de estado (en línea / no disponible). */
  status?: boolean;
}

/**
 * Foto de perfil del personaje con su estado:
 *  - idle: en reposo
 *  - thinking: un arco que gira suavemente (está escribiendo)
 *  - listening: aro tenue que respira (escuchando tu nota de voz)
 *  - speaking: ondas que salen del avatar y un leve latido (habla o suena su voz)
 *  - happy: pequeño rebote al recibir su respuesta
 *  - offline: atenuado, punto gris
 * Animaciones discretas en el hilo de UI (Reanimated), sin coste de render.
 */
export function AnimatedAvatar({ avatar, source, presence = 'idle', size = 40, status = false }: Props) {
  const img =
    source ??
    (avatar ? faceImage({ imageUrl: avatar.avatar_image_url, look: normalizeLook(avatar.appearance, avatar.gender) }) : undefined);

  const scale = useSharedValue(1);
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const spin = useSharedValue(0);
  const ring = useSharedValue(0);

  useEffect(() => {
    [scale, wave1, wave2, spin, ring].forEach((v) => cancelAnimation(v));
    wave1.value = 0;
    wave2.value = 0;
    spin.value = 0;
    if (presence === 'speaking') {
      const wave = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
      wave1.value = wave;
      wave2.value = withDelay(700, withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false));
      scale.value = withRepeat(withSequence(withTiming(1.035, { duration: 260 }), withTiming(1, { duration: 320 })), -1, false);
      ring.value = withTiming(1, { duration: 180 });
    } else if (presence === 'thinking') {
      spin.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.linear }), -1, false);
      scale.value = withSpring(1);
      ring.value = withTiming(1, { duration: 180 });
    } else if (presence === 'listening') {
      ring.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.45, { duration: 900 })), -1, true);
      scale.value = withSpring(1);
    } else if (presence === 'happy') {
      scale.value = withSequence(withSpring(1.07, { damping: 7 }), withSpring(1, { damping: 12 }));
      ring.value = withTiming(0, { duration: 400 });
    } else {
      scale.value = withSpring(1);
      ring.value = withTiming(0, { duration: 250 });
    }
  }, [presence, scale, wave1, wave2, spin, ring]);

  const imgStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const w1 = useAnimatedStyle(() => ({ opacity: (1 - wave1.value) * 0.45 * (wave1.value > 0 ? 1 : 0), transform: [{ scale: 1 + wave1.value * 0.42 }] }));
  const w2 = useAnimatedStyle(() => ({ opacity: (1 - wave2.value) * 0.45 * (wave2.value > 0 ? 1 : 0), transform: [{ scale: 1 + wave2.value * 0.42 }] }));
  const thinking = presence === 'thinking';
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }], opacity: thinking ? 1 : 0 }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));

  const pad = Math.max(2, Math.round(size * 0.06));
  const inner = size - pad * 2;
  const r = size / 2 - 1;
  const c = 2 * Math.PI * r;
  const offline = presence === 'offline';

  return (
    <View style={{ width: size, height: size }}>
      {/* Ondas de voz */}
      {[w1, w2].map((st, i) => (
        <Animated.View key={i} pointerEvents="none" style={[{ position: 'absolute', inset: 0, borderRadius: size / 2, borderWidth: 1.5, borderColor: colors.primary }, st]} />
      ))}
      {/* Aro de estado */}
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', inset: 0, borderRadius: size / 2, borderWidth: presence === 'listening' ? 1.5 : 2, borderColor: presence === 'listening' ? colors.accent : colors.primary }, ringStyle]}
      />
      {/* Arco "pensando" */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, spinStyle]}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.primarySoft} strokeWidth={2} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.primary} strokeWidth={2} fill="none" strokeDasharray={`${c * 0.28} ${c}`} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: pad, top: pad, width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden', backgroundColor: colors.subtle }, imgStyle]}>
        {img ? <Image source={img} style={{ width: inner, height: inner, opacity: offline ? 0.5 : 1 }} contentFit="cover" contentPosition="top" transition={150} /> : null}
      </Animated.View>
      {status ? (
        <View
          style={{
            position: 'absolute',
            right: pad - 1,
            bottom: pad - 1,
            width: Math.max(9, size * 0.24),
            height: Math.max(9, size * 0.24),
            borderRadius: 999,
            backgroundColor: offline ? colors.muted : colors.success,
            borderWidth: 2,
            borderColor: colors.paper,
          }}
        />
      ) : null}
    </View>
  );
}
