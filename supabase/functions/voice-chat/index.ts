/**
 * POST /voice-chat  { avatarId, audioBase64, mimeType, durationMs }
 * Nota de voz del usuario → transcripción (ElevenLabs Scribe) → respuesta del
 * avatar (Claude) → voz generativa (ElevenLabs TTS).
 * Devuelve los mensajes guardados y el MP3 de la respuesta en base64.
 */
import { replyAsAvatar, saveExchange } from '../_shared/companion.ts';
import { pickVoice, speechToText, textToSpeech } from '../_shared/elevenlabs.ts';
import { base64ToBytes, bytesToBase64, HttpError, json, readJson, serve } from '../_shared/http.ts';
import { assertCanChat } from '../_shared/quota.ts';
import { admin, getConversationId, getOwnedAvatar, getProfile, requireUser } from '../_shared/supabase.ts';

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

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
  if (audio.byteLength > MAX_AUDIO_BYTES) throw new HttpError(413, 'La nota de voz es demasiado larga');

  const profile = await getProfile(user.id);
  assertCanChat(profile);
  const avatar = await getOwnedAvatar(user.id, avatarId);
  const conversationId = await getConversationId(avatarId);

  // 1) Voz del usuario → texto
  const transcript = await speechToText(audio, mimeType);
  if (!transcript) throw new HttpError(422, 'No pudimos entender el audio. ¿Lo intentas de nuevo?', 'EMPTY_TRANSCRIPT');

  // 2) Respuesta del avatar pensada para ser dicha en voz alta
  const reply = await replyAsAvatar({ avatar, profile, userText: transcript, voice: true });

  // 3) Texto → voz del avatar
  const replyAudio = await textToSpeech(reply, pickVoice(avatar.gender, avatar.age, avatar.voice_id));

  // 4) Guardar audios en el bucket privado (la nota del usuario solo si lo permite)
  const folder = `${user.id}/${avatar.id}`;
  let userAudioPath: string | null = null;
  if (profile.store_voice) {
    userAudioPath = `${folder}/${crypto.randomUUID()}.${extFor(mimeType)}`;
    const { error } = await admin.storage.from('voice-messages').upload(userAudioPath, audio, { contentType: mimeType });
    if (error) userAudioPath = null;
  }
  const replyAudioPath = `${folder}/${crypto.randomUUID()}.mp3`;
  const { error: upErr } = await admin.storage.from('voice-messages').upload(replyAudioPath, replyAudio, { contentType: 'audio/mpeg' });
  if (upErr) throw upErr;

  const result = await saveExchange({
    avatar,
    profile,
    conversationId,
    user: { role: 'user', kind: 'voice', content: transcript, audio_path: userAudioPath, audio_duration_ms: durationMs ?? null },
    reply: {
      role: 'avatar',
      kind: 'voice',
      content: reply,
      audio_path: replyAudioPath,
      // MP3 a 128 kbps → duración aproximada
      audio_duration_ms: Math.round((replyAudio.byteLength * 8) / 128),
    },
  });

  return json({ ...result, replyAudioBase64: bytesToBase64(replyAudio) });
});
