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

const SINCE_KEY = 'lovel.checkout.after';
/** Último crédito de Stripe antes de pagar: al volver buscamos uno posterior. */
type Baseline = { afterId: number } | { since: string };

async function lastStripeCredit(): Promise<number> {
  const { data } = await supabase.from('platino_ledger').select('id').eq('source', 'stripe').order('id', { ascending: false }).limit(1);
  return data?.[0]?.id ?? 0;
}
async function markCheckoutStart(): Promise<Baseline> {
  const afterId = await lastStripeCredit().catch(() => 0);
  try {
    if (Platform.OS === 'web') window.sessionStorage.setItem(SINCE_KEY, String(afterId));
  } catch {
    // sin almacenamiento: al volver buscamos en la última media hora
  }
  return { afterId };
}
/** En web, al volver de Stripe (la página se recargó). */
export function checkoutBaseline(): Baseline {
  try {
    const v = Platform.OS === 'web' ? window.sessionStorage.getItem(SINCE_KEY) : null;
    if (v) return { afterId: Number(v) };
  } catch {
    // ídem
  }
  return { since: new Date(Date.now() - 30 * 60000).toISOString() };
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
  const since = await markCheckoutStart();
  const { url } = await callFunction<{ url: string }>('create-checkout', { returnUrl: returnUrl(), product });
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
 * movimientos propios) un crédito de Stripe posterior al último que había antes de pagar, hasta ~15 s.
 */
export async function waitForPurchase(since: Baseline, timeoutMs = 15000): Promise<Purchase | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const start = Date.now();
  for (;;) {
    let q = supabase.from('platino_ledger').select('reason, delta').eq('user_id', userId).eq('source', 'stripe').in('reason', ['purchase', 'subscription']);
    q = 'afterId' in since ? q.gt('id', since.afterId) : q.gte('created_at', since.since);
    const { data } = await q.order('id', { ascending: false }).limit(1);
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
