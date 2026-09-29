/**
 * POST /start-chat  { avatarId }
 * El personaje envía el PRIMER mensaje de la historia, coherente con su
 * personalidad y el escenario. Idempotente: si ya hay mensajes, no hace nada.
 * No cuenta para el plan gratuito.
 */
import { openScene } from '../_shared/companion.ts';
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { quotaState } from '../_shared/quota.ts';
import { getConversationId, getOwnedAvatar, getProfile, requireUser } from '../_shared/supabase.ts';

serve(async (req) => {
  const user = await requireUser(req);
  const { avatarId } = await readJson<{ avatarId?: string }>(req);
  if (!avatarId) throw new HttpError(400, 'Falta el personaje');

  const profile = await getProfile(user.id);
  const avatar = await getOwnedAvatar(user.id, avatarId);
  const conversationId = await getConversationId(avatarId);
  const message = await openScene({ avatar, profile, conversationId });
  return json({ message, quota: quotaState(profile) });
});
