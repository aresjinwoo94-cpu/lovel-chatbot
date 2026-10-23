/**
 * POST /admin-stats  { days?: number }
 * Datos del panel privado (/admin): visitas, países, tiempo en la app, embudo hasta el checkout…
 * Solo responde a las cuentas de ADMIN_EMAILS (secreto de Supabase, separadas por comas; por
 * defecto, la del responsable del servicio) y con el correo verificado.
 */
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { admin, requireUser } from '../_shared/supabase.ts';

const ADMINS = (Deno.env.get('ADMIN_EMAILS') ?? 'aresjinwoo94@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

serve(async (req) => {
  const user = await requireUser(req);
  const email = user.email?.toLowerCase();
  const verified = !!(user.email_confirmed_at || user.confirmed_at);
  if (!email || !verified || !ADMINS.includes(email)) throw new HttpError(403, 'Solo para administración');

  const { days } = await readJson<{ days?: number }>(req).catch(() => ({ days: 30 }));
  const range = Math.min(365, Math.max(1, Math.round(Number(days) || 30)));
  const { data, error } = await admin.rpc('analytics_summary', { p_days: range });
  if (error) throw error;
  return json(data);
});
