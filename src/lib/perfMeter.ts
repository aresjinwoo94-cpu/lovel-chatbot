import { Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Medidor de rendimiento para probar en un teléfono real (WP-9). Mide los momentos del
 * presupuesto (Inicio usable, retrato, 3D, "escribiendo", fps) y los muestra en un panel
 * escondido con botón para copiarlos. Se activa con ?perf=1 en la web o tocando 5 veces la
 * versión en Ajustes. Apagado no hace nada (salvo guardar unos números en memoria).
 */
export type PerfKey = 'home' | 'portrait' | 'stageFirst' | 'stageAgain' | 'typing' | 'fps';

export const PERF_LABELS: Record<PerfKey, string> = {
  home: 'Abrir app → Inicio usable',
  portrait: 'Chat: retrato visible',
  stageFirst: '3D primera vez',
  stageAgain: '3D ya cargado antes',
  typing: 'Enviar → "escribiendo"',
  fps: 'Animación (fps)',
};

export const PERF_BUDGET: Record<PerfKey, string> = {
  home: '≤ 2000 ms',
  portrait: '≤ 300 ms',
  stageFirst: '≤ 2500 ms',
  stageAgain: '≤ 800 ms',
  typing: '≤ 200 ms',
  fps: '≥ 45',
};

const KEY = 'lovel.perf.v1';
const values: Partial<Record<PerfKey, number[]>> = {};
const starts: Record<string, number> = {};
const subs = new Set<() => void>();
let enabled = false;
let version = 0;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function record(key: PerfKey, v: number) {
  (values[key] ??= []).push(Math.round(v));
  if (values[key]!.length > 10) values[key]!.shift();
  version++;
  subs.forEach((f) => f());
}

/** Empieza a contar un momento (p. ej. al tocar una historia). */
export function perfStart(name: string) {
  starts[name] = now();
}

/** Igual que perfStart, pero sin pisar uno ya empezado (entradas sin toque: enlace, bienvenida). */
export function perfStartIfIdle(name: string) {
  if (starts[name] == null) starts[name] = now();
}

/** Termina un momento empezado con perfStart. Solo cuenta una vez por inicio. */
export function perfEnd(name: string, key: PerfKey = name as PerfKey) {
  const t0 = starts[name];
  if (t0 == null) return;
  delete starts[name];
  record(key, now() - t0);
}

/**
 * Fases del arranque hasta Inicio (ms desde que se pidió la página), para saber en qué se va
 * el tiempo: código ejecutándose, sesión leída, app lista, ruta decidida, Inicio pintado.
 */
const phases: [string, number][] = [];
let homeDone = false;
export function perfPhase(name: string) {
  if (homeDone || phases.some(([n]) => n === name)) return;
  phases.push([name, Math.round(now())]);
}
perfPhase('código');

/** Momentos medidos desde que arrancó la app (en web, desde que se pidió la página). */
export function perfHomeReady(fromCache: boolean) {
  if (homeDone) return;
  perfPhase(fromCache ? 'inicio (copia local)' : 'inicio (servidor)');
  homeDone = true;
  record('home', now());
}

/** Qué se bajó de la red al abrir (solo web): si el código vino de la caché o no. */
function networkSummary() {
  if (Platform.OS !== 'web' || typeof performance === 'undefined' || !performance.getEntriesByType) return '';
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const js = res.filter((r) => /_expo\/static\/js/.test(r.name) && r.startTime < (phases.at(-1)?.[1] ?? Infinity));
  const kb = (n: number) => Math.round(n / 1024);
  const sb = res.filter((r) => /supabase\.co/.test(r.name) && r.startTime < (phases.at(-1)?.[1] ?? Infinity));
  return [
    nav ? `página: html ${Math.round(nav.responseEnd)} ms, dom ${Math.round(nav.domContentLoadedEventEnd)} ms` : '',
    `código: ${js.length} archivos, ${kb(js.reduce((a, r) => a + (r.transferSize || 0), 0))} KB bajados, el último terminó a ${Math.round(Math.max(0, ...js.map((r) => r.responseEnd)))} ms`,
    `servidor antes de Inicio: ${sb.length} peticiones (${sb.map((r) => `${new URL(r.name).pathname.split('/').slice(-1)[0]} ${Math.round(r.duration)} ms`).join(', ')})`,
  ]
    .filter(Boolean)
    .join('\n');
}

const fpsCtx: string[] = [];
export function perfFps(fps: number, context?: string) {
  fpsCtx.push(`${Math.round(fps)}${context ? ` ${context}` : ''}`);
  if (fpsCtx.length > 12) fpsCtx.shift();
  record('fps', fps);
}

// copia nueva en cada cambio: la interfaz compara por referencia (React Compiler memoriza)
let snap: { values: Partial<Record<PerfKey, number[]>>; enabled: boolean; version: number } | null = null;
export function perfSnapshot() {
  if (snap?.version !== version) {
    const copy: Partial<Record<PerfKey, number[]>> = {};
    for (const k of Object.keys(values) as PerfKey[]) copy[k] = [...values[k]!];
    snap = { values: copy, enabled, version };
  }
  return snap;
}

export function perfSubscribe(f: () => void) {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}

export function perfEnabled() {
  return enabled;
}

export function setPerfEnabled(on: boolean) {
  enabled = on;
  version++;
  AsyncStorage.setItem(KEY, on ? '1' : '').catch(() => {});
  subs.forEach((f) => f());
}

export function perfReport() {
  const lines = (Object.keys(PERF_LABELS) as PerfKey[]).map((k) => {
    const v = values[k] ?? [];
    return `${PERF_LABELS[k]}: ${v.length ? v.join(', ') : '—'} (presupuesto ${PERF_BUDGET[k]})`;
  });
  const ua = Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.userAgent : `${Platform.OS} ${String(Platform.Version)}`;
  return [
    `Lovel House · ${ua}`,
    ...lines,
    `Fases de Inicio: ${phases.map(([n, t]) => `${n} ${t}`).join(' · ') || '—'}`,
    networkSummary(),
    `fps por estado: ${fpsCtx.join(', ') || '—'}`,
  ]
    .filter(Boolean)
    .join('\n');
}

// arranque: ?perf=1 / ?perf=0 en la web, o lo que se guardó
(function init() {
  if (Platform.OS === 'web' && typeof location !== 'undefined') {
    const p = new URLSearchParams(location.search).get('perf');
    if (p === '1' || p === '0') return setPerfEnabled(p === '1');
  }
  AsyncStorage
    .getItem(KEY)
    .then((v) => {
      if (v === '1') setPerfEnabled(true);
    })
    .catch(() => {});
})();

// para leerlo desde la consola o las pruebas automáticas
if (Platform.OS === 'web' && typeof window !== 'undefined') (window as unknown as { __lovelPerfReport?: () => string }).__lovelPerfReport = perfReport;
