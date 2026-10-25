/**
 * Precarga del personaje en web: deja el modelo 3D en la caché local (Cache Storage, la misma
 * que lee el escenario) y calienta las librerías 3D, para que el chat no espere a la red.
 * Se usa durante el cuestionario (personaje elegido) y al abrir la app (último chat).
 * En Android/iOS el escenario vive en un WebView con su propia caché: allí no aplica.
 */
import { Platform } from 'react-native';

import { isCustomModel } from './catalog';
import { MODEL_BASE_URL } from './media';
import type { CharacterLook } from './types';

const MODEL_CACHE = 'lovel-vrm-v2';
const STAGE_LIBS = [
  'https://cdn.jsdelivr.net/npm/es-module-shims@1.10.0/dist/es-module-shims.js',
  'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.core.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/BufferGeometryUtils.js',
  'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/meshopt_decoder.module.js',
  'https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3.5.5/lib/three-vrm.module.min.js',
];

/** Las mismas URLs que pide el escenario (avatar-stage/stage.html, load()). */
export function modelUrls(look: Pick<CharacterLook, 'model' | 'hair'>): string[] {
  if (isCustomModel(look.model)) return [];
  const urls = [`${MODEL_BASE_URL}/${look.model}.vrm`];
  if (look.hair && look.hair !== look.model && !isCustomModel(look.hair)) urls.push(`${MODEL_BASE_URL}/${look.hair}.hair.vrm`);
  return urls;
}

let libsWarm = false;
const done = new Set<string>();

export function prefetchLook(look: Pick<CharacterLook, 'model' | 'hair'> | null | undefined) {
  if (!look || Platform.OS !== 'web' || typeof caches === 'undefined') return;
  // con "ahorro de datos" no se descarga nada por adelantado
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
  const urls = modelUrls(look).filter((u) => !done.has(u));
  if (!urls.length && libsWarm) return;
  urls.forEach((u) => done.add(u));
  // sin competir con lo que se está pintando ahora
  setTimeout(async () => {
    if (!libsWarm) {
      libsWarm = true;
      STAGE_LIBS.forEach((u) => fetch(u, { mode: 'cors' }).catch(() => undefined));
    }
    try {
      const cache = await caches.open(MODEL_CACHE);
      for (const u of urls) {
        if (await cache.match(u)) continue;
        const res = await fetch(u);
        if (res.ok) await cache.put(u, res);
      }
    } catch {
      urls.forEach((u) => done.delete(u));
    }
  }, 600);
}
