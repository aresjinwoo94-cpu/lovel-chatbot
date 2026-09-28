/**
 * POST /delete-data  { scope: 'conversations' | 'account' }
 * Privacidad: borra todas las conversaciones y audios, o la cuenta completa.
 */
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { admin, getProfile, requireUser } from '../_shared/supabase.ts';

/** Lista recursivamente todos los archivos bajo una carpeta de un bucket. */
async function listAll(bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return out;
  for (const item of data) {
    const path = `${prefix}/${item.name}`;
    if (item.id === null) out.push(...(await listAll(bucket, path))); // carpeta
    else out.push(path);
  }
  return out;
}

async function removeFolder(bucket: string, prefix: string) {
  const files = await listAll(bucket, prefix);
  for (let i = 0; i < files.length; i += 100) {
    await admin.storage.from(bucket).remove(files.slice(i, i + 100));
  }
}

serve(async (req) => {
  const user = await requireUser(req);
  const { scope } = await readJson<{ scope?: string }>(req);
  if (scope !== 'conversations' && scope !== 'account') throw new HttpError(400, 'scope inválido');

  await removeFolder('voice-messages', user.id);
  const { error } = await admin.from('messages').delete().eq('user_id', user.id);
  if (error) throw error;
  await admin.from('avatars').update({ memory: null, last_message_at: null }).eq('user_id', user.id);

  if (scope === 'account') {
    const profile = await getProfile(user.id);
    if (profile.stripe_customer_id && Deno.env.get('STRIPE_SECRET_KEY')) {
      const { stripe } = await import('../_shared/stripe.ts');
      const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'active' });
      for (const s of subs.data) await stripe.subscriptions.cancel(s.id);
    }
    await removeFolder('avatar-portraits', user.id);
    await removeFolder('vrm-custom', user.id);
    // Borra el usuario: por cascada se van perfil, avatares, conversaciones y mensajes.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) throw delErr;
  }
  return json({ ok: true });
});
