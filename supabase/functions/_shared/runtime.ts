/** Ejecuta trabajo en segundo plano sin retrasar la respuesta (EdgeRuntime.waitUntil). */
export function background(task: Promise<unknown>) {
  const safe = task.catch((e) => console.error('background task failed', e));
  const rt = (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime;
  rt?.waitUntil(safe);
}
