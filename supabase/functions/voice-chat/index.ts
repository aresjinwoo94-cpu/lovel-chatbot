/**
 * POST /voice-chat  { avatarId, audioBase64, mimeType, durationMs }
 * Nota de voz → transcripción (ElevenLabs Scribe) → respuesta del personaje
 * → voz (ElevenLabs TTS). Si la voz falla, la respuesta llega igual como texto.
 * Cuenta como nota de voz del plan gratuito (se devuelve si algo falla).
 */
import { replyAsAvatar, saveExchange } from '../_shared/companion.ts';
import { pickVoice, speechToText, textToSpeech } from '../_shared/elevenlabs.ts';
import { base64ToBytes, bytesToBase64, HttpError, json, readJson, serve } from '../_shared/http.ts';
import { refundFree, reserveFree } from '../_shared/quota.ts';
import { admin, getConversationId, getOwnedAvatar, getProfile, requireUser } from '../_shared/supabase.ts';

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_DURATION_MS = 125_000;

const extFor = (mime: string) => (mime.includes('webm') ? 'webm' : mime.includes('3gpp') ? '3gp' : mime.includes('mpeg') ? 'mp3' : 'm4a');

serve(async (req) => {
  const user = await requireUser(req);
  const { avatarId, audioBase64, mimeType = 'audio/mp4', durationMs } = await readJson<{
    avatarId?: string;
    audioBase64?: string;
    mimeType?: string;
    durationMs?: number;
  }>(req);
  if (!avatarId || !audioBase64) throw new HttpError(400, 'Falta el audio');

  const audio = base64ToBytes(audioBase64);
  if (audio.byteLength < 1000) throw new HttpError(422, 'La nota de voz está vacía. ¿La grabas de nuevo?', 'EMPTY_AUDIO');
  if (audio.byteLength > MAX_AUDIO_BYTES || (durationMs ?? 0) > MAX_DURATION_MS) {
    throw new HttpError(413, 'La nota de voz es demasiado larga (máximo 2 minutos).', 'AUDIO_TOO_LONG');
  }

  const profile = await getProfile(user.id);
  const avatar = await getOwnedAvatar(user.id, avatarId);
  const conversationId = await getConversationId(avatarId);
  const quota = await reserveFree(profile, 'voice');

  try {
    // 1) Voz de la persona → texto
    const transcript = await speechToText(audio, mimeType);
    if (!transcript) throw new HttpError(422, 'No pudimos entender el audio. ¿Lo intentas de nuevo, un poco más cerca del micrófono?', 'EMPTY_TRANSCRIPT');

    // 2) Respuesta pensada para decirse en voz alta (sin acciones entre asteriscos)
    const raw = await replyAsAvatar({ avatar, profile, userText: transcript, voice: true });
    const reply = raw.replace(/\*[^*]+\*/g, ' ').replace(/\s+/g, ' ').trim() || raw;

    // 3) Texto → voz. Si ElevenLabs falla, el personaje responde por escrito (nunca en silencio).
    let replyAudio: Uint8Array<ArrayBuffer> | null = null;
    try {
      replyAudio = await textToSpeech(reply, pickVoice(avatar.gender, avatar.age, avatar.voice_id));
    } catch (e) {
      console.error('TTS', e);
    }

    // 4) Audios en el bucket privado (la nota de la persona solo si lo permite)
    const folder = `${user.id}/${avatar.id}`;
    let userAudioPath: string | null = null;
    if (profile.store_voice) {
      userAudioPath = `${folder}/${crypto.randomUUID()}.${extFor(mimeType)}`;
      const { error } = await admin.storage.from('voice-messages').upload(userAudioPath, audio, { contentType: mimeType });
      if (error) userAudioPath = null;
    }
    let replyAudioPath: string | null = null;
    if (replyAudio) {
      replyAudioPath = `${folder}/${crypto.randomUUID()}.mp3`;
      const { error } = await admin.storage.from('voice-messages').upload(replyAudioPath, replyAudio, { contentType: 'audio/mpeg' });
      if (error) replyAudioPath = null;
    }

    const result = await saveExchange({
      avatar,
      profile,
      conversationId,
      quota,
      user: { role: 'user', kind: 'voice', content: transcript, audio_path: userAudioPath, audio_duration_ms: durationMs ?? null },
      reply:
        replyAudio && replyAudioPath
          ? {
              role: 'avatar',
              kind: 'voice',
              content: reply,
              audio_path: replyAudioPath,
              // MP3 a 128 kbps → duración aproximada
              audio_duration_ms: Math.round((replyAudio.byteLength * 8) / 128),
            }
          : { role: 'avatar', kind: 'text', content: raw },
    });

    return json({ ...result, replyAudioBase64: replyAudio && replyAudioPath ? bytesToBase64(replyAudio) : null });
  } catch (e) {
    await refundFree(profile, 'voice');
    throw e;
  }
});
