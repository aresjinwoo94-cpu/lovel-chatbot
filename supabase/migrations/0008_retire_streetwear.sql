-- =============================================================================
-- Lovel House · retirar el conjunto "Urbana" (falda plisada + chaqueta
-- universitaria), que también leía como uniforme escolar. Los personajes
-- guardados pasan al cuerpo "Casual" con ropa lisa (RETIRED_MODELS en
-- src/lib/character/catalog.ts). Era VRM 1: su peinado no se puede conservar.
-- =============================================================================
update public.avatars
   set appearance = appearance || jsonb_build_object('model', 'mei', 'hair', null, 'plainOutfit', true),
       appearance_description = regexp_replace(coalesce(appearance_description, ''), 'estilo urbana', 'estilo casual', 'gi'),
       avatar_image_url = null,
       use_portrait = false
 where appearance ->> 'model' = 'sample_b';
