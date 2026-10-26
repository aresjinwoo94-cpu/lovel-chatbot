import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { ApiError, callFunction } from './api';
import { supabase } from './supabase';
import { track } from './analytics';

import type { ProductId } from './platino';

const returnUrl = () => (Platform.OS === 'web' ? `${window.location.origin}/pro` : Linking.createURL('pro'));

export const isBillingDisabled = (e: unknown) => e instanceof ApiError && (e.code === 'BILLING_DISABLED' || /STRIPE_SECRET_KEY/.test(e.message));

/**
 * Abre Stripe Checkout en un navegador seguro: Pro ($9.90/mes) o un paquete de Platino.
 * Devuelve true si al volver ya está acreditado (lo hace el webhook de Stripe).
 * Nota para tiendas: en una app de Google Play o App Store esto tendrá que ir por su
 * sistema de compras (el servidor ya acepta su origen en el registro de Platino).
 */
export async function startCheckout(product: ProductId = 'pro'): Promise<boolean> {
  track('checkout_started', { product });
  const { url } = await callFunction<{ url: string }>('create-checkout', { returnUrl: returnUrl(), product });
  if (Platform.OS === 'web') {
    window.location.href = url;
    return false;
  }
  const result = await WebBrowser.openAuthSessionAsync(url, returnUrl());
  if (result.type !== 'success' || !result.url.includes('status=success')) return false;
  return product === 'pro' ? waitForPro() : waitForPlatino();
}
/** Compatibilidad: el botón de Pro de siempre. */
export const startProCheckout = () => startCheckout('pro');

/** El webhook puede tardar unos segundos: consultamos el perfil hasta ~15 s. */
export async function waitForPro(timeoutMs = 15000): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.from('profiles').select('is_pro').eq('id', userId).single();
    if (data?.is_pro) {
      track('checkout_completed');
      return true;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

/** Tras comprar un paquete: espera a que el webhook acredite el Platino comprado (~15 s). */
export async function waitForPlatino(timeoutMs = 15000): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;
  const first = await supabase.from('profiles').select('platino_bought').eq('id', userId).single();
  const before = first.data?.platino_bought ?? 0;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 1500));
    const { data } = await supabase.from('profiles').select('platino_bought').eq('id', userId).single();
    if ((data?.platino_bought ?? 0) > before) {
      track('checkout_completed', { product: 'pack' });
      return true;
    }
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
