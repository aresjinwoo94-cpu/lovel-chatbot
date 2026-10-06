/**
 * POST /stripe-webhook  (Stripe → Supabase, se despliega con --no-verify-jwt)
 * Activa o desactiva Pro según el estado real de la suscripción.
 * Eventos: checkout.session.completed, customer.subscription.created/updated/deleted
 */
import { json, requireEnv } from '../_shared/http.ts';
import { cryptoProvider, stripe, syncSubscription } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  if (!signature) return json({ error: 'Falta la firma' }, 400);
  const body = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, requireEnv('STRIPE_WEBHOOK_SECRET'), undefined, cryptoProvider);
  } catch (e) {
    return json({ error: `Firma inválida: ${e instanceof Error ? e.message : e}` }, 400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // Cuenta compartida: solo las compras hechas desde Lovel House.
        if (session.mode === 'subscription' && session.subscription && session.metadata?.app === 'lovel-house') {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub, session.client_reference_id);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error(e);
    return json({ error: 'Error procesando el evento' }, 500);
  }
  return json({ received: true });
});
