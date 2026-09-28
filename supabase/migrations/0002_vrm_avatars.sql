-- =============================================================================
-- Lovel House · avatares VRM (estilo VTuber)
--   vrm-models  (público): modelos base de VRoid incluidos en la app
--   vrm-custom  (público, rutas no adivinables): VRM propios que suben los usuarios (Pro)
--   avatar-portraits: miniaturas del avatar que la app genera al guardarlo
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('vrm-models', 'vrm-models', true, 52428800),
  ('vrm-custom', 'vrm-custom', true, 52428800)
on conflict (id) do nothing;

-- Cada usuario solo puede escribir dentro de su propia carpeta (<user_id>/...)
create policy "vrm propios: leer" on storage.objects
  for select to authenticated using (bucket_id = 'vrm-custom' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vrm propios: subir" on storage.objects
  for insert to authenticated with check (bucket_id = 'vrm-custom' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vrm propios: borrar" on storage.objects
  for delete to authenticated using (bucket_id = 'vrm-custom' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "miniaturas propias: leer" on storage.objects
  for select to authenticated using (bucket_id = 'avatar-portraits' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "miniaturas propias: subir" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatar-portraits' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "miniaturas propias: actualizar" on storage.objects
  for update to authenticated using (bucket_id = 'avatar-portraits' and (storage.foldername(name))[1] = auth.uid()::text);

-- La app guarda la URL de la miniatura del avatar.
grant update (avatar_image_url) on public.avatars to authenticated;
