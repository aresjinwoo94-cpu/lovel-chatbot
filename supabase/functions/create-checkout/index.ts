/**
 * POST /create-checkout  { returnUrl, product? }
 * Stripe Checkout para lo que se vende (WP-11):
 *  - "pro" (por defecto): suscripción Pro $9.90 USD/mes → 1.500 Platino al mes + 40 diarios.
 *  - "pack_400" ($1.99) y "pack_1200" ($4.99): pago único; el Platino comprado no caduca.
 * El webhook acredita el Platino una sola vez por pago. Si activas "Adaptive Pricing" en
 * Stripe, cada persona ve el equivalente en su moneda local.
 * Nota para tiendas: dentro de una app de Google Play o App Store, Pro y los paquetes
 * tendrán que ir por sus sistemas de compra; el crédito pasa igual por platino_credit /
 * platino_set_sub con source "google_play" / "app_store".
 */
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { isPack, PRODUCTS, type ProductId } from '../_shared/platino.ts';
import { assertAllowedReturnUrl, ensureCustomer, returnViaFunction, stripe } from '../_shared/stripe.ts';
import { getProfile, requireUser } from '../_shared/supabase.ts';

serve(async (req) => {
  const user = await requireUser(req);
  if (user.is_anonymous) throw new HttpError(403, 'Crea tu cuenta antes de comprar.', 'NEEDS_ACCOUNT');
  const { returnUrl, product = 'pro' } = await readJson<{ returnUrl?: string; product?: string }>(req);
  if (!(product in PRODUCTS)) throw new HttpError(400, 'Producto no disponible');
  const id = product as ProductId;
  const to = assertAllowedReturnUrl(returnUrl);
  const profile = await getProfile(user.id);
  if (id === 'pro' && profile.is_pro) return json({ url: `${to}${to.includes('?') ? '&' : '?'}status=success` });

  const customer = await ensureCustomer(profile, user.email);
  // La cuenta de Stripe puede ser compartida con otros productos: marcamos lo nuestro.
  const metadata = { user_id: user.id, app: 'lovel-house', product: id };

  if (isPack(id)) {
    const pack = PRODUCTS[id];
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer,
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: pack.cents,
            product_data: { name: pack.name, description: `${pack.platino} Platino para Lovel House. No caduca.` },
          },
        },
      ],
      payment_intent_data: { metadata },
      metadata,
      success_url: returnViaFunction(to, 'success'),
      cancel_url: returnViaFunction(to, 'cancel'),
    });
    return json({ url: session.url });
  }

  const pro = PRODUCTS.pro;
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
              unit_amount: pro.cents,
              recurring: { interval: 'month' },
              product_data: {
                name: pro.name,
                description: `${pro.platinoPerMonth} Platino al mes + 40 Platino gratis cada día, notas de voz y memoria de la historia.`,
              },
            },
          },
    ],
    subscription_data: { metadata },
    metadata,
    allow_promotion_codes: true,
    success_url: returnViaFunction(to, 'success'),
    cancel_url: returnViaFunction(to, 'cancel'),
  });

  return json({ url: session.url });
});
