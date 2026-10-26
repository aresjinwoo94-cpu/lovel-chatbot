-- WP-12: guardar un mensaje por su cuenta de forma atómica. Aunque coincidan dos pasadas,
-- se vuelven a comprobar (con el personaje bloqueado) las reglas que impiden duplicarlo:
-- sigue activado, el último mensaje no es ya uno por su cuenta y no se pasó del límite diario.
create or replace function public.proactive_insert(p_avatar uuid, p_content text, p_limit integer)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a public.avatars;
  conv uuid;
  tz text;
  last_proactive boolean;
  today_count integer;
  mid uuid;
begin
  select * into a from public.avatars where id = p_avatar for update;
  if not found or a.proactive_mode = 'off' then return null; end if;
  select m.proactive into last_proactive from public.messages m where m.avatar_id = p_avatar order by m.created_at desc limit 1;
  if coalesce(last_proactive, false) then return null; end if;
  select coalesce(timezone, 'UTC') into tz from public.profiles where id = a.user_id;
  perform pg_advisory_xact_lock(hashtext('proactive:' || a.user_id::text));
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
