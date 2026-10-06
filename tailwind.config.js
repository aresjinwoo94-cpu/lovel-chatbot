/**
 * Tailwind de Lovel House — identidad visual oficial (modo claro).
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
      colors: {
        cream: '#F9F7F3',
        subtle: '#F2EFEA',
        paper: '#FFFFFF',
        ink: '#242229',
        muted: '#77737D',
        line: '#E8E4DE',
        primary: {
          DEFAULT: '#6F5BD3',
          soft: '#E9E4FA',
          deep: '#5A47B8',
        },
        accent: {
          DEFAULT: '#E6A0B4',
          soft: '#F8E8ED',
        },
        success: '#69B58A',
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
  plugins: [],
};
