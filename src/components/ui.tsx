import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View, type TextProps } from 'react-native';

import { colors, serif } from '@/constants/theme';

/**
 * Piezas básicas de interfaz, minimalistas y consistentes.
 * Títulos en serif clásica, cuerpo en sans-serif del sistema, sin cursivas.
 */

export function Title({ children, className = '', ...rest }: TextProps & { className?: string }) {
  return (
    <Text {...rest} style={[{ fontFamily: serif }, rest.style]} className={`text-2xl text-ink ${className}`}>
      {children}
    </Text>
  );
}

export function Body({ children, className = '', ...rest }: TextProps & { className?: string }) {
  return (
    <Text {...rest} className={`text-base leading-6 text-ink ${className}`}>
      {children}
    </Text>
  );
}

export function Muted({ children, className = '', ...rest }: TextProps & { className?: string }) {
  return (
    <Text {...rest} className={`text-sm leading-5 text-muted ${className}`}>
      {children}
    </Text>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  className = '',
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  const base = 'h-12 flex-row items-center justify-center rounded-full px-6';
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-ink',
    secondary: 'bg-paper border border-line',
    ghost: 'bg-transparent',
    danger: 'bg-paper border border-rose-deep',
  };
  const text: Record<ButtonVariant, string> = {
    primary: 'text-cream',
    secondary: 'text-ink',
    ghost: 'text-muted',
    danger: 'text-rose-deep',
  };
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      className={`${base} ${styles[variant]} ${off ? 'opacity-50' : 'active:opacity-80'} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.cream : colors.ink} />
      ) : (
        <>
          {icon ? <View className="mr-2">{icon}</View> : null}
          <Text className={`text-base font-semibold ${text[variant]}`}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`mb-2 mr-2 rounded-full border px-4 py-2 ${selected ? 'border-ink bg-ink' : 'border-line bg-paper'}`}
    >
      <Text className={`text-sm ${selected ? 'text-cream' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}

export function Swatch({ color, selected, onPress, second }: { color: string; second?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`mb-2 mr-2 h-9 w-9 items-center justify-center rounded-full border-2 ${selected ? 'border-ink' : 'border-transparent'}`}
    >
      <View className="h-7 w-7 flex-row overflow-hidden rounded-full border border-line">
        <View style={{ flex: 1, backgroundColor: color }} />
        {second ? <View style={{ flex: 1, backgroundColor: second }} /> : null}
      </View>
    </Pressable>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-line bg-paper p-4 ${className}`}>{children}</View>;
}

export function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="mr-4 flex-1">
        <Body>{label}</Body>
        {hint ? <Muted className="mt-1">{hint}</Muted> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.rose, false: colors.line }}
        thumbColor={colors.paper}
        {...({ activeThumbColor: colors.paper } as object)}
      />
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-muted">{children}</Text>;
}
