-- WP-12: el personaje puede escribirte primero (apagado por defecto).
-- Decide el servidor (Edge Function proactive-tick, llamada cada hora por pg_cron).

-- Por personaje: apagado, "De vez en cuando" o "Seguido".
alter table public.avatars add column if not exists proactive_mode text not null default 'off'
  check (proactive_mode in ('off', 'sometimes', 'often'));
grant update (proactive_mode) on public.avatars to authenticated;

-- Horario de silencio (hora local de la persona): por defecto de 22:00 a 9:00.
alter table public.profiles add column if not exists quiet_start smallint not null default 22 check (quiet_start between 0 and 23);
alter table public.profiles add column if not exists quiet_end smallint not null default 9 check (quiet_end between 0 and 23);
grant update (quiet_start, quiet_end) on public.profiles to authenticated;

-- Mensajes que el personaje escribió por su cuenta (no gastan Platino).
alter table public.messages add column if not exists proactive boolean not null default false;
create index if not exists messages_proactive_idx on public.messages (user_id, created_at desc) where proactive;

-- Dónde avisar: suscripción push del navegador (web) o token de Expo (Android/iOS).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('web', 'expo')),
  endpoint text not null unique,          -- URL push del navegador o ExponentPushToken[...]
  p256dh text,
  auth text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push: ver las propias" on public.push_subscriptions;
create policy "push: ver las propias" on public.push_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "push: crear las propias" on public.push_subscriptions;
create policy "push: crear las propias" on public.push_subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "push: borrar las propias" on public.push_subscriptions;
create policy "push: borrar las propias" on public.push_subscriptions for delete using (auth.uid() = user_id);
revoke update on public.push_subscriptions from anon, authenticated;

-- Candidatos de esta hora: personajes con mensajes propios activados, con su perfil y la
-- última actividad de la conversación. La decisión fina (horario, límites, azar) la toma
-- la función, que se puede probar con un reloj simulado.
create or replace function public.proactive_candidates()
returns table (
  avatar_id uuid, user_id uuid, mode text, is_pro boolean, timezone text, quiet_start smallint, quiet_end smallint,
  language text, last_role text, last_proactive boolean, last_at timestamptz, user_messages bigint, sent_today bigint
)
language sql security definer set search_path = public as $$
  select a.id, a.user_id, a.proactive_mode, p.is_pro, coalesce(p.timezone, 'UTC'), p.quiet_start, p.quiet_end, p.language,
         lm.role, lm.proactive, lm.created_at,
         (select count(*) from public.messages m where m.avatar_id = a.id and m.role = 'user'),
         (select count(*) from public.messages m
           where m.user_id = a.user_id and m.proactive
             and (m.created_at at time zone coalesce(p.timezone, 'UTC'))::date = (now() at time zone coalesce(p.timezone, 'UTC'))::date)
    from public.avatars a
    join public.profiles p on p.id = a.user_id
    join auth.users u on u.id = a.user_id and not coalesce(u.is_anonymous, false)
    left join lateral (
      select m.role, m.proactive, m.created_at from public.messages m
       where m.avatar_id = a.id order by m.created_at desc limit 1
    ) lm on true
   where a.proactive_mode <> 'off';
$$;
revoke execute on function public.proactive_candidates() from public, anon, authenticated;
grant execute on function public.proactive_candidates() to service_role;

-- Programación: cada hora (minuto 7) pg_cron llama a la función con un secreto guardado en Vault.
create extension if not exists pg_net;
create extension if not exists pg_cron;
