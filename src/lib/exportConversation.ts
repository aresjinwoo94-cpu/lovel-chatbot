import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { avatarToSvgString } from './avatarGeometry';
import { fetchAllMessages, signedAudioUrl } from './data';
import type { TFunction } from './i18n';
import type { Avatar, Message } from './types';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stamp = (iso: string) => new Date(iso).toLocaleString();

async function audioAsBase64(path: string): Promise<string | null> {
  try {
    const url = await signedAudioUrl(path);
    if (Platform.OS === 'web') {
      const blob = await (await fetch(url)).blob();
      return await new Promise((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(String(r.result).split(',')[1] ?? null);
        r.readAsDataURL(blob);
      });
    }
    const local = `${FileSystem.cacheDirectory}export-${path.replace(/[^\w.-]/g, '_')}`;
    await FileSystem.downloadAsync(url, local);
    return await FileSystem.readAsStringAsync(local, { encoding: FileSystem.EncodingType.Base64 });
  } catch {
    return null;
  }
}

function mimeFromPath(path: string) {
  if (path.endsWith('.mp3')) return 'audio/mpeg';
  if (path.endsWith('.webm')) return 'audio/webm';
  return 'audio/mp4';
}

/** HTML autocontenido: texto + audios incrustados, con el retrato del avatar. */
async function buildHtml(avatar: Avatar, messages: Message[], t: TFunction): Promise<string> {
  const portrait = avatarToSvgString(avatar.appearance, avatar.gender, avatar.age, 'smile', 96);
  const rows: string[] = [];
  for (const m of messages) {
    const who = m.role === 'user' ? t('export.you') : escapeHtml(avatar.name);
    let audio = '';
    if (m.kind === 'voice' && m.audio_path) {
      const b64 = await audioAsBase64(m.audio_path);
      if (b64) audio = `<audio controls src="data:${mimeFromPath(m.audio_path)};base64,${b64}"></audio>`;
    }
    rows.push(
      `<div class="msg ${m.role}"><div class="meta">${who} · ${escapeHtml(stamp(m.created_at))}</div>` +
        `${audio}<p>${escapeHtml(m.content).replace(/\n/g, '<br/>')}</p></div>`,
    );
  }
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(t('export.header', { name: avatar.name }))}</title>
<style>
body{font-family:Georgia,serif;background:#F3ECE4;color:#2E2A2B;margin:0;padding:24px}
.wrap{max-width:640px;margin:0 auto}
header{display:flex;gap:16px;align-items:center;margin-bottom:8px}
header svg{border-radius:50%}
h1{font-size:22px;margin:0}
.situation{background:#fff;border:1px solid #EADFD8;border-radius:12px;padding:12px 14px;margin:12px 0 20px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px}
.msg{max-width:80%;padding:10px 14px;border-radius:18px;margin:8px 0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.45}
.msg p{margin:4px 0 0}
.msg.user{background:#fff;margin-right:auto;border-bottom-left-radius:4px}
.msg.avatar{background:#FCE8E6;margin-left:auto;border-bottom-right-radius:4px}
.meta{font-size:11px;color:#7C7270}
audio{width:100%;margin-top:6px}
</style></head><body><div class="wrap">
<header>${portrait}<h1>${escapeHtml(t('export.header', { name: avatar.name }))}</h1></header>
<div class="situation"><strong>${escapeHtml(t('chat.situation'))}:</strong> ${escapeHtml(avatar.situation_description)}</div>
${rows.join('\n')}
</div></body></html>`;
}

function buildText(avatar: Avatar, messages: Message[], t: TFunction): string {
  const lines = [
    t('export.header', { name: avatar.name }),
    `${t('chat.situation')}: ${avatar.situation_description}`,
    '',
    ...messages.map((m) => {
      const who = m.role === 'user' ? t('export.you') : avatar.name;
      const voice = m.kind === 'voice' ? ` [${t('chat.voiceNote')}]` : '';
      return `[${stamp(m.created_at)}] ${who}${voice}: ${m.content}`;
    }),
  ];
  return lines.join('\n');
}

/** Exporta la conversación y abre la hoja de compartir (o descarga en web). */
export async function exportConversation(avatar: Avatar, format: 'html' | 'txt', t: TFunction) {
  const messages = await fetchAllMessages(avatar.id);
  const content = format === 'html' ? await buildHtml(avatar, messages, t) : buildText(avatar, messages, t);
  const safeName = avatar.name.replace(/[^\w-]+/g, '_') || 'avatar';
  const fileName = `LovelHouse-${safeName}-${new Date().toISOString().slice(0, 10)}.${format}`;
  const mime = format === 'html' ? 'text/html' : 'text/plain';

  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }

  const uri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: t('export.title') });
  }
}
