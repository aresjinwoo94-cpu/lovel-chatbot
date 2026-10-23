/**
 * EAS Observe: rendimiento del arranque y errores de la app en producción (Android e iOS;
 * en web el paquete no hace nada). Panel: pestaña Observe del proyecto en expo.dev.
 * Guía: https://docs.expo.dev/eas/observe/get-started/
 */
import { Observe, useObserve } from 'expo-observe';
import { useEffect } from 'react';

/**
 * Una sola llamada y antes de que se monte ninguna pantalla: cada configure() sustituye la
 * configuración entera, y activar o desactivar la integración después del montaje lanza error.
 * Se importa al principio de src/app/_layout.tsx.
 */
Observe.configure({
  integrations: {
    // Tiempos por pantalla (primer render y "interactiva") en lugar de solo los de toda la app.
    'expo-router': {
      // Fuera de las métricas: identificadores de personajes y lo que llega al volver del login.
      filteredParams: ['avatarId', 'edit', 'code', 'token', 'token_hash', 'access_token', 'refresh_token', 'error_description'],
    },
  },
});

/**
 * Marca la pantalla como lista para usar (tiempo hasta interactiva). Va en cada pantalla por la
 * que se puede entrar a la app; solo cuenta la primera llamada de cada navegación.
 * `ready`: cuando la pantalla ya tiene sus datos (por defecto, al montarse).
 */
export function useMarkInteractive(ready = true) {
  const { markInteractive } = useObserve();
  useEffect(() => {
    if (ready) markInteractive();
  }, [ready, markInteractive]);
}
