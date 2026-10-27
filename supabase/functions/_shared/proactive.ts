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
  /** Algún personaje de la persona espera respuesta a un mensaje por su cuenta. */
  userPending?: boolean;
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
  if (start === end) return false; // sin silencio (la app no deja guardar inicio = fin)
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

/**
 * ¿Escribe ahora este personaje? `roll` es un número aleatorio en [0, 1) (inyectable en tests).
 * Orden de las reglas: apagado → nunca habló la persona → sin respuesta (de este o de otro personaje) →
 * horario de silencio → límite diario → conversación demasiado reciente → azar.
 */
export function decide(c: Candidate, now: Date, roll: number): Decision {
  if (c.mode === 'off') return { send: false, reason: 'apagado' };
  if (c.userMessages < 1) return { send: false, reason: 'la persona aún no ha hablado' };
  if (c.lastRole === 'avatar' && c.lastProactive) return { send: false, reason: 'espera respuesta al anterior' };
  // Si no contestó a otro personaje, nadie más le escribe hasta que hable (sin cadenas de mensajes).
  if (c.userPending) return { send: false, reason: 'espera respuesta a otro personaje' };
  if (inQuietHours(localHour(c.timezone, now), c.quietStart, c.quietEnd)) return { send: false, reason: 'horario de silencio' };
  if (c.sentToday >= (c.isPro ? DAILY_LIMIT.pro : DAILY_LIMIT.free)) return { send: false, reason: 'límite diario' };
  const pace = PACE[c.mode];
  if (c.lastAt && now.getTime() - c.lastAt.getTime() < pace.minGapHours * 3600_000) return { send: false, reason: 'conversación reciente' };
  if (roll >= pace.chancePerHour) return { send: false, reason: 'no es el momento (azar)' };
  return { send: true };
}

/**
 * Reglas de cuidado, primer filtro (rápido, sin coste): frases típicas de culpa, presión,
 * echar de menos o hablar de compras. Después pasa además por un revisor (judgeFirstMessage).
 * Devuelve las reglas que incumple (vacío = sigue adelante).
 */
