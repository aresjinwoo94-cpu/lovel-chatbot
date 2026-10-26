import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { ApiError, callFunction } from './api';
import { supabase } from './supabase';
import { track } from './analytics';

import type { ProductId } from './platino';

const returnUrl = () => (Platform.OS === 'web' ? `${window.location.origin}/pro` : Linking.createURL('pro'));

export const isBillingDisabled = (e: unknown) => e instanceof ApiError && (e.code === 'BILLING_DISABLED' || /STRIPE_SECRET_KEY/.test(e.message));

/** Texto amable si no se pudo abrir el pago (sin detalles técnicos): sin conexión o fallo del servidor. */
export function checkoutErrorKey(e: unknown): 'billing.disabled' | 'billing.offline' | 'billing.failed' | 'billing.subPending' {
  if (isBillingDisabled(e)) return 'billing.disabled';
  if (e instanceof ApiError && e.code === 'SUB_PENDING') return 'billing.subPending';
  return e instanceof ApiError && e.status > 0 ? 'billing.failed' : 'billing.offline';
}

/** Lo que se acreditó al volver de Stripe (lo hace el webhook): Pro o un paquete con su Platino. */
export type Purchase = { kind: 'pro' } | { kind: 'pack'; platino: number };

const SINCE_KEY = 'lovel.checkout.since';
/** Desde cuándo buscamos el crédito (en web la página se recarga al volver de Stripe). */
function markCheckoutStart(): string {
  const since = new Date(Date.now() - 2 * 60000).toISOString(); // margen por reloj del dispositivo
  try {
    if (Platform.OS === 'web') window.sessionStorage.setItem(SINCE_KEY, since);
  } catch {
    // sin almacenamiento: al volver buscamos en la última media hora
  }
  return since;
}
export function checkoutSince(): string {
  try {
    const v = Platform.OS === 'web' ? window.sessionStorage.getItem(SINCE_KEY) : null;
    if (v) return v;
  } catch {
    // ídem
  }
  return new Date(Date.now() - 30 * 60000).toISOString();
}

/**
 * Abre Stripe Checkout en un navegador seguro: Pro ($9.90/mes) o un paquete de Platino.
 * En la app devuelve lo acreditado al volver (o null si se canceló o aún no llegó);
 * en web la página se va a Stripe y la confirmación la hace /pro al volver.
 * Nota para tiendas: en una app de Google Play o App Store esto tendrá que ir por su
 * sistema de compras (el servidor ya acepta su origen en el registro de Platino).
 */
export async function startCheckout(product: ProductId = 'pro'): Promise<Purchase | null> {
  track('checkout_started', { product });
  const { url } = await callFunction<{ url: string }>('create-checkout', { returnUrl: returnUrl(), product });
  const since = markCheckoutStart();
  if (Platform.OS === 'web') {
    window.location.href = url;
    return null;
  }
  const result = await WebBrowser.openAuthSessionAsync(url, returnUrl());
  if (result.type !== 'success' || !result.url.includes('status=success')) return null;
  return waitForPurchase(since);
}
/** Compatibilidad: el botón de Pro de siempre. */
export const startProCheckout = () => startCheckout('pro');

/**
 * El webhook puede tardar unos segundos: buscamos en el registro de Platino (solo los
 * movimientos propios) un crédito de Stripe posterior al inicio del pago, hasta ~15 s.
 */
export async function waitForPurchase(since: string, timeoutMs = 15000): Promise<Purchase | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const start = Date.now();
  for (;;) {
    const { data } = await supabase
      .from('platino_ledger')
      .select('reason, delta')
      .eq('user_id', userId)
      .eq('source', 'stripe')
      .in('reason', ['purchase', 'subscription'])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1);
    const row = data?.[0];
    if (row) {
      track('checkout_completed', { product: row.reason === 'purchase' ? 'pack' : 'pro' });
      try {
        if (Platform.OS === 'web') window.sessionStorage.removeItem(SINCE_KEY);
      } catch {
        // nada
      }
      return row.reason === 'purchase' ? { kind: 'pack', platino: row.delta } : { kind: 'pro' };
    }
    if (Date.now() - start > timeoutMs) return null;
    await new Promise((r) => setTimeout(r, 1500));
  }
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
