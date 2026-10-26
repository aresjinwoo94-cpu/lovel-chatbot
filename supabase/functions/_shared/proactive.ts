/**
 * WP-12: el personaje escribe primero. Aquí está la decisión (sin red ni base de datos, para
 * probarla con un reloj simulado) y las reglas de cuidado que todo mensaje debe cumplir.
 */
export type ProactiveMode = 'off' | 'sometimes' | 'often';

/** Máximo de mensajes por su cuenta al día (entre todos los personajes de la persona). */
export const DAILY_LIMIT = { free: 1, pro: 3 } as const;

/** Silencio mínimo de la conversación antes de escribir, y probabilidad por hora elegible. */
export const PACE: Record<Exclude<ProactiveMode, 'off'>, { minGapHours: number; chancePerHour: number }> = {
  sometimes: { minGapHours: 20, chancePerHour: 0.12 },
  often: { minGapHours: 6, chancePerHour: 0.3 },
};

export interface Candidate {
  mode: ProactiveMode;
  isPro: boolean;
  timezone: string;
  quietStart: number; // hora local en la que empieza el silencio (22)
  quietEnd: number; // hora local en la que termina (9)
  lastRole: 'user' | 'avatar' | null;
  lastProactive: boolean;
  lastAt: Date | null;
  userMessages: number;
  sentToday: number;
}

export type Decision = { send: true } | { send: false; reason: string };

/** Hora local (0-23) en una zona horaria. */
export function localHour(tz: string, now: Date): number {
  try {
    const h = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(now);
    return Number(h) % 24;
  } catch {
    return now.getUTCHours();
  }
}

/** Dentro del horario de silencio (admite rangos que cruzan medianoche, p. ej. 22 → 9). */
export function inQuietHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false; // sin silencio
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

/**
 * ¿Escribe ahora este personaje? `roll` es un número aleatorio en [0, 1) (inyectable en tests).
 * Orden de las reglas: apagado → nunca habló la persona → sin respuesta al anterior →
 * horario de silencio → límite diario → conversación demasiado reciente → azar.
 */
export function decide(c: Candidate, now: Date, roll: number): Decision {
  if (c.mode === 'off') return { send: false, reason: 'apagado' };
  if (c.userMessages < 1) return { send: false, reason: 'la persona aún no ha hablado' };
  if (c.lastRole === 'avatar' && c.lastProactive) return { send: false, reason: 'espera respuesta al anterior' };
  if (inQuietHours(localHour(c.timezone, now), c.quietStart, c.quietEnd)) return { send: false, reason: 'horario de silencio' };
  if (c.sentToday >= (c.isPro ? DAILY_LIMIT.pro : DAILY_LIMIT.free)) return { send: false, reason: 'límite diario' };
  const pace = PACE[c.mode];
  if (c.lastAt && now.getTime() - c.lastAt.getTime() < pace.minGapHours * 3600_000) return { send: false, reason: 'conversación reciente' };
  if (roll >= pace.chancePerHour) return { send: false, reason: 'no es el momento (azar)' };
  return { send: true };
}

/**
 * Reglas de cuidado: el mensaje nunca culpa ni presiona por no escribir, nunca habla de
 * compras, Platino ni planes, y nunca dice que la persona lo abandonó. Devuelve las reglas
 * que incumple (vacío = se puede enviar).
 */
