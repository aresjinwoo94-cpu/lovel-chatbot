/**
 * POST /generate-avatar  { avatarId }   (solo Pro)
 * Retrato ilustrado con Leonardo.ai en el estilo exacto de la referencia:
 * 2D cartoon simple, líneas limpias, fondo degradado, expresión suave.
 * Usa prompt negativo para evitar realismo, 3D, anime pesado y artefactos de IA.
 */
import { HttpError, json, readJson, requireEnv, serve } from '../_shared/http.ts';
import { HAIR, OUTFIT, SKIN, nameOf } from '../_shared/palette.ts';
import { admin, getOwnedAvatar, getProfile, requireUser } from '../_shared/supabase.ts';
import { buildPortraitPrompt } from '../_shared/systemPrompts.tsx';

const LEONARDO = 'https://cloud.leonardo.ai/api/rest/v1';
// Leonardo Phoenix 1.0 (cámbialo con LEONARDO_MODEL_ID si prefieres otro modelo).
const MODEL_ID = Deno.env.get('LEONARDO_MODEL_ID') ?? 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3';

const hairStyleWords: Record<string, string> = {
  long: 'long straight side-parted',
  bob: 'chin-length bob',
  curly: 'voluminous curly',
  bun: 'top bun',
  short: 'short tidy',
  buzz: 'buzz cut',
};

serve(async (req) => {
  const user = await requireUser(req);
  const { avatarId } = await readJson<{ avatarId?: string }>(req);
  if (!avatarId) throw new HttpError(400, 'Falta avatarId');

  const profile = await getProfile(user.id);
  if (!profile.is_pro) throw new HttpError(402, 'Los retratos ilustrados son parte de Pro', 'PAYWALL');
  const avatar = await getOwnedAvatar(user.id, avatarId);
  const a = avatar.appearance as Record<string, unknown>;

  const { prompt, negativePrompt } = buildPortraitPrompt({
    gender: avatar.gender,
    age: avatar.age,
    appearance: {
      hairStyle: hairStyleWords[String(a.hairStyle)] ?? 'long',
      hairColorName: nameOf(HAIR, a.hairColor, 'brown'),
      skinToneName: nameOf(SKIN, a.skinTone, 'light'),
      outfitColorName: nameOf(OUTFIT, a.outfitColor, 'cream'),
      glasses: !!a.glasses,
      freckles: !!a.freckles,
      beard: !!a.beard,
    },
    appearance_description: avatar.appearance_description,
  });

  const headers = { authorization: `Bearer ${requireEnv('LEONARDO_API_KEY')}`, 'content-type': 'application/json', accept: 'application/json' };

  // 1) Lanzar la generación
  const start = await fetch(`${LEONARDO}/generations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, negative_prompt: negativePrompt, modelId: MODEL_ID, width: 768, height: 768, num_images: 1 }),
  });
  if (!start.ok) throw new HttpError(502, `Leonardo: ${start.status} ${await start.text()}`);
  const generationId: string | undefined = (await start.json())?.sdGenerationJob?.generationId;
  if (!generationId) throw new HttpError(502, 'Leonardo no devolvió un id de generación');

  // 2) Esperar el resultado (normalmente 10–30 s)
  let imageUrl: string | null = null;
  for (let i = 0; i < 30 && !imageUrl; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`${LEONARDO}/generations/${generationId}`, { headers });
    if (!res.ok) continue;
    const gen = (await res.json())?.generations_by_pk;
    if (gen?.status === 'FAILED') throw new HttpError(502, 'Leonardo no pudo generar el retrato');
    if (gen?.status === 'COMPLETE') imageUrl = gen.generated_images?.[0]?.url ?? null;
  }
  if (!imageUrl) throw new HttpError(504, 'El retrato tardó demasiado. Inténtalo de nuevo.');

  // 3) Guardarlo en nuestro Storage y asociarlo al avatar
  const img = new Uint8Array(await (await fetch(imageUrl)).arrayBuffer());
  const path = `${user.id}/${avatar.id}-${Date.now()}.jpg`;
  const { error: upErr } = await admin.storage.from('avatar-portraits').upload(path, img, { contentType: 'image/jpeg', upsert: true });
  if (upErr) throw upErr;
  const publicUrl = admin.storage.from('avatar-portraits').getPublicUrl(path).data.publicUrl;
  await admin.from('avatars').update({ avatar_image_url: publicUrl }).eq('id', avatar.id);

  return json({ avatar_image_url: publicUrl });
});
