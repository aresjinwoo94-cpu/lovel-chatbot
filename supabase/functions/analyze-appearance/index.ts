/**
 * POST /analyze-appearance  { imageBase64, mediaType, gender, note? }
 * "Subir foto + descripción simple": la IA (visión de Gemini o Claude) traduce
 * la foto a rasgos del avatar 2D. La foto NO se guarda en ningún lado.
 */
import { z } from 'npm:zod@4';

import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { analyzeImageToJson, type JsonSchema } from '../_shared/llm.ts';
import { EYES, HAIR, HAIR_STYLES, OUTFIT, SKIN } from '../_shared/palette.ts';
import { requireUser } from '../_shared/supabase.ts';
import { APPEARANCE_ANALYSIS_PROMPT } from '../_shared/systemPrompts.tsx';

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

/** Esquema que se pide a la IA (mismo formato para ambos proveedores). */
const SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    skin: { type: 'string', enum: keys(SKIN) },
    hair_color: { type: 'string', enum: keys(HAIR) },
    hair_style: { type: 'string', enum: [...HAIR_STYLES] },
    eyes: { type: 'string', enum: keys(EYES) },
    outfit: { type: 'string', enum: keys(OUTFIT) },
    glasses: { type: 'boolean' },
    freckles: { type: 'boolean' },
    beard: { type: 'boolean' },
    description: { type: 'string' },
  },
  required: ['skin', 'hair_color', 'hair_style', 'eyes', 'outfit', 'glasses', 'freckles', 'beard', 'description'],
};

/** Validación estricta de lo que devuelve la IA. */
const Traits = z.object({
  skin: z.enum(keys(SKIN)),
  hair_color: z.enum(keys(HAIR)),
  hair_style: z.enum(HAIR_STYLES),
  eyes: z.enum(keys(EYES)),
  outfit: z.enum(keys(OUTFIT)),
  glasses: z.boolean(),
  freckles: z.boolean(),
  beard: z.boolean(),
  description: z.string(),
});

const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

serve(async (req) => {
  await requireUser(req);
  const { imageBase64, mediaType = 'image/jpeg', gender = 'female', note } = await readJson<{
    imageBase64?: string;
    mediaType?: string;
    gender?: string;
    note?: string;
  }>(req);
  if (!imageBase64) throw new HttpError(400, 'Falta la imagen');
  const media: MediaType = (MEDIA_TYPES as readonly string[]).includes(mediaType) ? (mediaType as MediaType) : 'image/jpeg';

  const raw = await analyzeImageToJson({
    prompt: `${APPEARANCE_ANALYSIS_PROMPT}\nGénero elegido para el avatar: ${gender}.${note?.trim() ? `\nNota de la persona: ${note.trim()}` : ''}`,
    imageBase64,
    mediaType: media,
    schema: SCHEMA,
  });
  const parsed = Traits.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(422, 'No pudimos inspirarnos en esta foto. Prueba con otra o elige los rasgos a mano.');
  }
  const t = parsed.data;
  return json({
    appearance: {
      skinTone: SKIN[t.skin],
      hairColor: HAIR[t.hair_color],
      hairStyle: t.hair_style,
      eyeColor: EYES[t.eyes],
      outfitColor: OUTFIT[t.outfit],
      glasses: t.glasses,
      freckles: t.freckles,
      beard: gender === 'female' ? false : t.beard,
    },
    description: t.description,
  });
});
