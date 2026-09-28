import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/constants/supabaseConfig';

/**
 * Cliente de Supabase.
 * Solo usa valores públicos (URL + anon key). Las claves secretas
 * (Gemini/Claude, ElevenLabs, Leonardo, Stripe) viven SOLO en las Edge Functions.
 */
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // En web usamos localStorage (por defecto); en móvil, AsyncStorage.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

// Refresca el token solo cuando la app está en primer plano (recomendación de Supabase para RN).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;
