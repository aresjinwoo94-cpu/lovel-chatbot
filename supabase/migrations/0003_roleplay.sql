-- =============================================================================
-- Lovel House · roleplay
--  - Personajes con rasgos de personalidad y escenario narrativo.
--  - Plan gratuito: 25 mensajes de texto + 3 notas de voz (contadores separados).
--  - Reserva atómica del cupo gratuito (no se puede saltar con peticiones en paralelo).
-- =============================================================================

alter table public.avatars add column if not exists traits text[] not null default '{}';
alter table public.avatars add column if not exists scenario_id text;

grant update (traits, scenario_id) on public.avatars to authenticated;

alter table public.profiles add column if not exists free_voice_used integer not null default 0;

-- Reserva un mensaje gratuito SOLO si queda cupo (texto o voz).
-- Devuelve el perfil actualizado, o nada si el cupo se agotó.
create or replace function public.reserve_free_message(p_user uuid, p_kind text, p_limit integer)
returns setof public.profiles
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set free_messages_used = free_messages_used + case when p_kind = 'voice' then 0 else 1 end,
         free_voice_used = free_voice_used + case when p_kind = 'voice' then 1 else 0 end,
         trial_started_at = coalesce(trial_started_at, now())
   where id = p_user
     and (case when p_kind = 'voice' then free_voice_used else free_messages_used end) < p_limit
  returning *;
$$;

-- Devuelve el cupo si la respuesta falló (error de la IA o de la voz).
create or replace function public.refund_free_message(p_user uuid, p_kind text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set free_messages_used = greatest(0, free_messages_used - case when p_kind = 'voice' then 0 else 1 end),
         free_voice_used = greatest(0, free_voice_used - case when p_kind = 'voice' then 1 else 0 end)
   where id = p_user;
$$;

revoke execute on function public.reserve_free_message(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.refund_free_message(uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_free_message(uuid, text, integer) to service_role;
grant execute on function public.refund_free_message(uuid, text) to service_role;

drop function if exists public.consume_free_message(uuid);

-- La vista usa a.* y hay que recrearla para que incluya las columnas nuevas.
drop view if exists public.avatar_threads;
create view public.avatar_threads
with (security_invoker = true) as
select
  a.*,
  lm.content as last_content,
  lm.kind as last_kind,
  lm.role as last_role,
  coalesce(mc.total, 0)::int as message_count
from public.avatars a
left join lateral (
  select m.content, m.kind, m.role
  from public.messages m
  where m.avatar_id = a.id
  order by m.created_at desc
  limit 1
) lm on true
left join lateral (
  select count(*) as total from public.messages m where m.avatar_id = a.id
) mc on true;

grant select on public.avatar_threads to authenticated;
