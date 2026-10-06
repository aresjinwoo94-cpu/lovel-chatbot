/**
 * POST /voice-preview  { voiceId, lang }   (sin JWT: el creador funciona sin cuenta)
 * Muestra de una voz del catálogo para el creador. Solo voces de la lista y una
 * frase fija por idioma; se genera una vez y queda en el bucket público
 * `voice-previews`, así que no consume créditos de ElevenLabs más que la primera vez.
 */
import { textToSpeech } from '../_shared/elevenlabs.ts';
import { HttpError, json, readJson, requireEnv, serve } from '../_shared/http.ts';
import { admin } from '../_shared/supabase.ts';

// Debe coincidir con VOICES en src/lib/character/catalog.ts
const VOICE_IDS = new Set([
  'EXAVITQu4vr4xnSDxMaL', 'FGY2WhTYpPnrIDTdsKH5', 'cgSgspJ2msm6clMCkdW9', 'XrExE9yKIg1WjnnlVkGX', 'Xb7hH8MSUJpSbSDYk0k2',
  'pFZP5JQG7iQjIQuC4Bku', 'TX3LPaxmHKxFdv7VOQHJ', 'bIHbv24MWmeRgasZH58o',
  'cjVigY5qzO86Huf0OWal', 'iP95p4xoKVk53GoZ742B', 'nPczCjzI2devNBz1zQrb', 'N2lVS1w4EtoT3dr4eOWO', 'JBFqnCBsd6RMkjVDRZzb',
  'onwK4e9ZLuTAKqWW03F9', 'SAz9YHcvj6GT2YYXdXww',
]);

const PHRASE = {
  es: 'Hola… por fin llegas. Tenía muchas ganas de verte. ¿Me cuentas qué tal tu día?',
  en: 'Hey… you finally made it. I was really looking forward to seeing you. How was your day?',
};

serve(async (req) => {
  const { voiceId, lang = 'es' } = await readJson<{ voiceId?: string; lang?: string }>(req);
  if (!voiceId || !VOICE_IDS.has(voiceId)) throw new HttpError(400, 'Voz no disponible');
  const l = lang === 'en' ? 'en' : 'es';
  const path = `${voiceId}-${l}.mp3`;
  const publicUrl = `${requireEnv('SUPABASE_URL')}/storage/v1/object/public/voice-previews/${path}`;

  const { data: existing } = await admin.storage.from('voice-previews').list('', { search: path, limit: 1 });
  if (existing?.some((f) => f.name === path)) return json({ url: publicUrl });

  const audio = await textToSpeech(PHRASE[l], voiceId, { speed: 1, style: 0.35 });
  const { error } = await admin.storage.from('voice-previews').upload(path, audio, { contentType: 'audio/mpeg', upsert: true });
  if (error) throw new HttpError(500, error.message);
  return json({ url: publicUrl });
});
