import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/** Lee una grabación local y la devuelve en base64 (para enviarla a la Edge Function). */
export async function fileToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

/**
 * Lee la grabación y detecta su formato real. En web cada navegador graba en uno
 * distinto (Chrome: webm/opus, Safari: mp4/aac), así que usamos el tipo del blob.
 */
export async function readRecording(uri: string): Promise<{ base64: string; mimeType: string }> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { base64, mimeType: (blob.type || 'audio/webm').split(';')[0] };
  }
  return { base64: await fileToBase64(uri), mimeType: recordingMimeType(uri) };
}

/** Tipo MIME de lo que graba expo-audio en cada plataforma. */
export function recordingMimeType(uri: string): string {
  if (Platform.OS === 'web') return 'audio/webm';
  if (uri.endsWith('.caf')) return 'audio/x-caf';
  if (uri.endsWith('.3gp')) return 'audio/3gpp';
  return 'audio/mp4';
}

/**
 * Convierte el MP3 en base64 de la respuesta del avatar en una URI reproducible
 * (archivo en caché en móvil, data URI en web).
 */
export async function base64ToPlayableUri(b64: string, id: string): Promise<string> {
  if (Platform.OS === 'web') return `data:audio/mpeg;base64,${b64}`;
  const uri = `${FileSystem.cacheDirectory}voice-${id}.mp3`;
  await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}

export function formatDuration(ms: number | null | undefined): string {
  const total = Math.max(0, Math.round((ms ?? 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
