/**
 * Genera los retratos de los personajes (galería, listas y fotos de perfil)
 * renderizando el escenario VRM real con Chromium.
 * Uso: CHROMIUM_PATH=/ruta/chrome STAGE_URL=http://localhost:8099/stage.html MODELS_URL=http://localhost:8099 node scripts/render-characters.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
require('sucrase/register');
const { PRESETS, MODELS } = require('../src/lib/character/catalog.ts');
const STAGE = process.env.STAGE_URL;
const BASE = process.env.MODELS_URL;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function render(look, framing, w, h, file, square) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  if (process.env.ROUTE_CDN) await page.route(/jsdelivr/, async (r) => { const res = await fetch(r.request().url()); await r.fulfill({ status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'text/javascript' }, body: Buffer.from(await res.arrayBuffer()) }); });
  await page.goto(STAGE);
  await page.waitForFunction(() => window.__lovel, null, { timeout: 60000 });
  const data = await page.evaluate(({ look, framing, base, w, h, square }) => new Promise((resolve, reject) => {
    window.__onStageMessage = (m) => {
      if (m.type === 'error') reject(new Error(m.message));
      if (m.type === 'loaded') setTimeout(() => window.__lovel.handle(square ? { type: 'snapshot', size: w * 2, quality: 0.9 } : { type: 'snapshot', width: w * 2, height: h * 2, quality: 0.9 }), 1200);
      if (m.type === 'snapshot') resolve(m.dataUrl);
    };
    window.__lovel.handle({ type: 'look', look, modelBaseUrl: base, framing });
  }), { look, framing, base: BASE, w, h, square });
  writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
  await page.close();
  console.log('✓', file);
}

mkdirSync('assets/characters/presets', { recursive: true });
for (const p of PRESETS) {
  await render(p.look, 'portrait', 300, 375, `assets/characters/presets/${p.id}.jpg`, false);
  await render(p.look, 'face', 128, 128, `assets/characters/faces/${p.id}.jpg`, true);
}
for (const m of MODELS) {
  const look = { v: 3, model: m.id, hair: null, hairColor: null, eyeColor: null, skinTone: null, outfitColor: null, expression: 'neutral', accessories: [], background: 'cream' };
  await render(look, 'portrait', 200, 250, `assets/characters/models/${m.id}.jpg`, false);
}
await browser.close();
