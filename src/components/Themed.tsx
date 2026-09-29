import { forwardRef } from 'react';
import { Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';

import { fonts } from '@/constants/theme';

/**
 * Text y TextInput con la tipografía de la marca (Plus Jakarta Sans) por defecto.
 * Si el className elige otra familia (font-semibold, font-serif…), se respeta.
 */
const FONT_CLASS = /(^|\s)font-(sans|normal|medium|semibold|bold|extrabold|serif)(\s|$)/;
const needsDefault = (className?: string) => !className || !FONT_CLASS.test(className);

export const Text = forwardRef<RNText, TextProps & { className?: string }>(function Text({ className, style, ...rest }, ref) {
  return <RNText ref={ref} {...rest} className={className} style={needsDefault(className) ? [{ fontFamily: fonts.regular }, style] : style} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps & { className?: string }>(function TextInput({ className, style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} className={className} style={needsDefault(className) ? [{ fontFamily: fonts.regular }, style] : style} />;
});
