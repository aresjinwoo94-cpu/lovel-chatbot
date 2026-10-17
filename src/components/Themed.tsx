import { forwardRef } from 'react';
import { Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';

import { fonts } from '@/constants/theme';

/**
 * Text y TextInput con la tipografía de la marca (Plus Jakarta Sans) por defecto.
 * Si el className elige otro peso (font-medium, font-semibold…), se respeta.
 */
const FONT_CLASS = /(^|\s)font-(sans|normal|medium|semibold|bold|extrabold)(\s|$)/;
const needsDefault = (className?: string) => !className || !FONT_CLASS.test(className);
// Sin color explícito, el texto usa el del tema (si no, quedaría negro en modo oscuro).
const COLOR_CLASS = /(^|\s)text-(ink|muted|paper|primary|accent|success|danger|gold|white|black|cream|subtle|line|transparent|\[#)/;
const withColor = (className?: string) => (className && COLOR_CLASS.test(className) ? className : `text-ink ${className ?? ''}`);

export const Text = forwardRef<RNText, TextProps & { className?: string }>(function Text({ className, style, ...rest }, ref) {
  return <RNText ref={ref} {...rest} className={withColor(className)} style={needsDefault(className) ? [{ fontFamily: fonts.regular }, style] : style} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps & { className?: string }>(function TextInput({ className, style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} className={withColor(className)} style={needsDefault(className) ? [{ fontFamily: fonts.regular }, style] : style} />;
});
