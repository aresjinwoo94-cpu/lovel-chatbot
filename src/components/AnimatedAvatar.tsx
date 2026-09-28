import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';

import { modelThumb, normalizeAppearance } from '@/lib/avatarOptions';
import type { AvatarAppearance } from '@/lib/types';

/**
 * Estado de ánimo visual del avatar:
 *  - idle: respira suavemente
 *  - thinking: inclina la cabeza (mientras "escribe…")
 *  - speaking: asiente (reproduce voz / acaba de responder)
 *  - happy: pequeño salto de alegría
 */
export type AvatarMood = 'idle' | 'thinking' | 'speaking' | 'happy';

export interface AvatarLike {
  appearance: Partial<AvatarAppearance>;
  avatar_image_url?: string | null;
}

interface Props {
  avatar: AvatarLike;
  mood?: AvatarMood;
  /** Pequeño indicador junto a la foto: ❤️ (texto) o 🗣️ (voz). */
  badge?: '❤️' | '🗣️' | null;
  size?: number;
  /** Anillo suave alrededor (estilo historias de Instagram). */
  ring?: boolean;
}

/**
 * Foto de perfil del avatar para lugares pequeños (lista de chats, modales).
 * Usa la miniatura capturada del propio modelo VRM. El avatar 3D en vivo
 * está en VrmAvatar.
 */
export function AnimatedAvatar({ avatar, mood = 'idle', badge = null, size = 56, ring = false }: Props) {
  const tilt = useSharedValue(0);
  const lift = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(tilt);
    cancelAnimation(lift);
    if (mood === 'speaking') {
      tilt.value = withRepeat(withSequence(withTiming(-3, { duration: 260 }), withTiming(3, { duration: 300 }), withTiming(0, { duration: 240 })), -1);
      lift.value = withRepeat(withSequence(withTiming(-1.5, { duration: 220 }), withTiming(0, { duration: 220 })), -1);
    } else if (mood === 'thinking') {
      tilt.value = withSpring(6, { damping: 12 });
      lift.value = withTiming(0);
    } else if (mood === 'happy') {
      tilt.value = withSequence(withSpring(-4, { damping: 8 }), withSpring(0, { damping: 10 }));
      scale.value = withSequence(withSpring(1.06, { damping: 6 }), withSpring(1, { damping: 10 }));
    } else {
      tilt.value = withSpring(0);
      lift.value = withRepeat(
        withSequence(
          withTiming(-1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.5, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    }
  }, [mood, tilt, lift, scale]);

  const headStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { rotate: `${tilt.value}deg` }, { scale: scale.value }],
  }));

  const inner = ring ? size - 6 : size;
  const art = inner * 1.1; // un poco más grande que el círculo: al moverse nunca se ven bordes
  const source = avatar.avatar_image_url ? { uri: avatar.avatar_image_url } : modelThumb(normalizeAppearance(avatar.appearance).model);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: ring ? 2 : 0,
          borderColor: '#D98C95',
        }}
      >
        <View style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden', backgroundColor: '#2E1446' }}>
          <Animated.View style={[{ width: art, height: art, marginLeft: -inner * 0.05, marginTop: -inner * 0.05 }, headStyle]}>
            <Image source={source} style={{ width: art, height: art }} contentFit="cover" transition={200} />
          </Animated.View>
        </View>
      </View>

      {badge ? (
        <Animated.View
          key={badge}
          entering={ZoomIn.springify().damping(10)}
          exiting={ZoomOut.duration(180)}
          style={{
            position: 'absolute',
            right: -4,
            top: -4,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            paddingHorizontal: 4,
            paddingVertical: 1,
            borderWidth: 1,
            borderColor: '#EADFD8',
          }}
        >
          <Text style={{ fontSize: Math.max(11, size * 0.2) }}>{badge}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
