-- =============================================================================
-- Lovel House · Platino (WP-11)
-- La moneda de la app. Todo consumo se mide en Platino:
--   mensaje de texto 1 · nota de voz 8
-- Saldos (se gastan en este orden):
--   1. diario     40 al día para cuentas (no invitados); se renueva a medianoche de la
--                 zona horaria de la persona y NO se acumula.
--   2. suscripción 1.500 al mes con Pro; se fija en cada renovación (no se acumula).
--   3. regalo     15 una sola vez para invitados (sesión sin cuenta).
--   4. comprado   paquetes; NO caduca.
-- Saldos y descuentos solo en el servidor (service role), con bloqueo de fila y un
-- registro de movimientos. Las acreditaciones llevan una referencia única (pago,
-- factura…) para que un mismo pago nunca se acredite dos veces.
-- =============================================================================

alter table public.profiles
  add column if not exists platino_daily integer not null default 0 check (platino_daily >= 0),
  add column if not exists platino_daily_on date,
  add column if not exists platino_sub integer not null default 0 check (platino_sub >= 0),
  add column if not exists platino_sub_until timestamptz,
  add column if not exists platino_gift integer not null default 0 check (platino_gift >= 0),
  add column if not exists platino_bought integer not null default 0 check (platino_bought >= 0),
  add column if not exists timezone text not null default 'UTC';

-- -----------------------------------------------------------------------------
-- Registro de movimientos
-- -----------------------------------------------------------------------------
create table if not exists public.platino_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('text', 'voice', 'refund', 'daily', 'subscription', 'purchase', 'guest', 'adjust')),
  -- cuánto salió o entró de cada saldo: {"daily": -1, "sub": 0, ...}
  buckets jsonb not null default '{}'::jsonb,
  -- pago, factura o evento de origen: con él, una acreditación ocurre una sola vez
  ref text unique,
  -- de dónde viene el dinero: stripe hoy; google_play / app_store cuando haya app en tiendas
  source text,
  created_at timestamptz not null default now()
);
create index if not exists platino_ledger_user_idx on public.platino_ledger (user_id, created_at desc);

alter table public.platino_ledger enable row level security;
drop policy if exists "platino: ver mis movimientos" on public.platino_ledger;
create policy "platino: ver mis movimientos" on public.platino_ledger for select using (auth.uid() = user_id);
revoke insert, update, delete on public.platino_ledger from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Reglas (en un solo sitio; el cliente y las Edge Functions usan los mismos números)
-- -----------------------------------------------------------------------------
create or replace function public.platino_daily_amount() returns integer language sql immutable as $$ select 40 $$;
create or replace function public.platino_guest_amount() returns integer language sql immutable as $$ select 15 $$;

-- Día local de la persona (zona inválida → UTC)
create or replace function public.platino_today(p_tz text) returns date
language plpgsql stable as $$
begin
  return (now() at time zone coalesce(nullif(p_tz, ''), 'UTC'))::date;
exception when others then
  return (now() at time zone 'UTC')::date;
end;
$$;

-- Estado público del saldo
create or replace function public.platino_json(p public.profiles, p_guest boolean) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'daily', p.platino_daily,
    'sub', p.platino_sub,
    'gift', p.platino_gift,
    'bought', p.platino_bought,
    'total', p.platino_daily + p.platino_sub + p.platino_gift + p.platino_bought,
    'dailyAmount', case when p_guest then 0 else public.platino_daily_amount() end,
    'dailyOn', p.platino_daily_on,
    'subUntil', p.platino_sub_until,
    'timezone', p.timezone,
    'isPro', p.is_pro,
    'guest', p_guest
  );
$$;

-- Renueva el diario (si cambió el día) y caduca la suscripción vencida. Fila ya bloqueada.
create or replace function public.platino_refresh_locked(p_user uuid) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  guest boolean;
  today date;
begin
  select * into p from public.profiles where id = p_user;
  if not found then return null; end if;
  select coalesce(u.is_anonymous, false) into guest from auth.users u where u.id = p_user;
  today := public.platino_today(p.timezone);
  if not guest and p.platino_daily_on is distinct from today then
    update public.profiles set platino_daily = public.platino_daily_amount(), platino_daily_on = today where id = p_user returning * into p;
  end if;
  if p.platino_sub > 0 and p.platino_sub_until is not null and p.platino_sub_until < now() then
    update public.profiles set platino_sub = 0 where id = p_user returning * into p;
  end if;
  return p;
