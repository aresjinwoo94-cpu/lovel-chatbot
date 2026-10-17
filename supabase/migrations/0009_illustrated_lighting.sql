-- =============================================================================
-- Lovel House · estilo ilustración (WP-2)
-- La iluminación "illustrated" pasa a ser la de por defecto y los personajes
-- guardados con la antigua (vtuber, casi plana) se cambian a la nueva. "vtuber"
-- sigue disponible en Personalizar para quien la prefiera.
-- =============================================================================
update public.avatars
   set appearance = appearance || jsonb_build_object('lighting', 'illustrated')
 where coalesce(appearance ->> 'lighting', 'vtuber') = 'vtuber';
