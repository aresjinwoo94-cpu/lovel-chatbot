/**
 * POST /proactive-off?t=<avatarId.firma>&lang=es|en
 * WP-12: "Que no me escriba" desde la notificación, a un toque y sin iniciar sesión.
 * El enlace va firmado (solo sirve para ese personaje) y solo puede apagar, nunca encender.
 */
import { corsHeaders, HttpError, json, serve } from '../_shared/http.ts';
import { checkOffToken } from '../_shared/push.ts';
import { admin } from '../_shared/supabase.ts';

const TEXT = {
  es: { ask: '¿Quieres que este personaje deje de escribirte por su cuenta?', yes: 'Sí, que no me escriba', done: 'Listo. Ya no te escribirá por su cuenta.' },
  en: { ask: 'Do you want this character to stop writing to you first?', yes: 'Yes, stop writing first', done: 'Done. They won’t write to you first anymore.' },
};
const page = (body: string, lang: 'es' | 'en') =>
  new Response(`<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Lovel House</title><body style="font-family:system-ui;padding:24px;max-width:480px;margin:auto">${body}</body></html>`, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });

serve(async (req) => {
  const url = new URL(req.url);
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'es';
  const avatarId = await checkOffToken(url.searchParams.get('t') ?? '');
  if (!avatarId) throw new HttpError(400, 'Enlace no válido');
  const t = TEXT[lang];
  // Un GET (vista previa de un enlace) no cambia nada: pide confirmar con un botón.
  if (req.method === 'GET') return page(`<form method="post"><p>${t.ask}</p><button style="font-size:16px;padding:10px 16px">${t.yes}</button></form>`, lang);
  const { error } = await admin.from('avatars').update({ proactive_mode: 'off' }).eq('id', avatarId);
  if (error) throw error;
  if ((req.headers.get('content-type') ?? '').includes('form')) return page(`<p>${t.done}</p>`, lang);
  return json({ ok: true });
});
