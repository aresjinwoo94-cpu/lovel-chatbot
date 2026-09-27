/**
 * Tailwind de Lovel House.
 * Paleta cálida y delicada: crema, tinta suave y un rosa empolvado como acento.
 * Tipografía clásica: serif para títulos, sans-serif del sistema para el cuerpo.
 * Nada de cursivas ni fuentes "gimmick".
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cream: '#FBF6F2',
        paper: '#FFFFFF',
        ink: '#2E2A2B',
        muted: '#7C7270',
        line: '#EADFD8',
        blush: '#F6E3E0',
        rose: {
          DEFAULT: '#D98C95',
          deep: '#B96671',
          soft: '#FCE8E6',
        },
        sage: '#8FAE95',
        wall: '#F3ECE4',
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        sans: ['System'],
      },
      borderRadius: {
        bubble: '18px',
      },
    },
  },
  plugins: [],
};
