import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Avisos en Android/iOS (WP-12) con expo-notifications. Necesita una build nativa
 * (eas build --profile development): en Expo Go para Android no hay push remoto.
 * El botón "Que no me escriba" de la notificación apaga ese personaje sin abrir la app.
 */
export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let prepared = false;
async function prepare() {
  if (prepared) return;
  prepared = true;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('characters', { name: 'Mensajes de tus personajes', importance: Notifications.AndroidImportance.DEFAULT });
  }
  await Notifications.setNotificationCategoryAsync('proactive', [
    { identifier: 'off', buttonTitle: 'Que no me escriba', options: { opensAppToForeground: false } },
  ]);
}

let token: string | null = null;

export async function pushState(): Promise<PushState> {
  const p = await Notifications.getPermissionsAsync();
  if (p.status === 'denied') return 'denied';
  return p.granted && token ? 'on' : 'off';
}

export async function enablePush(userId: string): Promise<PushState> {
  await prepare();
  const p = await Notifications.requestPermissionsAsync();
  if (!p.granted) return p.status === 'denied' ? 'denied' : 'off';
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return 'unsupported'; // Expo Go en Android o sin red
  }
  await supabase.from('push_subscriptions').delete().eq('endpoint', token);
  const { error } = await supabase.from('push_subscriptions').insert({ user_id: userId, kind: 'expo', endpoint: token });
  if (error && error.code !== '23505') throw error;
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  if (token) await supabase.from('push_subscriptions').delete().eq('endpoint', token);
  token = null;
  return 'off';
}

/** Toques en la notificación: abrir el chat, o "Que no me escriba" (sin abrir la app). */
export function usePushResponses() {
  useEffect(() => {
    prepare().catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as { url?: string; offUrl?: string };
      if (res.actionIdentifier === 'off' && data.offUrl) {
        fetch(data.offUrl, { method: 'POST' }).catch(() => undefined);
        return;
      }
      if (data.url) router.push(data.url as never);
    });
    return () => sub.remove();
  }, []);
}
