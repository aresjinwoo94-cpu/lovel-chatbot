/**
 * Logo de Lovel House: una casa con un corazón dentro, sobre el violeta de la marca
 * (#6F5BD3), sin degradados. Una sola fuente para la app (SvgXml)
 * y para los iconos PNG (scripts/render-brand.ts).
 */
export const LOGO_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="lh-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6F5BD3"/>
      <stop offset="1" stop-color="#6F5BD3"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="24" fill="url(#lh-bg)"/>
  <path d="M23 50 L50 27 L77 50" fill="none" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M31 46 L31 73 C31 75.5 32.5 77 35 77 L65 77 C67.5 77 69 75.5 69 73 L69 46" fill="none" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M50 70 C42.5 64.5 38.5 60.5 38.5 56 C38.5 52.4 41.1 50 44.3 50 C46.8 50 48.7 51.4 50 53.4 C51.3 51.4 53.2 50 55.7 50 C58.9 50 61.5 52.4 61.5 56 C61.5 60.5 57.5 64.5 50 70 Z" fill="#FFFFFF"/>
</svg>`;

/** Solo el símbolo (sin fondo), para el icono adaptativo de Android. */
export const LOGO_GLYPH_SVG = LOGO_MARK_SVG.replace(/<rect[^>]*\/>/, '').replace(/<circle[^>]*\/>/g, '');
