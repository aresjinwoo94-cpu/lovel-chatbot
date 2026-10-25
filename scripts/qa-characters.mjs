/**
 * QA visual de personajes (WP-5).
 *
 * Renderiza cada personaje del catálogo con el escenario 3D real en todas las variantes
 * que suelen fallar (expresiones, vocales al hablar, emoción + habla, busto y cuerpo) y
 * genera una hoja de contactos por personaje en docs/qa/<id>.png, más docs/qa/manifest.json
 * con la huella del aspecto y del motor que se revisó.
 *
 * Uso:
 *   CHROMIUM_PATH=/ruta/chrome STAGE_URL=http://localhost:8099/stage.html MODELS_URL=http://localhost:8099 \
 *     node scripts/qa-characters.mjs            # todos (ONLY=nyx,kai para algunos)
 *   node scripts/qa-characters.mjs --check     # sin renderizar: falla si un personaje o el
 *                                              # motor cambió desde la última QA aprobada
 *
 * Regla del proyecto: ningún personaje entra o cambia en el catálogo sin pasar por aquí y
 * sin que un subagente revise las hojas con docs/qa/CHECKLIST.md.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('sucrase/register');
const { PRESETS } = require('../src/lib/character/catalog.ts');
const { applyAge } = require('../src/lib/character/ageRanges.ts');
/** El aspecto que se ve: el del catálogo con su edad (el escenario ajusta el rostro a ella). */
const shownLook = (p) => ({ ...p.look, age: p.age });

const OUT = 'docs/qa';
const MANIFEST = `${OUT}/manifest.json`;
const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);
const engineHash = () => sha(readFileSync('avatar-stage/stage.html', 'utf8'));
const lookHash = (p) => sha(JSON.stringify(p.look));

// ------------------------------------------------------------------ --check
if (process.argv.includes('--check')) {
  const m = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { engine: null, characters: {} };
  const problems = [];
  if (m.engine !== engineHash()) problems.push('el motor (avatar-stage/stage.html) cambió desde la última QA');
  for (const p of PRESETS) {
    // WP-10: cada personaje respeta su edad (cuerpo, peinado, accesorios, ropa y voz)
    const aged = applyAge(p.look, p.age, p.gender);
    const off = ['model', 'hair', 'accessories', 'plainOutfit', 'voice'].filter((k) => JSON.stringify(aged[k]) !== JSON.stringify(p.look[k]));
    if (off.length) problems.push(`${p.id}: no encaja con su edad (${p.age}): ${off.join(', ')}`);
    const r = m.characters?.[p.id];
    if (!r) problems.push(`${p.id}: sin QA`);
    else if (r.look !== lookHash(p)) problems.push(`${p.id}: su aspecto cambió desde la última QA`);
    else if (r.status !== 'approved') problems.push(`${p.id}: QA ${r.status ?? 'pendiente'} (falta la revisión aprobada)`);
  }
  if (problems.length) {
    console.error('✗ QA de personajes pendiente:\n  - ' + problems.join('\n  - '));
    console.error('Ejecuta scripts/qa-characters.mjs y revisa las hojas con docs/qa/CHECKLIST.md.');
    process.exit(1);
  }
  console.log(`✓ QA de personajes al día (${PRESETS.length} personajes)`);
  process.exit(0);
}

// ------------------------------------------------------------------ render
const { chromium } = await import('playwright');
const STAGE = process.env.STAGE_URL;
const BASE = process.env.MODELS_URL;
if (!STAGE || !BASE) {
  console.error('Faltan STAGE_URL y MODELS_URL (ver cabecera).');
  process.exit(2);
}

