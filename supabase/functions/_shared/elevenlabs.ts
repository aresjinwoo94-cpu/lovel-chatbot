import { HttpError, requireEnv } from './http.ts';

/**
 * ElevenLabs: voz generativa del avatar (TTS) y reconocimiento de la voz del
 * usuario (Speech-to-Text "Scribe").
 */
const API = 'https://api.elevenlabs.io/v1';
const TTS_MODEL = Deno.env.get('ELEVENLABS_TTS_MODEL') ?? 'eleven_multilingual_v2';
const STT_MODEL = Deno.env.get('ELEVENLABS_STT_MODEL') ?? 'scribe_v1';

/**
 * Voces prediseñadas de ElevenLabs según género y edad del avatar
 * (todas disponibles en el plan gratuito de ElevenLabs).
 * Puedes cambiarlas con secretos (ELEVENLABS_VOICE_FEMALE, …) o poner una voz
 * propia/clonada por avatar en la columna avatars.voice_id.
 */
const DEFAULT_VOICES = {
  female: 'EXAVITQu4vr4xnSDxMaL', // Sarah: cálida, joven
  female_mature: 'XrExE9yKIg1WjnnlVkGX', // Matilda: cálida, madura
  male: 'TX3LPaxmHKxFdv7VOQHJ', // Liam: joven, cercano
  male_mature: 'nPczCjzI2devNBz1zQrb', // Brian: grave, sereno
  other: 'SAz9YHcvj6GT2YYXdXww', // River: suave, neutra
};

export function pickVoice(gender: 'female' | 'male' | 'other', age: number, custom: string | null): string {
  if (custom) return custom;
  const mature = age >= 40;
  if (gender === 'female') {
    return mature
      ? (Deno.env.get('ELEVENLABS_VOICE_FEMALE_MATURE') ?? DEFAULT_VOICES.female_mature)
      : (Deno.env.get('ELEVENLABS_VOICE_FEMALE') ?? DEFAULT_VOICES.female);
  }
  if (gender === 'male') {
    return mature
      ? (Deno.env.get('ELEVENLABS_VOICE_MALE_MATURE') ?? DEFAULT_VOICES.male_mature)
      : (Deno.env.get('ELEVENLABS_VOICE_MALE') ?? DEFAULT_VOICES.male);
  }
  return Deno.env.get('ELEVENLABS_VOICE_OTHER') ?? DEFAULT_VOICES.other;
}

/** Texto → MP3 con la voz del avatar. */
export async function textToSpeech(text: string, voiceId: string): Promise<Uint8Array<ArrayBuffer>> {
  const res = await fetch(`${API}/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': requireEnv('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: TTS_MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new HttpError(502, `ElevenLabs TTS: ${res.status} ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Audio del usuario → texto (detecta el idioma automáticamente). */
export async function speechToText(audio: Uint8Array<ArrayBuffer>, mimeType: string): Promise<string> {
  const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mpeg') ? 'mp3' : mimeType.includes('3gpp') ? '3gp' : 'm4a';
  const form = new FormData();
  form.append('model_id', STT_MODEL);
  form.append('file', new Blob([audio], { type: mimeType }), `voice.${ext}`);
  const res = await fetch(`${API}/speech-to-text`, {
    method: 'POST',
    headers: { 'xi-api-key': requireEnv('ELEVENLABS_API_KEY') },
    body: form,
  });
  if (!res.ok) {
    console.error('ElevenLabs STT', res.status, await res.text());
    throw new HttpError(502, 'No pudimos procesar tu nota de voz ahora mismo. Inténtalo de nuevo en un momento.', 'VOICE_STT');
  }
  const data = (await res.json()) as { text?: string };
  // Scribe marca el silencio o el ruido entre paréntesis: "(silencio)", "(música)".
  const text = (data.text ?? '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  return text;
}
