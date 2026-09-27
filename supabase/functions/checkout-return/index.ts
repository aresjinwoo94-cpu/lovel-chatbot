/**
 * GET /checkout-return?status=success&to=lovelhouse://pro
 * Stripe exige URLs https: esta función recibe el retorno y redirige a la app
 * (deep link) o a la web. Se despliega con --no-verify-jwt.
 */
import { corsHeaders, json } from '../_shared/http.ts';
import { assertAllowedReturnUrl } from '../_shared/stripe.ts';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  const status = (url.searchParams.get('status') ?? 'success').replace(/[^a-z]/g, '');
  try {
    const to = assertAllowedReturnUrl(url.searchParams.get('to'));
    const target = `${to}${to.includes('?') ? '&' : '?'}status=${status}`;
    return new Response(null, { status: 303, headers: { Location: target } });
  } catch {
    return json({ error: 'Destino no permitido' }, 400);
  }
});