/** Variantes: [etiqueta, encuadre, emoción, vocal]. */
const VARIANTS = [
  ['neutral', 'face', null, null],
  ['feliz', 'face', 'happy', null],
  ['triste', 'face', 'sad', null],
  ['sorprendida', 'face', 'surprised', null],
  ['tímida', 'face', 'shy', null],
  ['enojada', 'face', 'angry', null],
  ['habla aa', 'face', null, 'aa'],
  ['habla ih', 'face', null, 'ih'],
  ['habla ou', 'face', null, 'ou'],
  ['habla ee', 'face', null, 'ee'],
  ['habla oh', 'face', null, 'oh'],
  ['feliz + aa', 'face', 'happy', 'aa'],
  ['sorpresa + oh', 'face', 'surprised', 'oh'],
  ['busto', 'bust', null, null],
  ['busto feliz + ee', 'bust', 'happy', 'ee'],
  ['cuerpo', 'portrait', null, null],
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
mkdirSync(OUT, { recursive: true });
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { characters: {} };
manifest.engine = engineHash();
manifest.characters ??= {};

const only = process.env.ONLY?.split(',');
for (const p of PRESETS.filter((x) => !only || only.includes(x.id))) {
  const page = await browser.newPage({ viewport: { width: 360, height: 450 } });
  if (process.env.ROUTE_CDN) {
    await page.route(/jsdelivr/, async (r) => {
      const res = await fetch(r.request().url());
      await r.fulfill({ status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'text/javascript' }, body: Buffer.from(await res.arrayBuffer()) });
    });
  }
  await page.goto(STAGE);
  await page.waitForFunction(() => window.__lovel, null, { timeout: 60000 });
  await page.evaluate(({ look, base }) => new Promise((resolve, reject) => {
    window.__onStageMessage = (m) => { if (m.type === 'loaded') resolve(); if (m.type === 'error') reject(new Error(m.message)); };
    window.__lovel.handle({ type: 'look', look, modelBaseUrl: base, framing: 'bust' });
  }), { look: shownLook(p), base: BASE });
  await page.waitForTimeout(800);
  // WP-10: primer plano de la cara en reposo de verdad (no modo QA), a doble tamaño, para
  // revisar boca, ojos y cejas
  await page.evaluate(() => window.__lovel.handle({ type: 'state', mood: 'idle' }));
  await page.waitForTimeout(1500);
  const rest = await page.evaluate(() => new Promise((resolve) => {
    window.__onStageMessage = (m) => { if (m.type === 'snapshot') resolve(m.dataUrl); };
    window.__lovel.handle({ type: 'snapshot', framing: 'face', size: 640, quality: 0.92 });
  }));
  const tiles = [];
  for (const [label, framing, emotion, viseme] of VARIANTS) {
    const dataUrl = await page.evaluate(({ framing, emotion, viseme }) => new Promise((resolve) => {
      window.__onStageMessage = (m) => {
        if (m.type === 'qa-ok') setTimeout(() => window.__lovel.handle(framing === 'face' ? { type: 'snapshot', framing, size: 320, quality: 0.9 } : { type: 'snapshot', framing, width: 320, height: 400, quality: 0.9 }), 450);
        if (m.type === 'snapshot') resolve(m.dataUrl);
      };
      window.__lovel.handle({ type: 'qa', emotion, viseme });
    }), { framing, emotion, viseme });
    tiles.push({ label, dataUrl, square: framing === 'face' });
  }
  await page.close();

  // hoja de contactos: una imagen por personaje con todas las variantes
  const sheet = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
  await sheet.setContent(`<body style="margin:12px;font:13px system-ui,sans-serif;background:#f4f2ee">
    <h2 style="margin:0 0 8px">${p.name} · ${p.id} · ${p.gender === 'female' ? 'mujer' : 'hombre'}, ${p.age} · modelo ${p.look.model}${p.look.hair ? ` + pelo ${p.look.hair}` : ''}${p.look.accessories.length ? ` · accesorios: ${p.look.accessories.join(', ')}` : ''}</h2>
    <div style="display:flex;gap:12px;margin-bottom:10px;align-items:flex-end">
      <figure style="margin:0"><img src="${rest}" style="width:320px;height:320px;object-fit:cover;border-radius:6px;display:block"/><figcaption>cara en reposo (2×)</figcaption></figure>
      <figure style="margin:0"><div style="width:320px;height:320px;border-radius:6px;background:url(${rest}) 50% 56%/220% no-repeat"></div><figcaption>boca y ojos en reposo (ampliado)</figcaption></figure>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">${tiles.map((t) => `<figure style="margin:0;width:${t.square ? 160 : 160}px"><img src="${t.dataUrl}" style="width:160px;${t.square ? 'height:160px' : 'height:200px'};object-fit:cover;border-radius:6px;display:block"/><figcaption>${t.label}</figcaption></figure>`).join('')}</div>
  </body>`);
  await sheet.screenshot({ path: `${OUT}/${p.id}.png`, fullPage: true });
  await sheet.close();
  manifest.characters[p.id] = { look: lookHash(p), status: 'pending', checkedAt: new Date().toISOString().slice(0, 10) };
  console.log('✓', `${OUT}/${p.id}.png`);
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
await browser.close();
console.log('Ahora revisa las hojas con docs/qa/CHECKLIST.md y marca cada personaje como "approved" en el manifiesto.');