end;
$$;

-- Saldo actual (renueva el diario si toca)
create or replace function public.platino_state(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  guest boolean;
begin
  perform 1 from public.profiles where id = p_user for update;
  p := public.platino_refresh_locked(p_user);
  if p is null then return null; end if;
  select coalesce(u.is_anonymous, false) into guest from auth.users u where u.id = p_user;
  return public.platino_json(p, guest);
end;
$$;

-- Gasta Platino de forma atómica: diario → suscripción → regalo → comprado.
-- Devuelve {ok, ledgerId, state}; ok=false si no alcanza (no se descuenta nada).
create or replace function public.platino_spend(p_user uuid, p_amount integer, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  guest boolean;
  need integer := p_amount;
  d integer; s integer; g integer; b integer;
  lid bigint;
begin
  if p_amount <= 0 then raise exception 'cantidad inválida'; end if;
  perform 1 from public.profiles where id = p_user for update;
  p := public.platino_refresh_locked(p_user);
  if p is null then raise exception 'perfil no encontrado'; end if;
  select coalesce(u.is_anonymous, false) into guest from auth.users u where u.id = p_user;
  if p.platino_daily + p.platino_sub + p.platino_gift + p.platino_bought < p_amount then
    return jsonb_build_object('ok', false, 'state', public.platino_json(p, guest));
  end if;
  d := least(need, p.platino_daily); need := need - d;
  s := least(need, p.platino_sub); need := need - s;
  g := least(need, p.platino_gift); need := need - g;
  b := least(need, p.platino_bought); need := need - b;
  update public.profiles
     set platino_daily = platino_daily - d, platino_sub = platino_sub - s,
         platino_gift = platino_gift - g, platino_bought = platino_bought - b,
         trial_started_at = coalesce(trial_started_at, now())
   where id = p_user returning * into p;
  insert into public.platino_ledger (user_id, delta, reason, buckets, source)
  values (p_user, -p_amount, p_reason, jsonb_build_object('daily', -d, 'sub', -s, 'gift', -g, 'bought', -b, 'day', p.platino_daily_on), 'app')
  returning id into lid;
  return jsonb_build_object('ok', true, 'ledgerId', lid, 'state', public.platino_json(p, guest));
end;
$$;

-- Devuelve un gasto si la respuesta falló (una sola vez). El diario solo vuelve si sigue
-- siendo el mismo día; la suscripción, si no venció.
create or replace function public.platino_refund(p_ledger bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  l public.platino_ledger;
  p public.profiles;
  guest boolean;
  d integer; s integer; g integer; b integer;
begin
  select * into l from public.platino_ledger where id = p_ledger;
  if not found or l.delta >= 0 then return null; end if;
  perform 1 from public.profiles where id = l.user_id for update;
  -- idempotente: la referencia "refund:<id>" solo puede existir una vez
  insert into public.platino_ledger (user_id, delta, reason, buckets, ref, source)
  values (l.user_id, -l.delta, 'refund', l.buckets, 'refund:' || l.id, 'app')
  on conflict (ref) do nothing;
  if not found then
    select * into p from public.profiles where id = l.user_id;
  else
    select * into p from public.profiles where id = l.user_id;
    d := -coalesce((l.buckets ->> 'daily')::int, 0);
    s := -coalesce((l.buckets ->> 'sub')::int, 0);
    g := -coalesce((l.buckets ->> 'gift')::int, 0);
    b := -coalesce((l.buckets ->> 'bought')::int, 0);
    if p.platino_daily_on is distinct from (l.buckets ->> 'day')::date then d := 0; end if;
    if p.platino_sub_until is not null and p.platino_sub_until < now() then s := 0; end if;
    update public.profiles
       set platino_daily = platino_daily + d, platino_sub = platino_sub + s,
           platino_gift = platino_gift + g, platino_bought = platino_bought + b
     where id = l.user_id returning * into p;
  end if;
  select coalesce(u.is_anonymous, false) into guest from auth.users u where u.id = l.user_id;
  return public.platino_json(p, guest);
end;
$$;

-- Acredita Platino comprado (o de regalo) una sola vez por referencia de pago.
-- Devuelve true si se acreditó ahora, false si esa referencia ya estaba.
create or replace function public.platino_credit(p_user uuid, p_bucket text, p_amount integer, p_reason text, p_ref text, p_source text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_bucket not in ('bought', 'gift') or p_amount <= 0 or p_ref is null then raise exception 'acreditación inválida'; end if;
  perform 1 from public.profiles where id = p_user for update;
  insert into public.platino_ledger (user_id, delta, reason, buckets, ref, source)
  values (p_user, p_amount, p_reason, jsonb_build_object(case p_bucket when 'bought' then 'bought' else 'gift' end, p_amount), p_ref, p_source)
  on conflict (ref) do nothing;
  if not found then return false; end if;
  if p_bucket = 'bought' then
    update public.profiles set platino_bought = platino_bought + p_amount where id = p_user;
  else
    update public.profiles set platino_gift = platino_gift + p_amount where id = p_user;
  end if;
  return true;
end;
$$;

-- Platino del periodo de suscripción: se FIJA (no se suma) en cada renovación, una vez por periodo.
create or replace function public.platino_set_sub(p_user uuid, p_amount integer, p_until timestamptz, p_ref text, p_source text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_ref is null then raise exception 'falta la referencia'; end if;
  perform 1 from public.profiles where id = p_user for update;
  insert into public.platino_ledger (user_id, delta, reason, buckets, ref, source)
  values (p_user, p_amount, 'subscription', jsonb_build_object('sub', p_amount, 'until', p_until), p_ref, p_source)
  on conflict (ref) do nothing;
  if not found then return false; end if;
  update public.profiles set platino_sub = p_amount, platino_sub_until = p_until where id = p_user;
  return true;
end;
$$;

-- Fin de la suscripción: el Platino del periodo se pierde (el comprado se queda).
create or replace function public.platino_end_sub(p_user uuid) returns void
language sql security definer set search_path = public as $$
  update public.profiles set platino_sub = 0, platino_sub_until = null where id = p_user;
$$;

-- La persona guarda su zona horaria (para la medianoche del diario). Solo zonas válidas.
create or replace function public.set_my_timezone(p_tz text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if not exists (select 1 from pg_timezone_names where name = p_tz) then return; end if;
  update public.profiles set timezone = p_tz where id = auth.uid();
end;
$$;

revoke execute on function public.platino_state(uuid), public.platino_spend(uuid, integer, text), public.platino_refund(bigint),
  public.platino_credit(uuid, text, integer, text, text, text), public.platino_set_sub(uuid, integer, timestamptz, text, text),
  public.platino_end_sub(uuid), public.platino_refresh_locked(uuid) from public, anon, authenticated;
grant execute on function public.platino_state(uuid), public.platino_spend(uuid, integer, text), public.platino_refund(bigint),
  public.platino_credit(uuid, text, integer, text, text, text), public.platino_set_sub(uuid, integer, timestamptz, text, text),
  public.platino_end_sub(uuid), public.platino_refresh_locked(uuid) to service_role;
revoke execute on function public.set_my_timezone(text) from public, anon;
grant execute on function public.set_my_timezone(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Invitados: 15 Platino de regalo, una sola vez (al crearse la sesión sin cuenta)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, platino_gift)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    case when coalesce(new.is_anonymous, false) then public.platino_guest_amount() else 0 end
  );
  if coalesce(new.is_anonymous, false) then
    insert into public.platino_ledger (user_id, delta, reason, buckets, ref, source)
    values (new.id, public.platino_guest_amount(), 'guest', jsonb_build_object('gift', public.platino_guest_amount()), 'guest:' || new.id, 'app');
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Cuentas que ya existían
-- -----------------------------------------------------------------------------
-- Invitados actuales: lo que les quede de 15 (ya usaron parte de su prueba de 10 mensajes)
update public.profiles p
   set platino_gift = greatest(0, public.platino_guest_amount() - p.free_messages_used)
  from auth.users u
 where u.id = p.id and coalesce(u.is_anonymous, false) and p.platino_gift = 0;
-- Pro actuales: su Platino del periodo en curso
update public.profiles
   set platino_sub = 1500, platino_sub_until = current_period_end
 where is_pro and current_period_end is not null and current_period_end > now() and platino_sub = 0;
