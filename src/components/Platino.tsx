import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/Themed';
import { useI18n } from '@/lib/i18n';
import { formatPlatino } from '@/lib/platino';

/**
 * Ícono del Platino: una gema de platino tallada (hexágono con facetas), dibujada aquí,
 * sin degradados ni ids (en web pueden convivir muchas copias en la página).
 */
export function PlatinoIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* contorno */}
      <Path d="M12 1.6 21.2 7v10L12 22.4 2.8 17V7z" fill="#8E97AE" />
      {/* cara superior, laterales e inferior */}
      <Path d="M12 3.4 19.6 7.8 12 12.2 4.4 7.8z" fill="#EEF1F7" />
      <Path d="M4.4 7.8 12 12.2v8.4l-7.6-4.4z" fill="#C3CAD8" />
      <Path d="M19.6 7.8 12 12.2v8.4l7.6-4.4z" fill="#A9B2C5" />
      {/* brillo */}
      <Path d="M8.2 7.1 11.2 5.4l1.1.6-3 1.8z" fill="#FFFFFF" opacity={0.9} />
    </Svg>
  );
}

/** Saldo discreto: gema + número. Si se toca, abre el detalle. */
export function PlatinoBalance({ total, onPress, size = 'sm', tone = 'muted' }: { total: number; onPress?: () => void; size?: 'sm' | 'md'; tone?: 'muted' | 'ink' | 'warn' }) {
  const { t, language } = useI18n();
  const color = tone === 'ink' ? 'text-ink' : tone === 'warn' ? 'text-primary' : 'text-muted';
  const body = (
    <View className="flex-row items-center" accessibilityLabel={t('platino.balanceA11y', { n: formatPlatino(total, language) })}>
      <PlatinoIcon size={size === 'md' ? 18 : 13} />
      <Text className={`ml-1 font-semibold ${size === 'md' ? 'text-[15px]' : 'text-[11px]'} ${color}`}>{formatPlatino(total, language)}</Text>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}>
      {body}
    </Pressable>
  ) : (
    body
  );
}
