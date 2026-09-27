import { Platform } from 'react-native';

/**
 * Tokens de diseño compartidos (los mismos que tailwind.config.js) para
 * los lugares donde necesitamos colores en JS: SVG, animaciones, iconos.
 */
export const colors = {
  cream: '#FBF6F2',
  paper: '#FFFFFF',
  ink: '#2E2A2B',
  muted: '#7C7270',
  line: '#EADFD8',
  blush: '#F6E3E0',
  rose: '#D98C95',
  roseDeep: '#B96671',
  roseSoft: '#FCE8E6',
  sage: '#8FAE95',
  wall: '#F3ECE4',
} as const;

/** Serif clásica para títulos (Georgia en iOS/web, serif del sistema en Android). */
export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

/**
 * Lado de las burbujas, tal como pide el diseño:
 * mensajes del usuario a la izquierda, respuestas del avatar a la derecha.
 * Cambia estos valores si prefieres el orden clásico de WhatsApp.
 */
export const BUBBLE_SIDE: Record<'user' | 'avatar', 'left' | 'right'> = {
  user: 'left',
  avatar: 'right',
};
