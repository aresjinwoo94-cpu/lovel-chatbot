/**
 * Paletas de Lovel House (claro y oscuro). Fuente única para la app
 * (src/constants/theme.ts) y para Tailwind (tailwind.config.js), que las usa
 * como variables CSS --c-<token>.
 */
const light = {
  /** Fondo general */
  cream: '#F9F7F3',
  /** Relleno neutro (controles, selección secundaria) */
  subtle: '#F2EFEA',
  /** Tarjetas y superficies */
  paper: '#FFFFFF',
  primary: '#6F5BD3',
  primarySoft: '#E9E4FA',
  primaryDeep: '#5A47B8',
  accent: '#E6A0B4',
  accentSoft: '#F8E8ED',
  /** Texto principal y secundario */
  ink: '#242229',
  muted: '#66626C',
  line: '#E8E4DE',
  /** En línea / éxito */
  success: '#69B58A',
  successSoft: '#E3F2E9',
  successInk: '#2F7A4F',
  accentInk: '#9C4A62',
  goldSoft: '#F6EDD8',
  goldInk: '#8A6420',
  /** Acciones destructivas */
  danger: '#B4233C',
};

const dark = {
  cream: '#121015',
  subtle: '#24212A',
  paper: '#1B1920',
  primary: '#9C8BF0',
  primarySoft: '#2D2650',
  primaryDeep: '#B9ADF6',
  accent: '#E6A0B4',
  accentSoft: '#3A2530',
  ink: '#F1EEF5',
  muted: '#A7A2B0',
  line: '#322E39',
  success: '#7CC79C',
  successSoft: '#1E3328',
  successInk: '#8FD9AE',
  accentInk: '#F0B3C5',
  goldSoft: '#35291A',
  goldInk: '#E8C584',
  danger: '#FF8A9B',
};

/** "#RRGGBB" → "R G B" (formato de las variables CSS de Tailwind). */
const triplet = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const kebab = (k) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const toVars = (p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [`--c-${kebab(k)}`, triplet(v)]));

module.exports = { light, dark, cssVarsLight: toVars(light), cssVarsDark: toVars(dark) };
