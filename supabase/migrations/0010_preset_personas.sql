-- WP-6: los personajes del catálogo tienen una forma de ser y de hablar propia (PERSONAS en
-- supabase/functions/_shared/roleplay.ts). El avatar guarda de qué personaje parte.
alter table public.avatars
  add column if not exists preset_id text
  check (preset_id is null or preset_id ~ '^[a-z0-9_-]{1,32}$');
