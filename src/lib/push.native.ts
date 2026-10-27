import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getLocales } from 'expo-localization';
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
export const PUSH_SURFACE = 'device' as const;

const TOKEN_KEY = 'lovel.push.token.v1';
const en = () => getLocales()[0]?.languageCode === 'en';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let prepared = false;
async function prepare() {
  if (prepared) return;
  prepared = true;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('characters', { name: en() ? 'Messages from your characters' : 'Mensajes de tus personajes', importance: Notifications.AndroidImportance.DEFAULT });
  }
  await Notifications.setNotificationCategoryAsync('proactive', [
    { identifier: 'off', buttonTitle: en() ? 'Stop writing first' : 'Que no me escriba', options: { opensAppToForeground: false } },
  ]);
}

const savedToken = () => AsyncStorage.getItem(TOKEN_KEY).catch(() => null);

export async function pushState(): Promise<PushState> {
  const p = await Notifications.getPermissionsAsync();
  if (p.status === 'denied') return 'denied';
  const token = await savedToken();
  if (!p.granted || !token) return 'off';
  const { data } = await supabase.from('push_subscriptions').select('id').eq('endpoint', token).maybeSingle();
  return data ? 'on' : 'off';
}

export async function enablePush(): Promise<PushState> {
  await prepare();
  const p = await Notifications.requestPermissionsAsync();
  if (!p.granted) return p.status === 'denied' ? 'denied' : 'off';
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return 'unsupported'; // Expo Go en Android o sin red
  }
  await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => undefined);
  const { error } = await supabase.rpc('claim_push_subscription', { p_kind: 'expo', p_endpoint: token, p_p256dh: null, p_auth: null });
  if (error) throw error;
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const token = await savedToken();
  if (token) await supabase.rpc('release_push_subscription', { p_endpoint: token });
  return 'off';
}

/** Al cerrar sesión: este móvil deja de recibir avisos de la cuenta. */
export async function releasePush() {
  const token = await savedToken();
  if (token) await supabase.rpc('release_push_subscription', { p_endpoint: token });
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
