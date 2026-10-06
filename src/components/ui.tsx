import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Switch, View, type TextInputProps, type TextProps } from 'react-native';

import { Text, TextInput } from '@/components/Themed';
import { colors } from '@/constants/theme';

/**
 * Sistema de interfaz de Lovel House.
 * Principios: claridad → jerarquía → función → personalidad.
 * Una sola familia (Plus Jakarta Sans), superficies blancas con borde de 1 px,
 * sin sombras ni degradados. El violeta de la marca se reserva para la
 * interacción (selección, enlaces, foco, estados activos).
 */

type TP = TextProps & { className?: string };

/** Titular de pantalla. */
export function Display({ children, className = '', ...rest }: TP) {
  return (
    <Text {...rest} className={`font-semibold text-[28px] leading-[34px] tracking-tightest text-ink ${className}`}>
      {children}
    </Text>
  );
}

export function Title({ children, className = '', ...rest }: TP) {
  return (
    <Text {...rest} className={`font-semibold text-[20px] leading-[26px] tracking-tighter text-ink ${className}`}>
      {children}
    </Text>
  );
}

export function Heading({ children, className = '', ...rest }: TP) {
  return (
    <Text {...rest} className={`font-semibold text-[16px] leading-[22px] tracking-tight text-ink ${className}`}>
      {children}
    </Text>
  );
}

export function Body({ children, className = '', ...rest }: TP) {
  return (
    <Text {...rest} className={`text-[15px] leading-[22px] text-ink ${className}`}>
      {children}
    </Text>
  );
}

export function Muted({ children, className = '', ...rest }: TP) {
  return (
    <Text {...rest} className={`text-[14px] leading-[20px] text-muted ${className}`}>
      {children}
    </Text>
  );
}

export function Caption({ children, className = '', ...rest }: TP) {
  return (
    <Text {...rest} className={`font-medium text-[12px] leading-[16px] text-muted ${className}`}>
      {children}
    </Text>
  );
}

/** Etiqueta de sección (frase normal, sin mayúsculas forzadas). */
export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Text className={`mb-2.5 mt-6 font-medium text-[13px] leading-[18px] text-muted ${className}`}>{children}</Text>;
}

// ------------------------------------------------------------------ botones
type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  className = '',
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  className?: string;
}) {
  const h = { sm: 'h-9 px-4', md: 'h-11 px-5', lg: 'h-12 px-6' }[size];
  const box: Record<ButtonVariant, string> = {
    primary: 'bg-ink',
    brand: 'bg-primary',
    secondary: 'bg-paper border border-line',
    ghost: 'bg-transparent',
    danger: 'bg-paper border border-line',
  };
  const fg: Record<ButtonVariant, string> = { primary: colors.paper, brand: colors.paper, secondary: colors.ink, ghost: colors.ink, danger: '#B4233C' };
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      onPress={onPress}
      disabled={off}
      className={`flex-row items-center justify-center rounded-full ${h} ${box[variant]} ${off ? 'opacity-40' : 'active:opacity-80'} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fg[variant]} style={{ marginRight: 8 }} /> : null}
          <Text className={`font-semibold ${size === 'sm' ? 'text-[13px]' : 'text-[15px]'}`} style={{ color: fg[variant] }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  variant = 'plain',
  size = 40,
  disabled,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  label: string;
  variant?: 'plain' | 'subtle' | 'outline' | 'brand';
  size?: number;
  disabled?: boolean;
}) {
  const box = { plain: '', subtle: 'bg-subtle', outline: 'border border-line bg-paper', brand: 'bg-primary' }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`items-center justify-center rounded-full ${box} ${disabled ? 'opacity-40' : 'active:opacity-70'}`}
      style={{ width: size, height: size }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={variant === 'brand' ? colors.paper : colors.ink} />
    </Pressable>
  );
}

// ------------------------------------------------------------------ selección
/** Etiqueta seleccionable (rasgos, filtros). */
export function Tag({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      className={`mb-2 mr-2 h-9 justify-center rounded-full border px-3.5 ${selected ? 'border-primary bg-primary-soft' : 'border-line bg-paper'} ${
        disabled ? 'opacity-35' : 'active:opacity-70'
      }`}
    >
      <Text className={`text-[13px] ${selected ? 'font-semibold text-primary-deep' : 'font-medium text-ink'}`}>{label}</Text>
    </Pressable>
  );
}

/** Control segmentado (2–5 opciones). */
export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <View className="flex-row rounded-xl bg-subtle p-1">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            className={`h-9 flex-1 items-center justify-center rounded-[9px] ${on ? 'border border-line bg-paper' : ''}`}
          >
            <Text className={`text-[13px] ${on ? 'font-semibold text-ink' : 'font-medium text-muted'}`} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Swatch({ color, selected, onPress, label }: { color: string; selected: boolean; onPress: () => void; label?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={`mb-2.5 mr-2.5 h-10 w-10 items-center justify-center rounded-full border-2 ${selected ? 'border-primary' : 'border-transparent'}`}
    >
      <View className="h-8 w-8 rounded-full border border-black/10" style={{ backgroundColor: color }} />
    </Pressable>
  );
}

// ------------------------------------------------------------------ superficies
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-line bg-paper ${className}`}>{children}</View>;
}

/** Fila de lista (ajustes, perfil). */
export function ListRow({
  icon,
  label,
  value,
  onPress,
  danger,
  last,
  right,
}: {
  icon?: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
  right?: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} className={`min-h-[52px] flex-row items-center px-4 py-3 ${last ? '' : 'border-b border-line'} ${onPress ? 'active:bg-subtle' : ''}`}>
      {icon ? <Ionicons name={icon} size={19} color={danger ? '#B4233C' : colors.ink} style={{ marginRight: 12 }} /> : null}
      <Text className={`flex-1 text-[15px] ${danger ? 'text-[#B4233C]' : 'text-ink'}`}>{label}</Text>
      {value ? <Text className="ml-3 text-[14px] text-muted">{value}</Text> : null}
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 6 }} /> : null}
    </Pressable>
  );
}

export function Field({ label, hint, className = '', ...input }: TextInputProps & { label?: string; hint?: string; className?: string }) {
  const [focus, setFocus] = useState(false);
  return (
    <View>
      {label ? <Text className="mb-1.5 font-medium text-[13px] text-ink">{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...input}
        onFocus={(e) => {
          setFocus(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          input.onBlur?.(e);
        }}
        className={`min-h-[44px] rounded-xl border bg-paper px-3.5 text-[15px] text-ink ${focus ? 'border-primary' : 'border-line'} ${className}`}
        style={{ outlineStyle: 'none' } as object}
      />
      {hint ? <Text className="mt-1.5 text-[12px] text-muted">{hint}</Text> : null}
    </View>
  );
}

export function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <View className="mr-4 flex-1">
        <Text className="text-[15px] text-ink">{label}</Text>
        {hint ? <Text className="mt-0.5 text-[13px] leading-[18px] text-muted">{hint}</Text> : null}
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

export function EmptyState({ icon, title, text, action }: { icon: ComponentProps<typeof Ionicons>['name']; title: string; text?: string; action?: ReactNode }) {
  return (
    <View className="items-center px-8 py-16">
      <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-subtle">
        <Ionicons name={icon} size={22} color={colors.ink} />
      </View>
      <Heading className="text-center">{title}</Heading>
      {text ? <Muted className="mt-1.5 text-center">{text}</Muted> : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}
