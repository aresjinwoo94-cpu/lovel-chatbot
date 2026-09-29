/**
 * Tailwind de Lovel House — identidad visual oficial (modo claro).
 * Tipografía: Plus Jakarta Sans para toda la interfaz y DM Serif Display
 * solo para nombres de personajes y momentos emocionales.
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
        serif: ['DMSerifDisplay_400Regular'],
      },
      borderRadius: {
        bubble: '20px',
      },
    },
  },
  plugins: [],
};
