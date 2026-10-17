-- =============================================================================
-- Lovel House · solo personas adultas (WP-1)
--  1. Puerta 18+: cuándo confirmó cada perfil que es mayor de edad.
--  2. Personajes guardados con cuerpos retirados (ropa que leía como uniforme
--     escolar) pasan al cuerpo adulto más cercano, con ropa lisa. Misma tabla que
--     RETIRED_MODELS en src/lib/character/catalog.ts.
--  3. Escenas de instituto reescritas como escenas universitarias (ids nuevos).
-- =============================================================================

-- 1 ---------------------------------------------------------------------------
alter table public.profiles add column if not exists adult_confirmed_at timestamptz;
grant update (adult_confirmed_at) on public.profiles to authenticated;

-- 2 ---------------------------------------------------------------------------
-- La foto de perfil capturada mostraba el uniforme: se borra para que la app use
-- el retrato del aspecto nuevo (y se regenere al volver a guardar el personaje).
update public.avatars
   set appearance = appearance || jsonb_build_object(
         'model', case appearance ->> 'model' when 'base_m' then 'fumiriya' else 'mei' end,
         'hair', coalesce(
           appearance ->> 'hair',
           case appearance ->> 'model' when 'shino' then 'shino' when 'base_f' then 'mei' else 'fumiriya' end
         ),
         'plainOutfit', true
       ),
       avatar_image_url = null,
       use_portrait = false
 where appearance ->> 'model' in ('shino', 'base_f', 'base_m');

-- El chaleco y la corbata de este cuerpo también leían como uniforme: siempre liso.
update public.avatars
   set appearance = appearance || jsonb_build_object('plainOutfit', true)
 where appearance ->> 'model' = 'fumiriya'
   and coalesce((appearance ->> 'plainOutfit')::boolean, false) = false;

-- 3 ---------------------------------------------------------------------------
update public.avatars a
   set scenario_id = m.new_id,
       situation_description = replace(
         case when a.gender = 'male' then m.setup_m else m.setup_f end,
         '{name}', a.name
       )
  from (values
    ('classmate-help', 'campus-favor',
     '{name}, el compañero de facultad más popular y que nunca te ha dirigido la palabra, te detiene a la salida de la biblioteca: necesita tu ayuda con algo y no puede pedírselo a nadie más.',
     '{name}, la compañera de facultad más popular y que nunca te ha dirigido la palabra, te detiene a la salida de la biblioteca: necesita tu ayuda con algo y no puede pedírselo a nadie más.'),
    ('rooftop-lunch', 'campus-terrace',
     'Subes a la terraza de la residencia universitaria para comer con calma y encuentras a {name}, el nuevo de la residencia de quien todo el mundo habla, sentado en tu sitio de siempre.',
     'Subes a la terraza de la residencia universitaria para comer con calma y encuentras a {name}, la nueva de la residencia de quien todo el mundo habla, sentada en tu sitio de siempre.'),
    ('festival-night', 'campus-festival',
     'Última noche de las fiestas de la universidad. Los fuegos artificiales están por empezar y {name}, tu compañero de proyecto, te encuentra junto a la fuente del campus, lejos del ruido.',
     'Última noche de las fiestas de la universidad. Los fuegos artificiales están por empezar y {name}, tu compañera de proyecto, te encuentra junto a la fuente del campus, lejos del ruido.'),
    ('detention', 'campus-all-nighter',
     'Es la víspera del examen final y la biblioteca de la universidad cierra en diez minutos. Solo quedan tú y {name}, tu rival de carrera, que te propone seguir estudiando en la cafetería de veinticuatro horas.',
     'Es la víspera del examen final y la biblioteca de la universidad cierra en diez minutos. Solo quedan tú y {name}, tu rival de carrera, que te propone seguir estudiando en la cafetería de veinticuatro horas.')
  ) as m(old_id, new_id, setup_m, setup_f)
 where a.scenario_id = m.old_id;
