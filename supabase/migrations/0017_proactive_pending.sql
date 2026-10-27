-- WP-12 (2ª revisión): "esperando respuesta" solo cuenta si el mensaje espontáneo es de un
-- personaje que sigue activado y la persona no ha escrito NADA (a ningún personaje) después.
-- Antes, apagar a un personaje sin contestarle bloqueaba para siempre a los demás.

create or replace function public.proactive_user_pending(p_user uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.messages m
      join public.avatars a on a.id = m.avatar_id and a.proactive_mode <> 'off'
     where m.user_id = p_user and m.proactive
       and not exists (select 1 from public.messages u where u.user_id = p_user and u.role = 'user' and u.created_at > m.created_at)
  );
$$;
revoke execute on function public.proactive_user_pending(uuid) from public, anon, authenticated;
grant execute on function public.proactive_user_pending(uuid) to service_role;

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
         public.proactive_user_pending(a.user_id)
    from public.avatars a
    join public.profiles p on p.id = a.user_id
    join auth.users u on u.id = a.user_id and not coalesce(u.is_anonymous, false)
    join last l on l.avatar_id = a.id
   where a.proactive_mode <> 'off';
$$;
revoke execute on function public.proactive_candidates() from public, anon, authenticated;
grant execute on function public.proactive_candidates() to service_role;

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
  pending := public.proactive_user_pending(a.user_id);
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
