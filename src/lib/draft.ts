import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CharacterLook } from './character/types';
import type { Gender } from './types';

/**
 * Personaje en borrador: se crea sin cuenta y se guarda en el dispositivo
 * (localStorage en web, AsyncStorage en móvil). Sobrevive al login con Google
 * (que recarga la página) y se convierte en personaje real al iniciar sesión.
 */
export interface CharacterDraft {
  name: string;
  gender: Gender;
  age: number;
  look: CharacterLook;
  traits: string[];
  scenarioId: string | null;
  customScene: string;
  /** Foto de perfil capturada del 3D al terminar (JPEG en data URL). */
  snapshot?: string | null;
  /** Paso del creador donde se quedó. */
  step: number;
  /** true cuando la persona pulsó "Empezar la historia" (hay que crearlo al entrar). */
  ready: boolean;
  savedAt: number;
}

const KEY = 'lovel.draft.v2';
const MAX_AGE = 1000 * 60 * 60 * 24 * 14;

export async function loadDraft(): Promise<CharacterDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as CharacterDraft;
    if (!d?.look || Date.now() - (d.savedAt ?? 0) > MAX_AGE) return null;
    return d;
  } catch {
    return null;
  }
}

export async function saveDraft(d: Omit<CharacterDraft, 'savedAt'>) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...d, savedAt: Date.now() }));
  } catch {
    // almacenamiento no disponible (modo privado): el creador sigue funcionando en memoria
  }
}

export async function clearDraft() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // nada que limpiar
  }
}
