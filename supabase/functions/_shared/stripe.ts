import Stripe from 'npm:stripe@22.6.2';

import { HttpError, requireEnv } from './http.ts';
import { admin, type ProfileRow } from './supabase.ts';

/** Stripe (suscripción Pro $9.90/mes). Cliente fetch compatible con Deno. */
export const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), { httpClient: Stripe.createFetchHttpClient() });
export const cryptoProvider = Stripe.createSubtleCryptoProvider();

export const PRO_PRICE_CENTS = 990;

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

/** Refleja el estado de la suscripción en profiles.is_pro. */
export async function syncSubscription(sub: Stripe.Subscription, userIdHint?: string | null) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
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
}
