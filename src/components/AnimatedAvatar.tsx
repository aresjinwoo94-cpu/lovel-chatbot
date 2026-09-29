import { useEffect } from 'react';
import { View } from 'react-native';
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

import { CharacterPortrait } from './CharacterPortrait';
import { Text } from '@/components/Themed';
import { colors } from '@/constants/theme';

/**
 * Estado de ánimo visual del personaje:
 *  - idle: respira suavemente (y parpadea)
 *  - thinking: inclina la cabeza (mientras "escribe…")
 *  - speaking: mueve los labios y asiente
 *  - happy: pequeño salto de alegría
 */
export type AvatarMood = 'idle' | 'thinking' | 'speaking' | 'happy';

export interface AvatarLike {
  appearance: unknown;
  gender?: string;
}

interface Props {
  avatar: AvatarLike;
  mood?: AvatarMood;
  /** Pequeño indicador junto a la foto: ❤️ (texto) o 🗣️ (voz). */
  badge?: '❤️' | '🗣️' | null;
  size?: number;
  /** Anillo de color alrededor (personaje "en línea"). */
  ring?: boolean;
  /** Parpadeo y labios (desactívalo en listas largas). */
  animate?: boolean;
}

/** Foto de perfil circular del personaje, con vida: respira, parpadea y habla. */
export function AnimatedAvatar({ avatar, mood = 'idle', badge = null, size = 56, ring = false, animate = true }: Props) {
  const tilt = useSharedValue(0);
  const lift = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(tilt);
    cancelAnimation(lift);
    if (!animate) return;
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
  }, [mood, tilt, lift, scale, animate]);

  const headStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { rotate: `${tilt.value}deg` }, { scale: scale.value }],
  }));

  const inner = ring ? size - 6 : size;
  const art = inner * 1.1; // un poco más grande que el círculo: al moverse nunca se ven bordes

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
          borderColor: colors.primary,
        }}
      >
        <View style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden', backgroundColor: colors.primarySoft }}>
          <Animated.View style={[{ width: art, height: art, marginLeft: -inner * 0.05, marginTop: -inner * 0.05 }, headStyle]}>
            <CharacterPortrait look={avatar.appearance} gender={avatar.gender} size={art} crop="face" speaking={mood === 'speaking'} animate={animate} />
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
            backgroundColor: colors.paper,
            borderRadius: 12,
            paddingHorizontal: 4,
            paddingVertical: 1,
            borderWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Text style={{ fontSize: Math.max(11, size * 0.2) }}>{badge}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
