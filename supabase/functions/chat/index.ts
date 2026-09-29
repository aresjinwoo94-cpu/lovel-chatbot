/**
 * POST /chat  { avatarId, text }
 * Mensaje de texto → respuesta del personaje, fiel a su personalidad y a la escena.
 * El cupo gratuito se reserva antes (atómico) y se devuelve si algo falla.
 */
import { replyAsAvatar, saveExchange } from '../_shared/companion.ts';
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { refundFree, reserveFree } from '../_shared/quota.ts';
import { getConversationId, getOwnedAvatar, getProfile, requireUser } from '../_shared/supabase.ts';

serve(async (req) => {
  const user = await requireUser(req);
  const { avatarId, text } = await readJson<{ avatarId?: string; text?: string }>(req);
  const body = text?.trim() ?? '';
  if (!avatarId || !body) throw new HttpError(400, 'Mensaje vacío');
  if (body.length > 4000) throw new HttpError(400, 'Mensaje demasiado largo');

  const profile = await getProfile(user.id);
  const avatar = await getOwnedAvatar(user.id, avatarId);
  const conversationId = await getConversationId(avatarId);
  const quota = await reserveFree(profile, 'text');

  try {
    const reply = await replyAsAvatar({ avatar, profile, userText: body });
    const result = await saveExchange({
      avatar,
      profile,
      conversationId,
      quota,
      user: { role: 'user', kind: 'text', content: body },
      reply: { role: 'avatar', kind: 'text', content: reply },
    });
    return json(result);
  } catch (e) {
    await refundFree(profile, 'text');
    throw e;
  }
});
