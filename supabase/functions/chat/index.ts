/**
 * POST /chat  { avatarId, text }
 * Mensaje de texto → respuesta del personaje, fiel a su personalidad y a la escena.
 * Cuesta 1 Platino: se descuenta antes (atómico) y se devuelve si algo falla.
 */
import { replyAsAvatar, saveExchange } from '../_shared/companion.ts';
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { refundPlatino, spendPlatino } from '../_shared/platino.ts';
import { getConversationId, getOwnedAvatar, getProfile, requireAdult, requireUser } from '../_shared/supabase.ts';

serve(async (req) => {
  const user = await requireUser(req);
  const { avatarId, text, adultConfirmed } = await readJson<{ avatarId?: string; text?: string; adultConfirmed?: boolean }>(req);
  const body = text?.trim() ?? '';
  if (!avatarId || !body) throw new HttpError(400, 'Mensaje vacío');
  if (body.length > 4000) throw new HttpError(400, 'Mensaje demasiado largo');

  const profile = await getProfile(user.id);
  await requireAdult(profile, adultConfirmed);
  const avatar = await getOwnedAvatar(user.id, avatarId);
  const conversationId = await getConversationId(avatarId);
  const spent = await spendPlatino(user.id, 'text', !!user.is_anonymous);

  try {
    const reply = await replyAsAvatar({ avatar, profile, userText: body });
    const result = await saveExchange({
      avatar,
      profile,
      conversationId,
      platino: spent.state,
      user: { role: 'user', kind: 'text', content: body },
      reply: { role: 'avatar', kind: 'text', content: reply.text },
    });
    // Respuesta de cortesía (la IA no respondió de verdad): no se cobra.
    if (reply.declined) result.platino = (await refundPlatino(spent.ledgerId)) ?? result.platino;
    return json(result);
  } catch (e) {
    await refundPlatino(spent.ledgerId);
    throw e;
  }
});
