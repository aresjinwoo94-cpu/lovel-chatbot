/**
 * Genera los PNG de marca (icono, splash, favicon, iconos adaptativos de
 * Android) a partir del logo de src/constants/logo.ts.
 * Uso: CHROMIUM_PATH=/ruta/a/chrome bun scripts/render-brand.ts
 */
import { chromium } from 'playwright';

import { LOGO_GLYPH_SVG, LOGO_MARK_SVG } from '../src/constants/logo';

const out = process.argv[2] ?? 'assets/images';
const sized = (svg: string, px: number) => svg.replace('<svg ', `<svg width="${px}" height="${px}" `);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function shot(html: string, file: string, w: number, h: number) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`);
  await page.screenshot({ path: `${out}/${file}`, omitBackground: true });
  await page.close();
}

// iOS: icono cuadrado sin transparencia (el sistema redondea las esquinas)
const square = LOGO_MARK_SVG.replace('rx="24"', 'rx="0"');
await shot(sized(square, 1024), 'icon.png', 1024, 1024);
await shot(sized(LOGO_MARK_SVG, 48), 'favicon.png', 48, 48);
await shot(sized(LOGO_MARK_SVG, 512), 'splash-icon.png', 512, 512);
// Android adaptativo: fondo degradado + símbolo centrado en la zona segura
await shot(`<div style="width:1024px;height:1024px;background:linear-gradient(135deg,#3A1650,#C8284F 55%,#F7923A)"></div>`, 'android-icon-background.png', 1024, 1024);
await shot(`<div style="padding:172px">${sized(LOGO_GLYPH_SVG, 680)}</div>`, 'android-icon-foreground.png', 1024, 1024);
await shot(`<div style="padding:172px;filter:brightness(0)">${sized(LOGO_GLYPH_SVG, 680)}</div>`, 'android-icon-monochrome.png', 1024, 1024);
await browser.close();
console.log('Iconos generados en', out);
