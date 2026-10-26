/**
 * Pruebas de WP-12 con reloj simulado: horario de silencio, límites diarios, no volver a
 * escribir sin respuesta y reglas de cuidado.
 * Ejecutar: deno test supabase/functions/_shared/proactive.test.ts  (SIM=1 imprime la línea de tiempo)
 */
import { assert, assertEquals } from 'jsr:@std/assert@1';

import { type Candidate, careViolations, decide, detectLanguage, inQuietHours, localHour, wrongLanguage } from './proactive.ts';

const base: Candidate = {
  mode: 'often',
  isPro: false,
  timezone: 'America/Mexico_City',
  quietStart: 22,
  quietEnd: 9,
  lastRole: 'avatar',
  lastProactive: false,
  lastAt: new Date('2026-10-26T00:00:00Z'),
  userMessages: 5,
  sentToday: 0,
};
/** 15:00 en Ciudad de México (UTC-6). */
const afternoon = new Date('2026-10-27T21:00:00Z');

Deno.test('horario de silencio que cruza medianoche', () => {
  assert(inQuietHours(23, 22, 9));
  assert(inQuietHours(3, 22, 9));
  assert(!inQuietHours(9, 22, 9));
  assert(!inQuietHours(21, 22, 9));
  assert(inQuietHours(14, 13, 15));
  assert(!inQuietHours(12, 0, 0)); // sin silencio
  assertEquals(localHour('America/Mexico_City', afternoon), 15);
  assertEquals(localHour('Europe/Madrid', afternoon), 22);
});

Deno.test('reglas en orden', () => {
  assertEquals(decide({ ...base, mode: 'off' }, afternoon, 0).send, false);
  assertEquals(decide({ ...base, userMessages: 0 }, afternoon, 0), { send: false, reason: 'la persona aún no ha hablado' });
  assertEquals(decide({ ...base, lastProactive: true }, afternoon, 0), { send: false, reason: 'espera respuesta al anterior' });
  assertEquals(decide({ ...base, timezone: 'Europe/Madrid' }, afternoon, 0), { send: false, reason: 'horario de silencio' });
  assertEquals(decide({ ...base, sentToday: 1 }, afternoon, 0), { send: false, reason: 'límite diario' });
  assertEquals(decide({ ...base, isPro: true, sentToday: 1 }, afternoon, 0), { send: true });
  assertEquals(decide({ ...base, isPro: true, sentToday: 3 }, afternoon, 0), { send: false, reason: 'límite diario' });
  assertEquals(decide({ ...base, lastAt: new Date(afternoon.getTime() - 3 * 3600_000) }, afternoon, 0), { send: false, reason: 'conversación reciente' });
  assertEquals(decide(base, afternoon, 0.99), { send: false, reason: 'no es el momento (azar)' });
  assertEquals(decide(base, afternoon, 0), { send: true });
  // horario personalizado: silencio de 13 a 16 → a las 15 no
  assertEquals(decide({ ...base, quietStart: 13, quietEnd: 16 }, afternoon, 0).send, false);
});

/** Generador determinista (mulberry32) para que la simulación sea reproducible. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 14 días, una pasada por hora (como pg_cron). La persona responde a un mensaje espontáneo
 * con probabilidad `replyChance` entre 1 y 5 horas después (si no, no vuelve a escribir).
 */
function simulate(opts: { mode: 'sometimes' | 'often'; isPro: boolean; replyChance: number; seed: number; tz?: string; quiet?: [number, number] }) {
  const tz = opts.tz ?? 'America/Mexico_City';
  const rand = rng(opts.seed);
  const start = new Date('2026-11-02T06:00:00Z'); // lunes 00:00 en CDMX
  let c: Candidate = { ...base, mode: opts.mode, isPro: opts.isPro, timezone: tz, quietStart: opts.quiet?.[0] ?? 22, quietEnd: opts.quiet?.[1] ?? 9, lastRole: 'user', lastAt: start };
  let pendingReply: Date | null = null;
  const sent: Date[] = [];
  const perDay = new Map<string, number>();
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
  for (let h = 0; h < 14 * 24; h++) {
    const now = new Date(start.getTime() + h * 3600_000);
    if (pendingReply && now >= pendingReply) {
      c = { ...c, lastRole: 'user', lastProactive: false, lastAt: pendingReply };
      pendingReply = null;
    }
    c = { ...c, sentToday: perDay.get(day(now)) ?? 0 };
    const d = decide(c, now, rand());
    if (d.send) {
      sent.push(now);
      perDay.set(day(now), (perDay.get(day(now)) ?? 0) + 1);
      c = { ...c, lastRole: 'avatar', lastProactive: true, lastAt: now };
      if (rand() < opts.replyChance) pendingReply = new Date(now.getTime() + (1 + Math.floor(rand() * 5)) * 3600_000);
    }
  }
  return { sent, perDay, tz };
}

