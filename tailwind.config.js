const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/**
 * Tailwind de Lovel House — identidad visual oficial (claro y oscuro).
 * Tipografía: Plus Jakarta Sans en toda la interfaz (sin serif ni cursivas).
 *
 * Nota: el plugin fontWeight está desactivado a propósito. Las clases
 * font-medium / font-semibold / font-bold eligen el archivo de fuente correcto
 * (en Android e iOS las fuentes propias no admiten "peso" sintético).
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  corePlugins: {
    fontWeight: false,
  },
  theme: {
    extend: {
      // Colores como variables CSS (--c-*): cambian solos entre claro y oscuro.
      // Valores en src/constants/theme.ts; los aplica src/lib/theme.tsx.
      colors: {
        cream: v('cream'),
        subtle: v('subtle'),
        paper: v('paper'),
        ink: v('ink'),
        muted: v('muted'),
        line: v('line'),
        primary: {
          DEFAULT: v('primary'),
          soft: v('primary-soft'),
          deep: v('primary-deep'),
        },
        accent: {
          DEFAULT: v('accent'),
          soft: v('accent-soft'),
          ink: v('accent-ink'),
        },
        success: {
          DEFAULT: v('success'),
          soft: v('success-soft'),
          ink: v('success-ink'),
        },
        gold: {
          soft: v('gold-soft'),
          ink: v('gold-ink'),
        },
        danger: v('danger'),
      },
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        normal: ['PlusJakartaSans_400Regular'],
        medium: ['PlusJakartaSans_500Medium'],
        semibold: ['PlusJakartaSans_600SemiBold'],
        bold: ['PlusJakartaSans_700Bold'],
        extrabold: ['PlusJakartaSans_800ExtraBold'],
      },
      borderRadius: {
        bubble: '18px',
      },
      letterSpacing: {
        tightest: '-0.03em',
        tighter: '-0.02em',
        tight: '-0.01em',
      },
    },
  },
  plugins: [
    // Valores iniciales en web (antes de que cargue la app) según prefers-color-scheme.
    ({ addBase }) => {
      const { cssVarsLight, cssVarsDark } = require('./src/constants/palettes.js');
      addBase({
        ':root': { ...cssVarsLight, colorScheme: 'light dark' },
        '@media (prefers-color-scheme: dark)': { ':root': cssVarsDark },
        'html, body': { backgroundColor: 'rgb(var(--c-cream))' },
      });
    },
  ],
};
