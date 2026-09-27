/**
 * Genera las animaciones Lottie de la app (hechas a mano, sin herramientas externas):
 *  - assets/lottie/typing.json     → tres puntitos de "escribiendo…"
 *  - assets/lottie/soundwave.json  → ondas de sonido de la voz del avatar
 * Uso: node scripts/make-lottie.mjs
 */
import { writeFileSync } from 'node:fs';

const rgb = (hex) => [1, 3, 5].map((i) => +(parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).concat(1);
const ease = { i: { x: [0.45], y: [1] }, o: { x: [0.55], y: [0] } };
const st = (k) => ({ a: 0, k });
const transform = { ty: 'tr', p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100), sk: st(0), sa: st(0), nm: 'tr' };

function layer(ind, nm, ks, shapes, op) {
  return { ddd: 0, ind, ty: 4, nm, sr: 1, ks, ao: 0, shapes, ip: 0, op, st: 0, bm: 0 };
}

// --- Puntos de "escribiendo…" -------------------------------------------------
{
  const op = 36;
  const color = rgb('#B96671');
  const layers = [0, 1, 2].map((n) => {
    const x = 12 + n * 18;
    const d = n * 5;
    return layer(
      n + 1,
      `dot${n}`,
      {
        o: { a: 1, k: [{ t: d, s: [45], ...ease }, { t: d + 9, s: [100], ...ease }, { t: d + 18, s: [45] }] },
        r: st(0),
        p: { a: 1, k: [{ t: d, s: [x, 16, 0], ...ease }, { t: d + 9, s: [x, 8, 0], ...ease }, { t: d + 18, s: [x, 16, 0] }] },
        a: st([0, 0, 0]),
        s: st([100, 100, 100]),
      },
      [{ ty: 'gr', nm: 'g', it: [{ ty: 'el', nm: 'e', d: 1, p: st([0, 0]), s: st([9, 9]) }, { ty: 'fl', nm: 'f', c: st(color), o: st(100), r: 1 }, transform] }],
      op,
    );
  });
  writeFileSync('assets/lottie/typing.json', JSON.stringify({ v: '5.7.4', fr: 30, ip: 0, op, w: 60, h: 24, nm: 'typing', ddd: 0, assets: [], layers }));
}

// --- Ondas de sonido ------------------------------------------------------------
{
  const op = 40;
  const color = rgb('#D98C95');
  const heights = [40, 70, 100, 70, 40];
  const layers = heights.map((h, n) => {
    const x = 10 + n * 14;
    const d = n * 4;
    return layer(
      n + 1,
      `bar${n}`,
      {
        o: st(100),
        r: st(0),
        p: st([x, 24, 0]),
        a: st([0, 0, 0]),
        s: { a: 1, k: [{ t: d, s: [100, h * 0.35, 100], ...ease }, { t: d + 10, s: [100, h, 100], ...ease }, { t: d + 20, s: [100, h * 0.35, 100], ...ease }, { t: op, s: [100, h * 0.35, 100] }] },
      },
      [{ ty: 'gr', nm: 'g', it: [{ ty: 'rc', nm: 'r', d: 1, p: st([0, 0]), s: st([7, 40]), r: st(3.5) }, { ty: 'fl', nm: 'f', c: st(color), o: st(100), r: 1 }, transform] }],
      op,
    );
  });
  writeFileSync('assets/lottie/soundwave.json', JSON.stringify({ v: '5.7.4', fr: 30, ip: 0, op, w: 76, h: 48, nm: 'soundwave', ddd: 0, assets: [], layers }));
}
console.log('Lottie generados en assets/lottie/');
