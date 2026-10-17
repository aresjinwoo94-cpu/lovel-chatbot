import type { Emotion } from './character/types';

/**
 * Emoción que transmite un mensaje del personaje, para que su cara la muestre sin
 * leer el texto (sobre todo la acción entre asteriscos: *se sonroja*, *sonríe*…).
 * Orden de prioridad: vergüenza > tristeza > sorpresa > alegría.
 */
const CUES: [Emotion, RegExp][] = [
  ['shy', /sonroj|ruboriz|avergonz|vergüenza|se pone roj|aparta la mirada|baja la mirada|tímid|blush|flush|embarrass|looks away/i],
  ['sad', /trist|llor|lágrim|suspir|se le quiebra|dolid|abatid|\bcry|\btear|\bsad\b|sigh|😢|😭/i],
  ['surprised', /sorprend|abre (mucho )?los ojos|asombr|boquiabiert|¡¿|¿¡|\bwow\b|\bgasp|wide-eyed|surpris|😮|😲/i],
  ['happy', /sonr[íi]e|sonrisa|se r[íi]e|\bríe|risa|carcajada|alegr|feliz|\bsmil|\blaugh|\bgrin|😊|😄|😂|😁/i],
];

export function detectEmotion(text: string | null | undefined): Emotion | null {
  if (!text) return null;
  // primero la acción entre asteriscos (lo más fiable), después el resto
  const actions = (text.match(/\*[^*]+\*/g) ?? []).join(' ');
  for (const source of [actions, text]) {
    if (!source) continue;
    for (const [emotion, re] of CUES) if (re.test(source)) return emotion;
  }
  return null;
}
