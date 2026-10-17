import AsyncStorage from '@react-native-async-storage/async-storage';

/** Dónde se guarda en el dispositivo la respuesta de la puerta 18+ ('adult' | 'minor'). */
export const AGE_KEY = 'lovel.ageGate.v1';

/** ¿Pasó la puerta 18+ en este dispositivo? (lo envían chat, start-chat y voice-chat). */
export async function adultConfirmedHere(): Promise<boolean> {
  return (await AsyncStorage.getItem(AGE_KEY).catch(() => null)) === 'adult';
}
