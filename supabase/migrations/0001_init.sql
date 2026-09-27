-- =============================================================================
-- Lovel House · esquema inicial
-- Usuarios (profiles), Avatares, Conversaciones y Mensajes (texto + voz).
-- Seguridad: RLS en todo. El cliente solo LEE mensajes; los escriben las
-- Edge Functions (service role) para poder aplicar el límite del plan gratuito.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PROFILES (1:1 con auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  language text not null default 'es' check (language in ('es', 'en')),
  is_pro boolean not null default false,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,
  current_period_end timestamptz,
  trial_started_at timestamptz,
  free_messages_used integer not null default 0,
  store_voice boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: leer el propio" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: editar el propio" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- El usuario solo puede cambiar estas columnas; plan, Stripe y prueba gratuita
-- los controla el backend.
revoke update on public.profiles from authenticated, anon;
grant update (display_name, language, store_voice) on public.profiles to authenticated;

-- Crea el perfil al registrarse (Google o email).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cuenta un mensaje del periodo gratuito de forma atómica (solo backend).
create or replace function public.consume_free_message(p_user uuid)
returns public.profiles
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set free_messages_used = free_messages_used + 1,
         trial_started_at = coalesce(trial_started_at, now())
   where id = p_user
  returning *;
$$;

revoke execute on function public.consume_free_message(uuid) from public, anon, authenticated;
grant execute on function public.consume_free_message(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- AVATARS
-- -----------------------------------------------------------------------------
create table public.avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  gender text not null check (gender in ('female', 'male', 'other')),
  age integer not null check (age between 18 and 60),
  appearance jsonb not null,
  appearance_description text,
  situation_description text not null check (char_length(trim(situation_description)) > 0),
  avatar_image_url text,
  use_portrait boolean not null default false,
  voice_id text,
  memory text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);

create index avatars_user_idx on public.avatars (user_id, last_message_at desc);

alter table public.avatars enable row level security;

create policy "avatars: leer los propios" on public.avatars
  for select using (auth.uid() = user_id);
create policy "avatars: crear los propios" on public.avatars
  for insert with check (auth.uid() = user_id);
create policy "avatars: editar los propios" on public.avatars
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "avatars: borrar los propios" on public.avatars
  for delete using (auth.uid() = user_id);

-- La memoria y el retrato los escribe el backend; el usuario solo edita esto.
revoke update on public.avatars from authenticated, anon;
grant update (name, appearance, appearance_description, situation_description, use_portrait, voice_id)
  on public.avatars to authenticated;

-- Plan gratuito: 1 avatar. Pro: ilimitados.
create or replace function public.enforce_avatar_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pro boolean;
  total integer;
begin
  select is_pro into pro from public.profiles where id = new.user_id;
  if coalesce(pro, false) then
    return new;
  end if;
  select count(*) into total from public.avatars where user_id = new.user_id;
  if total >= 1 then
    raise exception 'AVATAR_LIMIT: el plan gratuito incluye un avatar';
  end if;
  return new;
end;
$$;

create trigger avatars_limit
  before insert on public.avatars
  for each row execute function public.enforce_avatar_limit();

-- -----------------------------------------------------------------------------
-- CONVERSATIONS (una por avatar)
-- -----------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  avatar_id uuid not null unique references public.avatars (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "conversations: leer las propias" on public.conversations
  for select using (auth.uid() = user_id);

create or replace function public.create_conversation_for_avatar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.conversations (avatar_id, user_id) values (new.id, new.user_id);
  return new;
end;
$$;

create trigger avatars_conversation
  after insert on public.avatars
  for each row execute function public.create_conversation_for_avatar();

-- -----------------------------------------------------------------------------
-- MESSAGES (texto + voz)
-- -----------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  avatar_id uuid not null references public.avatars (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'avatar')),
  kind text not null default 'text' check (kind in ('text', 'voice')),
  content text not null default '',
  audio_path text,
  audio_duration_ms integer,
  created_at timestamptz not null default clock_timestamp()
);

create index messages_avatar_created_idx on public.messages (avatar_id, created_at desc);

alter table public.messages enable row level security;

create policy "messages: leer los propios" on public.messages
  for select using (auth.uid() = user_id);

-- Mantiene al día la fecha del último mensaje (orden de la lista de chats).
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.avatars set last_message_at = new.created_at where id = new.avatar_id;
  update public.conversations set updated_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- -----------------------------------------------------------------------------
-- Vista para la lista de chats (avatar + último mensaje), respeta RLS.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Realtime: el perfil se actualiza en vivo cuando Stripe activa Pro.
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.profiles;

-- -----------------------------------------------------------------------------
-- STORAGE
--   voice-messages (privado): <user_id>/<archivo>
--   avatar-portraits (público): retratos ilustrados generados
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('voice-messages', 'voice-messages', false), ('avatar-portraits', 'avatar-portraits', true)
on conflict (id) do nothing;

create policy "voz: leer mis audios" on storage.objects
  for select using (bucket_id = 'voice-messages' and (storage.foldername(name))[1] = auth.uid()::text);
