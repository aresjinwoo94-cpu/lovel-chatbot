import Stripe from 'npm:stripe@22.6.2';

import { HttpError, requireEnv } from './http.ts';
import { PRODUCTS } from './platino.ts';
import { admin, type ProfileRow } from './supabase.ts';

/**
 * Stripe (suscripción Pro $9.90/mes). Cliente fetch compatible con Deno.
 * Se crea al primer uso: si aún no hay STRIPE_SECRET_KEY la función responde
 * 503 BILLING_DISABLED (la app lo explica) en vez de fallar al arrancar.
 */
let client: Stripe | null = null;
function getStripe(): Stripe {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new HttpError(503, 'Los pagos todavía no están activados (falta STRIPE_SECRET_KEY en Supabase).', 'BILLING_DISABLED');
  return (client ??= new Stripe(key, { httpClient: Stripe.createFetchHttpClient() }));
}
export const stripe = new Proxy({} as Stripe, { get: (_t, prop) => Reflect.get(getStripe(), prop) });
export const cryptoProvider = Stripe.createSubtleCryptoProvider();


/** Solo redirigimos de vuelta a la app o a dominios permitidos (evita open redirects). */
export function assertAllowedReturnUrl(url: unknown): string {
  const allowed = (Deno.env.get('ALLOWED_RETURN_URLS') ?? 'lovelhouse://,exp://,http://localhost')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (typeof url !== 'string' || !allowed.some((p) => url.startsWith(p))) {
    throw new HttpError(400, 'URL de retorno no permitida (revisa ALLOWED_RETURN_URLS)');
  }
  return url;
}

/** URL intermedia (https) que Stripe acepta y que luego redirige a la app. */
export function returnViaFunction(to: string, status: string) {
  return `${requireEnv('SUPABASE_URL')}/functions/v1/checkout-return?status=${status}&to=${encodeURIComponent(to)}`;
}

export async function ensureCustomer(profile: ProfileRow, email: string | undefined): Promise<string> {
  if (profile.stripe_customer_id) return profile.stripe_customer_id;
  const customer = await stripe.customers.create({ email, metadata: { user_id: profile.id } });
  await admin.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', profile.id);
  return customer.id;
}

/**
 * Refleja el estado de la suscripción en profiles.is_pro y en el Platino del periodo:
 * activa → 1.500 Platino fijados una vez por periodo (la renovación llega como
 * customer.subscription.updated con un nuevo current_period_end); fin → se pierde
 * el Platino del periodo (el comprado se queda).
 */
export async function syncSubscription(sub: Stripe.Subscription, userIdHint?: string | null) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  // Suscripciones de otros productos en la misma cuenta de Stripe: no son nuestras.
  if (sub.metadata?.app && sub.metadata.app !== 'lovel-house') return;
  let userId = userIdHint ?? (sub.metadata?.user_id as string | undefined) ?? null;
  if (!userId) {
    const { data } = await admin.from('profiles').select('id').eq('stripe_customer_id', customerId).maybeSingle();
    userId = data?.id ?? null;
  }
  if (!userId) {
    console.warn('Suscripción sin usuario asociado', sub.id);
    return;
  }
  const periodEnd = sub.items.data[0]?.current_period_end;
  const isPro = sub.status === 'active' || sub.status === 'trialing';
  const { error } = await admin
    .from('profiles')
    .update({
      is_pro: isPro,
      subscription_status: sub.status,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq('id', userId);
  if (error) throw error;
  if (isPro && periodEnd) {
    const until = new Date(periodEnd * 1000).toISOString();
    const { error: e2 } = await admin.rpc('platino_set_sub', {
      p_user: userId,
      p_amount: PRODUCTS.pro.platinoPerMonth,
      p_until: until,
      p_ref: `stripe:sub:${sub.id}:${periodEnd}`,
      p_source: 'stripe',
    });
    if (e2) throw e2;
  } else if (!isPro) {
    const { error: e3 } = await admin.rpc('platino_end_sub', { p_user: userId });
    if (e3) throw e3;
  }
}

/** Paquete pagado: acredita su Platino una sola vez (la referencia es la sesión de pago). */
export async function creditPack(session: Stripe.Checkout.Session) {
  const product = session.metadata?.product;
  const userId = session.client_reference_id ?? session.metadata?.user_id;
  if (session.metadata?.app !== 'lovel-house' || !userId || (product !== 'pack_400' && product !== 'pack_1200')) return;
  if (session.payment_status !== 'paid') return; // pagos diferidos: llegarán con async_payment_succeeded
  const { data, error } = await admin.rpc('platino_credit', {
    p_user: userId,
    p_bucket: 'bought',
    p_amount: PRODUCTS[product].platino,
    p_reason: 'purchase',
    p_ref: `stripe:checkout:${session.id}`,
    p_source: 'stripe',
  });
  if (error) throw error;
  console.log(JSON.stringify({ platino_pack: { user: userId, product, credited: data } }));
}
