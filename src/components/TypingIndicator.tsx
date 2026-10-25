import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { perfEnd } from '@/lib/perfMeter';
import { useColors } from '@/lib/theme';
import { AnimatedAvatar, type AvatarLike } from './AnimatedAvatar';

/** Un punto que sube y baja (las tres van desfasadas). Antes era un Lottie de 2,4 MB. */
function Dot({ delay }: { delay: number }) {
  const colors = useColors();
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withSequence(withTiming(-3, { duration: 280, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }), withTiming(0, { duration: 260 })), -1, false));
  }, [delay, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: 0.45 + (-y.value / 3) * 0.55 }));
  return <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.muted }, style]} />;
}

/** "Escribiendo…": el personaje a la izquierda, con su foto pensando y tres puntos. */
export function TypingIndicator({ avatar, listening = false }: { avatar: AvatarLike; listening?: boolean }) {
  useEffect(() => perfEnd('typing'), []);
  return (
    <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(150)} className="my-1 flex-row items-end px-4">
      <View style={{ marginRight: 8 }}>
        <AnimatedAvatar avatar={avatar} size={28} presence={listening ? 'listening' : 'thinking'} />
      </View>
      <View className="rounded-bubble rounded-bl-[6px] bg-subtle px-3 py-2.5" accessibilityLabel="Escribiendo">
        <View style={{ width: 40, height: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Dot delay={0} />
          <Dot delay={140} />
          <Dot delay={280} />
        </View>
      </View>
    </Animated.View>
  );
}
