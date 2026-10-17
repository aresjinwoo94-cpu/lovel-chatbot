-- =============================================================================
-- Lovel House · solo personas adultas (WP-1, correcciones de la revisión)
--  1. La descripción de aspecto que lee la IA aún decía "colegiala", "uniforme"
--     o "estudiante" en personajes ya migrados: se reescribe al estilo nuevo.
--  2. Fotos de perfil del cuerpo "fumiriya" capturadas con chaleco y corbata.
--  3. La memoria larga de historias que empezaron en el instituto se reinicia
--     para que no arrastre ese contexto (los mensajes se conservan).
-- =============================================================================

-- 1 ---------------------------------------------------------------------------
update public.avatars
   set appearance_description = regexp_replace(
         appearance_description,
         'estilo (colegiala|uniforme|estudiante)',
         case when appearance ->> 'model' = 'fumiriya' then 'estilo camisa' else 'estilo casual' end,
         'gi'
       )
 where appearance_description ~* 'estilo (colegiala|uniforme|estudiante)';

-- 2 ---------------------------------------------------------------------------
update public.avatars
   set avatar_image_url = null,
       use_portrait = false
 where appearance ->> 'model' = 'fumiriya'
   and created_at < '2026-10-17';

-- 3 ---------------------------------------------------------------------------
update public.avatars
   set memory = null
 where scenario_id in ('campus-favor', 'campus-terrace', 'campus-festival', 'campus-all-nighter')
   and created_at < '2026-10-17'
   and memory is not null;
