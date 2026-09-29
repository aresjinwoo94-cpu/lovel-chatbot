import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Switch, View, type TextProps } from 'react-native';

import { Text } from '@/components/Themed';
import { colors } from '@/constants/theme';

/**
 * Piezas básicas de interfaz con la identidad de Lovel House.
 * Plus Jakarta Sans para la interfaz; DM Serif Display solo para titulares emocionales.
 */

/** Titular emocional (DM Serif Display). */
export function Title({ children, className = '', ...rest }: TextProps & { className?: string }) {
  return (
    <Text {...rest} className={`font-serif text-[28px] leading-[34px] text-ink ${className}`}>
      {children}
    </Text>
  );
}

/** Título de sección de interfaz (Plus Jakarta Sans). */
export function Heading({ children, className = '', ...rest }: TextProps & { className?: string }) {
  return (
    <Text {...rest} className={`font-bold text-xl text-ink ${className}`}>
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

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';

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
  const base = 'h-14 flex-row items-center justify-center rounded-full px-6';
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-primary',
    secondary: 'bg-paper border border-line',
    soft: 'bg-primary-soft',
    ghost: 'bg-transparent',
    danger: 'bg-paper border border-accent',
  };
  const text: Record<ButtonVariant, string> = {
    primary: 'text-paper',
    secondary: 'text-ink',
    soft: 'text-primary-deep',
    ghost: 'text-muted',
    danger: 'text-ink',
  };
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off }}
      onPress={onPress}
      disabled={off}
      className={`${base} ${styles[variant]} ${off ? 'opacity-50' : 'active:opacity-80'} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.paper : colors.primary} />
      ) : (
        <>
          {icon ? <View className="mr-2">{icon}</View> : null}
          <Text className={`font-semibold text-base ${text[variant]}`}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  disabled = false,
  emoji,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  emoji?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      className={`mb-2 mr-2 flex-row items-center rounded-full border px-4 py-2 ${
        selected ? 'border-primary bg-primary-soft' : 'border-line bg-paper'
      } ${disabled ? 'opacity-35' : 'active:opacity-80'}`}
    >
      {emoji ? <Text className="mr-1.5 text-sm">{emoji}</Text> : null}
      <Text className={`text-sm ${selected ? 'font-semibold text-primary-deep' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}

export function Swatch({ color, selected, onPress, label }: { color: string; selected: boolean; onPress: () => void; label?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={`mb-2 mr-2 h-11 w-11 items-center justify-center rounded-full border-2 ${selected ? 'border-primary' : 'border-transparent'}`}
    >
      <View className="h-8 w-8 rounded-full border border-line" style={{ backgroundColor: color }} />
    </Pressable>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-3xl border border-line bg-paper p-4 ${className}`}>{children}</View>;
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
        trackColor={{ true: colors.primary, false: colors.line }}
        thumbColor={colors.paper}
        {...({ activeThumbColor: colors.paper } as object)}
      />
    </View>
  );
}

export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Text className={`mb-2 mt-5 font-semibold text-xs uppercase tracking-widest text-muted ${className}`}>{children}</Text>;
}