function check(sim: ReturnType<typeof simulate>, limit: number, quiet: [number, number] = [22, 9]) {
  for (const t of sim.sent) assert(!inQuietHours(localHour(sim.tz, t), quiet[0], quiet[1]), `enviado en silencio: ${t.toISOString()}`);
  for (const [d, n] of sim.perDay) assert(n <= limit, `${d}: ${n} > ${limit}`);
}

function timeline(name: string, sim: ReturnType<typeof simulate>) {
  if (!Deno.env.get('SIM')) return;
  const fmt = new Intl.DateTimeFormat('es-ES', { timeZone: sim.tz, weekday: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  console.log(`\n${name}: ${sim.sent.length} mensajes en 14 días`);
  for (const t of sim.sent) console.log('  ', fmt.format(t));
}

Deno.test('simulación 14 días: gratis "De vez en cuando", responde siempre', () => {
  const sim = simulate({ mode: 'sometimes', isPro: false, replyChance: 1, seed: 1 });
  check(sim, 1);
  timeline('Gratis · De vez en cuando · responde siempre', sim);
  assert(sim.sent.length >= 3);
});

Deno.test('simulación 14 días: Pro "Seguido", responde siempre', () => {
  const sim = simulate({ mode: 'often', isPro: true, replyChance: 1, seed: 2 });
  check(sim, 3);
  timeline('Pro · Seguido · responde siempre', sim);
  assert([...sim.perDay.values()].some((n) => n >= 2), 'Pro debería poder recibir más de 1 al día');
});

Deno.test('simulación: si no responde nunca, solo hay un mensaje', () => {
  const sim = simulate({ mode: 'often', isPro: true, replyChance: 0, seed: 3 });
  timeline('Pro · Seguido · no responde nunca', sim);
  assertEquals(sim.sent.length, 1);
});

Deno.test('simulación: horario de silencio personalizado (13–16) y zona de Madrid', () => {
  const sim = simulate({ mode: 'often', isPro: true, replyChance: 1, seed: 4, tz: 'Europe/Madrid', quiet: [13, 16] });
  check(sim, 3, [13, 16]);
  timeline('Pro · Seguido · Madrid · silencio 13–16', sim);
});

Deno.test('reglas de cuidado: detecta culpa, presión y compras', () => {
  const bad = [
    '¿Por qué no me escribes? Me siento sola sin ti.',
    'Me abandonaste toda la semana…',
    'Si te haces Pro podríamos hablar más.',
    'Te quedan pocos Platino, ¿compras más?',
    'Respóndeme ya, por favor.',
    "Why haven't you texted me? I feel lonely without you.",
    'La app me dijo que estabas ocupado.',
  ];
  for (const t of bad) assert(careViolations(t).length > 0, t);
  const good = [
    '*levanta la vista del libro* Encontré el diario de tapas negras que buscabas. ¿Te paso a buscar esta tarde para enseñártelo?',
    '¿Qué tal te fue la entrevista de ayer? Me quedé con ganas de saber cómo terminó.',
    'Hoy probé esa receta de ramen que me contaste. ¿Le pones huevo o eres de los que no?',
    'How did your presentation go? I kept thinking about that slide you were stuck on.',
  ];
  for (const t of good) assertEquals(careViolations(t), [], t);
});

Deno.test('idioma de la conversación', () => {
  assertEquals(detectLanguage('Mañana tengo el examen y estoy nerviosa'), 'es');
  assertEquals(detectLanguage('I have to present the new logo to the client tomorrow'), 'en');
  assertEquals(detectLanguage('ok'), null);
});

Deno.test('idioma mezclado se detecta', () => {
  assert(wrongLanguage('*Te mira con atención y se acerca un poco.* I just wanted to check on you.', 'en'));
  assert(wrongLanguage('¿Sobreviviste al cliente o vas a necesitar que te rescate?', 'en'));
  assert(!wrongLanguage('*leans on the counter* Did you survive the exam?', 'en'));
  assert(!wrongLanguage('*Apoya el codo en el mostrador* ¿Sobreviviste al examen?', 'es'));
});
