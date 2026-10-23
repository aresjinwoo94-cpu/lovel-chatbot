import { Pressable, Text, useColorScheme, View } from 'react-native';

import { PALETTES } from '@/constants/theme';

/**
 * Pantalla de error de toda la app (errorBoundaryFallback de ObserveRoot): sustituye a la app
 * cuando un render falla, y el error queda registrado en EAS Observe con su pila de componentes.
 * Va por fuera de los providers (tema, idioma), así que no usa sus hooks.
 */
export function AppCrashFallback({ resetError }: { error?: unknown; resetError?: () => void }) {
  const colors = PALETTES[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.cream }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink, textAlign: 'center' }}>Algo salió mal</Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center' }}>
        Something went wrong. Tus historias están a salvo: vuelve a intentarlo.
      </Text>
      {resetError ? (
        <Pressable
          onPress={resetError}
          accessibilityRole="button"
          style={{ marginTop: 24, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.ink }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.cream }}>Reintentar · Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
