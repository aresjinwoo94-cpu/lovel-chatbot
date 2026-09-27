/**
 * POST /analyze-appearance  { imageBase64, mediaType, gender, note? }
 * "Subir foto + descripción simple": Claude (visión) traduce la foto a rasgos
 * del avatar 2D. La foto NO se guarda en ningún lado.
 */
import { betaZodOutputFormat } from 'npm:@anthropic-ai/sdk@0.128.0/helpers/beta/zod';
import { z } from 'npm:zod@4';

import { anthropic, CLAUDE_MODEL } from '../_shared/claude.ts';
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { EYES, HAIR, HAIR_STYLES, OUTFIT, SKIN } from '../_shared/palette.ts';
import { requireUser } from '../_shared/supabase.ts';
import { APPEARANCE_ANALYSIS_PROMPT } from '../_shared/systemPrompts.tsx';

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

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

  const response = await anthropic.beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low', format: betaZodOutputFormat(Traits) },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: media, data: imageBase64 } },
          {
            type: 'text',
            text: `${APPEARANCE_ANALYSIS_PROMPT}\nGénero elegido para el avatar: ${gender}.${note?.trim() ? `\nNota de la persona: ${note.trim()}` : ''}`,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new HttpError(422, 'No pudimos inspirarnos en esta foto. Prueba con otra o elige los rasgos a mano.');
  }
  const t = response.parsed_output;
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
