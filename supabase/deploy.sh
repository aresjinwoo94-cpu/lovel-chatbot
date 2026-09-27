#!/usr/bin/env bash
# Despliega Lovel House en tu proyecto de Supabase (ya enlazado con `supabase link`).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Aplicando migraciones…"
supabase db push

if [ -f supabase/.env ]; then
  echo "→ Subiendo secretos…"
  supabase secrets set --env-file supabase/.env
fi

echo "→ Desplegando Edge Functions…"
for fn in chat voice-chat analyze-appearance generate-avatar create-checkout billing-portal delete-data; do
  supabase functions deploy "$fn"
done
supabase functions deploy checkout-return --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt

echo "✓ Listo. Webhook de Stripe: https://<tu-proyecto>.supabase.co/functions/v1/stripe-webhook"
