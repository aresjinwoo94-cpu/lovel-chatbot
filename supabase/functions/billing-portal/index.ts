/**
 * POST /billing-portal  { returnUrl }
 * Portal de Stripe para cancelar la suscripción o cambiar la tarjeta.
 */
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { assertAllowedReturnUrl, returnViaFunction, stripe } from '../_shared/stripe.ts';
import { getProfile, requireUser } from '../_shared/supabase.ts';

serve(async (req) => {
  const user = await requireUser(req);
  const { returnUrl } = await readJson<{ returnUrl?: string }>(req);
  const to = assertAllowedReturnUrl(returnUrl);
  const profile = await getProfile(user.id);
  if (!profile.stripe_customer_id) throw new HttpError(400, 'Aún no tienes una suscripción');
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: returnViaFunction(to, 'portal'),
  });
  return json({ url: session.url });
});