const CARE_RULES: [string, RegExp][] = [
  ['culpa o abandono', /abandon|me dejaste|me dejas|te olvidaste de m[ií]|olvidado de m[ií]|ya no te importo|no te importo|forgot about me|abandoned|left me|don'?t care about me/i],
  ['soledad que presiona', /(sol[ao]|vac[ií][ao]) sin ti|no puedo (vivir|estar) sin ti|lonely without you|can'?t (live|be) without you|me siento sol[ao]/i],
  ['reproche por no escribir', /por qu[eé] no (me )?(escribes|hablas|respondes|contestas|has escrito|has vuelto)|nunca me (escribes|hablas)|why (haven'?t|don'?t) you (write|text|talk|answer|reply)|you never (write|text)|ignor(as|ando|ing|ed) (me)?/i],
  ['presión o urgencia', /resp[oó]nde(me)? ya|cont[eé]sta(me)? ya|tienes que (escribirme|responder)|answer me now|you have to (write|answer)/i],
  ['compras, Platino o planes', /platin|\bpro\b|premium|suscrip|subscri|compra|purchase|\bpaga(r|s)?\b|\bpay\b|precio|price|cr[eé]ditos|credits|monedas|coins/i],
  ['habla de la app', /\b(la )?app\b|aplicaci[oó]n|notificaci[oó]n|notification|inteligencia artificial|\bIA\b|\bAI\b/i],
];

export function careViolations(text: string): string[] {
  return CARE_RULES.filter(([, re]) => re.test(text)).map(([name]) => name);
}

/** Instrucción para escribir primero (se añade al prompt del personaje). */
export function proactiveInstruction(language: 'es' | 'en'): string {
  if (language === 'en') {
    return [
      'You are writing FIRST: the other person has not written to you for a while. Send ONE short message (1-3 sentences) that fits the story so far.',
      'Pick up something concrete from your last conversation: something left pending, something that happened to you since then, or ask how something they mentioned went.',
      'End with something easy to answer (a simple question or an invitation). Be warm and natural, in character.',
      'Write it in ENGLISH, the language of your conversation.',
      'Care rules (mandatory): never blame, pressure or guilt them for not writing; never say you felt abandoned, lonely without them, or ask why they did not write; never mention purchases, credits, plans, the app, notifications or AI.',
    ].join('\n');
  }
  return [
    'Escribes TÚ primero: la otra persona lleva un rato sin escribirte. Envía UN mensaje breve (1-3 frases) coherente con la historia.',
    'Retoma algo concreto de vuestra última conversación: algo que quedó pendiente, algo que te ha pasado desde entonces, o pregunta cómo le fue en algo que mencionó.',
    'Termina con algo fácil de responder (una pregunta sencilla o una invitación). Cálido y natural, fiel a tu personaje.',
    'Escríbelo en ESPAÑOL, el idioma de vuestra conversación.',
    'Reglas de cuidado (obligatorias): nunca culpes, presiones ni hagas sentir mal por no escribir; nunca digas que te sentiste abandonado/a o solo/a sin la persona, ni preguntes por qué no escribió; nunca menciones compras, créditos, planes, la app, notificaciones ni la IA.',
  ].join('\n');
}

/** Idioma aproximado de un texto (español o inglés), o null si no se puede saber. */
export function detectLanguage(text: string): 'es' | 'en' | null {
  const words = text.toLowerCase().match(/[a-záéíóúñü']+/g) ?? [];
  const es = words.filter((w) => /^(el|la|los|las|de|del|al|que|y|o|en|un|una|me|te|se|lo|mi|tu|no|es|por|con|para|estoy|tengo|muy|pero|hoy|vas|ya|como|esta|este|cuando|donde)$/.test(w) || /[áéíóúñ¿¡]/.test(w)).length;
  const en = words.filter((w) => /^(the|an|and|i|you|your|to|of|is|my|it|for|with|but|today|tomorrow|have|am|are|will|can|did|how|what|just|on|or)$/.test(w)).length;
  if (es === en) return null;
  return es > en ? 'es' : 'en';
}

/** ¿Alguna parte (acciones *…* o lo que dice) está en otro idioma? */
export function wrongLanguage(text: string, lang: 'es' | 'en'): boolean {
  const actions = [...text.matchAll(/\*([^*]+)\*/g)].map((m) => m[1]);
  const speech = text.replace(/\*[^*]+\*/g, ' ');
  return [...actions, speech].some((part) => {
    const d = detectLanguage(part);
    return d !== null && d !== lang;
  });
}
