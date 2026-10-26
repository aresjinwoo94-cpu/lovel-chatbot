/**
 * POST /proactive-off?t=<avatarId.firma>
 * WP-12: "Que no me escriba" desde la notificación, a un toque y sin iniciar sesión.
 * El enlace va firmado (solo sirve para ese personaje) y solo puede apagar, nunca encender.
 */
import { corsHeaders, HttpError, json, serve } from '../_shared/http.ts';
import { checkOffToken } from '../_shared/push.ts';
import { admin } from '../_shared/supabase.ts';

serve(async (req) => {
  const token = new URL(req.url).searchParams.get('t') ?? '';
  const avatarId = await checkOffToken(token);
  if (!avatarId) throw new HttpError(400, 'Enlace no válido');
  if (req.method === 'GET') {
    // Un GET (vista previa de un enlace) no cambia nada: pide confirmar con un botón.
    return new Response(
      `<!doctype html><meta name="viewport" content="width=device-width"><title>Lovel House</title><body style="font-family:system-ui;padding:24px">` +
        `<form method="post"><p>¿Quieres que este personaje deje de escribirte por su cuenta?</p><button style="font-size:16px;padding:10px 16px">Sí, que no me escriba</button></form></body>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
  const { error } = await admin.from('avatars').update({ proactive_mode: 'off' }).eq('id', avatarId);
  if (error) throw error;
  if ((req.headers.get('content-type') ?? '').includes('form')) {
    return new Response(`<!doctype html><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;padding:24px"><p>Listo. Ya no te escribirá por su cuenta.</p></body>`, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
  return json({ ok: true });
});
