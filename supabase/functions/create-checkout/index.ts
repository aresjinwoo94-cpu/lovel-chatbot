/**
 * POST /create-checkout  { returnUrl }
 * Crea una sesión de Stripe Checkout para la suscripción Pro: $9.90 USD/mes.
 * Solo suscripción (nada de pagos únicos). Si activas "Adaptive Pricing" en
 * Stripe, cada persona ve el equivalente en su moneda local.
 */
import { json, readJson, serve } from '../_shared/http.ts';
import { assertAllowedReturnUrl, ensureCustomer, PRO_PRICE_CENTS, returnViaFunction, stripe } from '../_shared/stripe.ts';
import { getProfile, requireUser } from '../_shared/supabase.ts';

serve(async (req) => {
  const user = await requireUser(req);
  const { returnUrl } = await readJson<{ returnUrl?: string }>(req);
  const to = assertAllowedReturnUrl(returnUrl);
  const profile = await getProfile(user.id);
  if (profile.is_pro) return json({ url: `${to}${to.includes('?') ? '&' : '?'}status=success` });

  const customer = await ensureCustomer(profile, user.email);
  const priceId = Deno.env.get('STRIPE_PRICE_ID');

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: [
      priceId
        ? { price: priceId, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: PRO_PRICE_CENTS,
              recurring: { interval: 'month' },
              product_data: {
                name: 'Lovel House Pro',
                description: 'Conversaciones ilimitadas, más avatares, memoria y notas de voz sin límite.',
              },
            },
          },
    ],
    // La cuenta de Stripe puede ser compartida con otros productos: marcamos lo nuestro.
    subscription_data: { metadata: { user_id: user.id, app: 'lovel-house' } },
    metadata: { user_id: user.id, app: 'lovel-house' },
    allow_promotion_codes: true,
    success_url: returnViaFunction(to, 'success'),
    cancel_url: returnViaFunction(to, 'cancel'),
  });

  return json({ url: session.url });
});