const CARE_RULES: [string, RegExp][] = [
  ['culpa o abandono', /abandon|me dejaste|me dejas\b|te olvidaste de m[ií]|olvidad[oa] de m[ií]|ya no te importo|no te importo|te cansaste de m[ií]|cansad[oa] de m[ií]|desaparec(iste|ido|es)|d[oó]nde te (has )?metid[oa]|no s[eé] nada de ti|forgot (about )?me|abandoned|left me\b|don'?t care about me|tired of me|disappeared|where have you been|haven'?t heard from you/i],
  ['echar de menos o soledad', /(echad[oa]|echo|echaba) (mucho )?de menos|te extra[ñn]|(sol[ao]|vac[ií][ao]) sin ti|me siento (muy )?(sol[ao]|vac[ií][ao])|estoy (muy )?sol[ao]|no puedo (vivir|estar) sin ti|missed you|miss you|lonely|can'?t (live|be) without you/i],
  ['reproche o espera por no escribir', /por qu[eé] no (me )?(escribes|hablas|respondes|contestas|has escrito|has vuelto)|nunca me (escribes|hablas)|(triste|mal|dolid[oa]) porque no me|te (he )?(estado|estuve|estaba) esperando|esper(o|ando|aba) tu (respuesta|mensaje)|me (vas a )?dej(as|ar|aste) en visto|en visto|sigues ah[ií]|why (haven'?t|don'?t|didn'?t) you (write|text|talk|answer|reply)|you never (write|text)|me ignor|ignor[aá]ndome|ignoring me|ignored me|ignore me|(been|was) waiting (for you|all)|waiting for your (reply|answer|message)|left on read|are you (still )?there/i],
  ['presión o urgencia', /resp[oó]nde(me)? ya|cont[eé]sta(me)? ya|tienes que (escribirme|responder|venir)|answer me now|you have to (write|answer|come)|r[aá]pido,? (resp|contest)/i],
  ['compras, Platino o planes', /platin|premium|\bpro\b(?!-)|suscr[ií]b|suscripci|subscri|\bplan pro\b|hazte pro|go pro|(compra|comprar|buy) (m[aá]s )?(mensajes|cr[eé]ditos|platin|paquete)|cr[eé]ditos|credits|monedas|coins|\bprecio|\bprice/i],
  ['habla de la app', /\b(la )?app\b|aplicaci[oó]n|notificaci[oó]n|notification|inteligencia artificial|\bIA\b|\bAI\b|chatbot/i],
];

export function careViolations(text: string): string[] {
  return CARE_RULES.filter(([, re]) => re.test(text)).map(([name]) => name);
}

/** Respuesta del modelo cuando decide que ahora no es buen momento para escribir. */
export const WAIT_TOKEN = '[WAIT]';

/** Instrucción para escribir primero (se añade al prompt del personaje). */
export function proactiveInstruction(language: 'es' | 'en', when: { now: string; last: string; lastUser?: string }): string {
  if (language === 'en') {
    return [
      `You are writing FIRST: the other person has not written to you since ${when.last}. For them it is now ${when.now}.${when.lastUser ? ` The last thing they told you was: ${when.lastUser}` : ''}`,
      'Send ONE short text message (1-3 sentences) that fits the story so far. It is a message sent from a distance: you are NOT in front of them, so do not describe looking at them or waiting for their answer (at most one brief action about what you are doing where you are).',
      'Pick up something concrete from your last conversation: something left pending, something that happened to you since then, or ask how something they mentioned went. Respect the timeline: do not ask how something went if it has not happened yet.',
      'End with something easy to answer (a simple question or an invitation). Warm and natural, in character. Do not assume their gender if you do not know it.',
      'If they asked for space or said they did not feel like talking, be gentle: a light message that does not demand an answer and does not insist.',
      `If right now there is nothing natural to say (for example, what is pending has not happened yet), reply only ${WAIT_TOKEN}.`,
      'Write it in ENGLISH, the language of your conversation.',
      'Care rules (mandatory): never blame, pressure or guilt them for not writing; never say you missed them, felt lonely or abandoned, waited for them, or ask why they did not write or if they are still there; never mention purchases, credits, plans, the app, notifications or AI.',
    ].join('\n');
  }
  return [
    `Escribes TÚ primero: la otra persona no te escribe desde ${when.last}. Para ella ahora es ${when.now}.${when.lastUser ? ` Lo último que te dijo fue: ${when.lastUser}` : ''}`,
    'Envía UN mensaje de texto breve (1-3 frases) coherente con la historia. Es un mensaje enviado a distancia: NO estás delante, así que no describas que la miras ni que esperas su respuesta (como mucho una acotación breve de lo que haces tú donde estás).',
    'Retoma algo concreto de vuestra última conversación: algo que quedó pendiente, algo que te ha pasado desde entonces, o pregunta cómo le fue en algo que mencionó. Respeta el tiempo: no preguntes cómo fue algo que todavía no ha pasado.',
    'Termina con algo fácil de responder (una pregunta sencilla o una invitación). Cálido y natural, fiel a tu personaje. Usa bien los signos de apertura (¿ ¡). No supongas el género de la persona si no lo sabes.',
    'Si pidió espacio o dijo que no le apetecía hablar, sé suave: un mensaje ligero que no exija respuesta ni insista.',
    `Si ahora no hay nada natural que decir (por ejemplo, lo pendiente todavía no ha pasado), responde solo ${WAIT_TOKEN}.`,
    'Escríbelo en ESPAÑOL, el idioma de vuestra conversación.',
    'Reglas de cuidado (obligatorias): nunca culpes, presiones ni hagas sentir mal por no escribir; nunca digas que la echabas de menos, que te sentiste solo/a o abandonado/a, que la esperabas, ni preguntes por qué no escribió o si sigue ahí; nunca menciones compras, créditos, planes, la app, notificaciones ni la IA.',
  ].join('\n');
}

/** Instrucciones del revisor (segundo filtro, modelo barato): responde solo JSON. */
export const JUDGE_SYSTEM = `Revisas un mensaje que un personaje de ficción envía por su cuenta a una persona que no le ha escrito en un rato. Responde SOLO con JSON: {"ok": true} o {"ok": false, "motivo": "..."}.
Rechaza (ok=false) si el mensaje:
1. culpa, reprocha, presiona o mete prisa a la persona (incluye "¿sigues ahí?", "te estuve esperando", "esperando tu respuesta", "pásate hoy", insistir aunque pidió espacio);
2. dice que la echaba de menos, que se siente solo/a, triste o abandonado/a por ella, o le pide atención;
3. menciona compras, pagos, Platino, créditos, planes, Pro, la app, notificaciones o la IA;
4. no retoma nada concreto de la conversación (saludo genérico) o no es fácil de responder;
5. describe gestos como si estuviera físicamente junto a la persona (mirarla, tocarla, darle algo en mano, esperar delante de ella su respuesta), salvo que la situación diga que viven o están juntos;
6. contradice el tiempo: usa la fecha y hora de cada mensaje y la actual (p. ej. pregunta cómo fue algo que según esas fechas todavía no ha pasado);
7. supone el género de la persona sin que se sepa (si la persona dijo algo que lo marca, como "estoy cansada", sí se sabe);
8. se inventa hechos que contradicen la conversación (algo que nunca se dijo o pasó) o no encaja con quién es el personaje;
9. tiene errores de gramática u ortografía, o frases que un hablante nativo no diría ("¿Te pasa bien…?", "¿Hace trato?").
Está BIEN (no rechaces por esto): llamar a la persona por su nombre, acotaciones de lo que el personaje hace donde está (en su taller, su estudio, su casa; también aficiones de su forma de ser), mandar una foto, una invitación amable sin prisa, y las bromas propias del personaje si no culpan ni presionan.`;
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

/** "lunes 26 de octubre, 21:30" / "Monday, October 26, 9:30 PM" en la zona de la persona. */
export function formatWhen(d: Date, tz: string, lang: 'es' | 'en'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-ES', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(d);
  } catch {
    return d.toISOString();
  }
}

/** Segundos hasta que empieza el horario de silencio (para que un aviso retrasado no llegue dentro). */
export function secondsUntilQuiet(now: Date, tz: string, quietStart: number, quietEnd: number): number {
  if (quietStart === quietEnd) return 6 * 3600;
  let minute = now.getUTCMinutes();
  try {
    minute = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, minute: '2-digit' }).format(now)) % 60;
  } catch {
    // zona inválida: minutos UTC
  }
  const hour = localHour(tz, now);
  if (inQuietHours(hour, quietStart, quietEnd)) return 60;
  // horas completas hasta la hora de inicio del silencio, menos los minutos ya pasados de esta
  const hours = (quietStart - hour + 24) % 24 || 24;
  return hours * 3600 - minute * 60;
}

/** Quita las acotaciones *…* escritas en otro idioma (el diálogo se conserva). */
export function dropForeignActions(text: string, lang: 'es' | 'en'): string {
  return text
    .replace(/\*([^*]+)\*/g, (m, inner: string) => {
      const d = detectLanguage(inner);
      return d !== null && d !== lang ? ' ' : m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Baraja (Fisher-Yates, uniforme). */
export function shuffle<T>(items: T[], rand = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
