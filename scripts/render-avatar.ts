/**
 * Genera los PNG de marca (icono, splash, favicon, retrato de referencia)
 * a partir del mismo SVG que usa la app. Uso:
 *   bun scripts/render-avatar.ts            (requiere Chromium de Playwright)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { avatarToSvgString, defaultAppearanceFor, REFERENCE_APPEARANCE } from '../src/lib/avatarGeometry';

const out = process.argv[2] ?? 'assets/images';
mkdirSync(out, { recursive: true });

const ref = avatarToSvgString(REFERENCE_APPEARANCE, 'female', 26, 'smile', 1024);

async function shot(html: string, file: string, w: number, h: number) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`);
  await page.screenshot({ path: `${out}/${file}`, omitBackground: true });
  await page.close();
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
await shot(ref, 'icon.png', 1024, 1024);
await shot(ref, 'reference-avatar.png', 1024, 1024);
await shot(ref.replace('width="1024" height="1024"', 'width="48" height="48"'), 'favicon.png', 48, 48);
// Splash: avatar en círculo sobre fondo transparente
await shot(`<div style="width:512px;height:512px;border-radius:50%;overflow:hidden">${ref.replace('width="1024" height="1024"', 'width="512" height="512"')}</div>`, 'splash-icon.png', 512, 512);
// Android adaptive: primer plano sin fondo (el fondo va en background)
const fg = avatarToSvgString(REFERENCE_APPEARANCE, 'female', 26, 'smile', 800, 'character');
await shot(`<div style="padding:224px 112px 0">${fg}</div>`, 'android-icon-foreground.png', 1024, 1024);
await shot(avatarToSvgString(REFERENCE_APPEARANCE, 'female', 26, 'smile', 1024, 'scene'), 'android-icon-background.png', 1024, 1024);
await shot(`<div style="padding:224px 112px 0;filter:grayscale(1) brightness(0)">${fg}</div>`, 'android-icon-monochrome.png', 1024, 1024);

// Hoja de muestra con variantes (solo para revisar el estilo)
if (process.env.PREVIEW) {
  const variants = [
    avatarToSvgString(REFERENCE_APPEARANCE, 'female', 26, 'neutral', 220),
    avatarToSvgString(REFERENCE_APPEARANCE, 'female', 26, 'smile', 220),
    avatarToSvgString(REFERENCE_APPEARANCE, 'female', 26, 'thinking', 220),
    avatarToSvgString({ ...REFERENCE_APPEARANCE, hairStyle: 'long', hairColor: '#15121A', eyeColor: '#4F78B5', background: ['#0E1433', '#2B2F6B', '#7A62B0'] }, 'female', 24, 'smile', 220),
    avatarToSvgString({ ...defaultAppearanceFor('male'), beard: true }, 'male', 45, 'smile', 220),
    avatarToSvgString({ ...defaultAppearanceFor('other'), glasses: true, freckles: true }, 'other', 30, 'neutral', 220),
    avatarToSvgString({ ...REFERENCE_APPEARANCE, hairStyle: 'curly', skinTone: '#A86B45', hairColor: '#1E1B1D' }, 'female', 34, 'smile', 220),
    avatarToSvgString({ ...REFERENCE_APPEARANCE, hairStyle: 'bun', hairColor: '#9A9A9A' }, 'female', 58, 'smile', 220),
    avatarToSvgString({ ...defaultAppearanceFor('male'), hairStyle: 'buzz', skinTone: '#7A4A2E' }, 'male', 22, 'thinking', 220),
  ];
  await shot(`<div style="display:flex;flex-wrap:wrap;gap:8px;width:1170px;background:#fff">${variants.join('')}</div>`, 'preview.png', 1170, 460);
}
await browser.close();
