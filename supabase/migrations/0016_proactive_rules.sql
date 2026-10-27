-- WP-12 (revisión): si la persona no contestó a un mensaje por su cuenta de CUALQUIER
-- personaje, ninguno vuelve a escribirle hasta que hable; y la programación horaria queda
-- en el repositorio (el secreto se guarda aparte en Vault con el nombre 'proactive_secret').

drop function if exists public.proactive_candidates();
create function public.proactive_candidates()
returns table (
  avatar_id uuid, user_id uuid, mode text, is_pro boolean, timezone text, quiet_start smallint, quiet_end smallint,
  language text, last_role text, last_proactive boolean, last_at timestamptz, user_messages bigint, sent_today bigint,
  user_pending boolean
)
language sql security definer set search_path = public as $$
  with last as (
    select a.id as avatar_id, a.user_id, lm.role, lm.proactive, lm.created_at
      from public.avatars a
      left join lateral (
        select m.role, m.proactive, m.created_at from public.messages m
         where m.avatar_id = a.id order by m.created_at desc limit 1
      ) lm on true
  )
  select a.id, a.user_id, a.proactive_mode, p.is_pro, coalesce(p.timezone, 'UTC'), p.quiet_start, p.quiet_end, p.language,
         l.role, l.proactive, l.created_at,
         (case when exists (select 1 from public.messages m where m.avatar_id = a.id and m.role = 'user') then 1 else 0 end)::bigint,
         (select count(*) from public.messages m
           where m.user_id = a.user_id and m.proactive
             and (m.created_at at time zone coalesce(p.timezone, 'UTC'))::date = (now() at time zone coalesce(p.timezone, 'UTC'))::date),
         exists (select 1 from last l2 where l2.user_id = a.user_id and coalesce(l2.proactive, false))
    from public.avatars a
    join public.profiles p on p.id = a.user_id
    join auth.users u on u.id = a.user_id and not coalesce(u.is_anonymous, false)
    join last l on l.avatar_id = a.id
   where a.proactive_mode <> 'off';
$$;
revoke execute on function public.proactive_candidates() from public, anon, authenticated;
grant execute on function public.proactive_candidates() to service_role;

-- Guardado atómico, también con la regla de "ningún otro personaje espera respuesta".
create or replace function public.proactive_insert(p_avatar uuid, p_content text, p_limit integer)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a public.avatars;
  conv uuid;
  tz text;
  pending boolean;
  today_count integer;
  mid uuid;
begin
  select * into a from public.avatars where id = p_avatar for update;
  if not found or a.proactive_mode = 'off' then return null; end if;
  perform pg_advisory_xact_lock(hashtext('proactive:' || a.user_id::text));
  select exists (
    select 1 from public.avatars a2
     cross join lateral (select m.proactive from public.messages m where m.avatar_id = a2.id order by m.created_at desc limit 1) lm
     where a2.user_id = a.user_id and lm.proactive
  ) into pending;
  if pending then return null; end if;
  select coalesce(timezone, 'UTC') into tz from public.profiles where id = a.user_id;
  select count(*) into today_count from public.messages m
   where m.user_id = a.user_id and m.proactive
     and (m.created_at at time zone tz)::date = (now() at time zone tz)::date;
  if today_count >= p_limit then return null; end if;
  select id into conv from public.conversations where avatar_id = p_avatar;
  if conv is null then return null; end if;
  insert into public.messages (conversation_id, avatar_id, user_id, role, kind, content, proactive)
  values (conv, p_avatar, a.user_id, 'avatar', 'text', p_content, true)
  returning id into mid;
  return mid;
end;
$$;
revoke execute on function public.proactive_insert(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.proactive_insert(uuid, text, integer) to service_role;

-- Suscripción de avisos de este dispositivo para la cuenta con sesión: si el navegador o
-- el móvil estaba con otra cuenta, pasa a esta (la otra deja de recibir avisos aquí).
create or replace function public.claim_push_subscription(p_kind text, p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  if p_kind not in ('web', 'expo') or coalesce(p_endpoint, '') = '' then raise exception 'suscripción inválida'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, kind, endpoint, p256dh, auth) values (auth.uid(), p_kind, p_endpoint, p_p256dh, p_auth);
end;
$$;
revoke execute on function public.claim_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.claim_push_subscription(text, text, text, text) to authenticated;

-- Al cerrar sesión: borrar la suscripción de este dispositivo (solo si es de quien la borra).
create or replace function public.release_push_subscription(p_endpoint text)
returns void
language sql security definer set search_path = public as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;
revoke execute on function public.release_push_subscription(text) from public, anon;
grant execute on function public.release_push_subscription(text) to authenticated;

-- Programación horaria (minuto 7). Requiere el secreto 'proactive_secret' en Vault
-- (igual que el secreto PROACTIVE_SECRET de las Edge Functions):
--   select vault.create_secret('<secreto>', 'proactive_secret');
do $$
begin
  if exists (select 1 from cron.job where jobname = 'proactive-tick') then perform cron.unschedule('proactive-tick'); end if;
  perform cron.schedule('proactive-tick', '7 * * * *', $job$
    select net.http_post(
      url := 'https://snzcphkpzbjdzqjhzgzu.supabase.co/functions/v1/proactive-tick',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-proactive-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'proactive_secret')),
      body := '{}'::jsonb,
      timeout_milliseconds := 300000);
  $job$);
end $$;
