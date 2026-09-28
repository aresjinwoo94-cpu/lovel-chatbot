/**
 * Proyecto de Supabase de Lovel House.
 * La anon key es PÚBLICA por diseño (va dentro de cualquier app); la seguridad
 * la dan las reglas RLS de la base de datos. Puedes sobreescribir ambos valores
 * con EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en un archivo .env.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://snzcphkpzbjdzqjhzgzu.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuemNwaGtwemJqZHpxamh6Z3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MzA2NjMsImV4cCI6MjEwNjEwNjY2M30.HgAGnJCWRRpp1jMFPLVzvO_sF8MNXTGLReGIyR0-xaE';
