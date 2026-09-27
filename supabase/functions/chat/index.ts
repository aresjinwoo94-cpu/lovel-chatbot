/**
 * POST /chat  { avatarId, text }
 * Mensaje de texto → respuesta cálida del avatar (Claude) según su situación.
 */
import { replyAsAvatar, saveExchange } from '../_shared/companion.ts';
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { assertCanChat } from '../_shared/quota.ts';
import { getConversationId, getOwnedAvatar, getProfile, requireUser } from '../_shared/supabase.ts';

serve(async (req) => {
  const user = await requireUser(req);
  const { avatarId, text } = await readJson<{ avatarId?: string; text?: string }>(req);
  const body = text?.trim() ?? '';
  if (!avatarId || !body) throw new HttpError(400, 'Mensaje vacío');
  if (body.length > 4000) throw new HttpError(400, 'Mensaje demasiado largo');

  const profile = await getProfile(user.id);
  assertCanChat(profile);
  const avatar = await getOwnedAvatar(user.id, avatarId);
  const conversationId = await getConversationId(avatarId);

  const reply = await replyAsAvatar({ avatar, profile, userText: body });

  const result = await saveExchange({
    avatar,
    profile,
    conversationId,
    user: { role: 'user', kind: 'text', content: body },
    reply: { role: 'avatar', kind: 'text', content: reply },
  });
  return json(result);
});
