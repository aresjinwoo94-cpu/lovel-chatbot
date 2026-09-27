import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { callFunction } from './api';
import { supabase } from './supabase';

/** Límites del periodo gratuito (idénticos a supabase/functions/_shared/quota.ts). */
export const FREE_MESSAGE_LIMIT = 5;
export const FREE_SECONDS = 120;

const returnUrl = () => (Platform.OS === 'web' ? `${window.location.origin}/pro` : Linking.createURL('pro'));

/**
 * Abre Stripe Checkout (suscripción Pro $9.90/mes) en un navegador seguro.
 * Devuelve true si al volver la cuenta ya es Pro (el webhook de Stripe la activa).
 */
export async function startProCheckout(): Promise<boolean> {
  const { url } = await callFunction<{ url: string }>('create-checkout', { returnUrl: returnUrl() });
  if (Platform.OS === 'web') {
    window.location.href = url;
    return false;
  }
  const result = await WebBrowser.openAuthSessionAsync(url, returnUrl());
  if (result.type !== 'success' || !result.url.includes('status=success')) return false;
  return waitForPro();
}

/** El webhook puede tardar unos segundos: consultamos el perfil hasta ~15 s. */
export async function waitForPro(timeoutMs = 15000): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.from('profiles').select('is_pro').eq('id', userId).single();
    if (data?.is_pro) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

/** Portal de clientes de Stripe para cancelar o cambiar la tarjeta. */
export async function openBillingPortal() {
  const { url } = await callFunction<{ url: string }>('billing-portal', { returnUrl: returnUrl() });
  if (Platform.OS === 'web') {
    window.location.href = url;
    return;
  }
  await WebBrowser.openAuthSessionAsync(url, returnUrl());
}
