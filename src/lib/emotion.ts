import type { Emotion } from './character/types';

/**
 * Emoción que transmite un mensaje del personaje, para que su cara la muestre sin
 * leer el texto (sobre todo la acción entre asteriscos: *se sonroja*, *sonríe*…).
 * Orden de prioridad: vergüenza > tristeza > sorpresa > alegría.
 * Los límites de palabra tienen en cuenta letras con acento (\b de JS no lo hace).
 */
const word = (body: string) => new RegExp(`(?<!\\p{L})(?:${body})(?!\\p{L})`, 'iu');

const CUES: [Emotion, RegExp][] = [
  ['shy', word('sonroj\\p{L}*|ruboriz\\p{L}*|avergonzad\\p{L}*|vergüenza|se pone roj[oa]|aparta la mirada|baja la mirada|tímid\\p{L}*|blush\\p{L}*|flush(?:es|ed|ing)?|embarrass\\p{L}*|looks away')],
  ['sad', word('trist\\p{L}*|llor\\p{L}*|lágrimas?|suspir\\p{L}*|se le quiebra\\p{L}*|dolid[oa]s?|abatid[oa]s?|cry|cries|crying|cried|tears?|sad|sadly|sigh(?:s|ed|ing)?')],
  ['surprised', word('sorprendid\\p{L}*|sorpresa|se sorprende|abre (?:mucho )?los ojos|asombrad\\p{L}*|boquiabiert[oa]|wow|gasps?|gasped|wide-eyed|surprised')],
  ['happy', word('sonr[eíi]\\p{L}*|r[íi]e|r[íi]en|riendo|re[íi]r|risas?|carcajada\\p{L}*|alegr\\p{L}*|feliz|felices|(?:ja){2,}|(?:ha){2,}|smil\\p{L}*|laugh\\p{L}*|grin\\p{L}*|happy|glad')],
];
const EMOJI: [Emotion, RegExp][] = [
  ['sad', /😢|😭/u],
  ['surprised', /😮|😲/u],
  ['happy', /😊|😄|😂|😁/u],
];

// Matices que cambian la lectura: "lágrimas de alegría", "suspira aliviada", "no estés triste"…
const HAPPY_TEARS = word('de (?:alegría|felicidad)|happily|with relief|aliviad[oa]s?|de alivio');
const COMFORTING = word("no (?:estés|te pongas) triste|no llores|don'?t (?:be sad|cry)");

export function detectEmotion(text: string | null | undefined): Emotion | null {
  if (!text) return null;
  // primero la acción entre asteriscos (lo más fiable), después el resto
  const actions = (text.match(/\*[^*]+\*/g) ?? []).join(' ');
  for (const source of [actions, text]) {
    if (!source) continue;
    for (const [emotion, re] of CUES) {
      if (!re.test(source)) continue;
      if (emotion === 'sad' && HAPPY_TEARS.test(source)) return 'happy';
      if (emotion === 'sad' && COMFORTING.test(source)) continue;
      return emotion;
    }
    for (const [emotion, re] of EMOJI) if (re.test(source)) return emotion;
  }
  return null;
}
