-- Muestras de voz del creador (públicas, las escribe solo la Edge Function voice-preview).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-previews', 'voice-previews', true, 2097152, array['audio/mpeg'])
on conflict (id) do nothing;
