import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/Themed';
import { colors } from '@/constants/theme';
import type { Presence } from '@/lib/character/types';
import { useI18n } from '@/lib/i18n';

function Bar({ delay, color }: { delay: number; color: string }) {
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }), withTiming(0.3, { duration: 300 })), -1, false));
    return () => cancelAnimation(v);
  }, [v, delay]);
  const st = useAnimatedStyle(() => ({ transform: [{ scaleY: v.value }] }));
  return <Animated.View style={[{ width: 2.5, height: 12, borderRadius: 2, backgroundColor: color, marginHorizontal: 1 }, st]} />;
}

function Dot({ delay, color }: { delay: number; color: string }) {
  const v = useSharedValue(0.25);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0.25, { duration: 320 })), -1, false));
    return () => cancelAnimation(v);
  }, [v, delay]);
  const st = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={[{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginHorizontal: 1.5 }, st]} />;
}

/** Estado del personaje en palabras: en línea · escribiendo · escuchando · hablando · no disponible. */
export function PresencePill({ presence, onDark = false }: { presence: Presence; onDark?: boolean }) {
  const { t } = useI18n();
  const fg = onDark ? '#FFFFFF' : colors.ink;
  const label =
    presence === 'thinking' ? t('chat.typing') : presence === 'listening' ? t('chat.listening') : presence === 'speaking' ? t('chat.speaking') : presence === 'offline' ? t('chat.offline') : t('chat.online');
  return (
    <View className="flex-row items-center" accessibilityLiveRegion="polite">
      <View className="mr-1.5 h-3 flex-row items-center justify-center" style={{ minWidth: 14 }}>
        {presence === 'speaking' ? (
          [0, 120, 240, 360].map((d) => <Bar key={d} delay={d} color={colors.primary} />)
        ) : presence === 'thinking' ? (
          [0, 160, 320].map((d) => <Dot key={d} delay={d} color={fg} />)
        ) : (
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: presence === 'listening' ? colors.accent : presence === 'offline' ? colors.muted : colors.success }} />
        )}
      </View>
      <Text className="font-medium text-[12px]" style={{ color: onDark ? 'rgba(255,255,255,0.85)' : colors.muted }}>
        {label}
      </Text>
    </View>
  );
}
