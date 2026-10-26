-- WP-11 (revisión): el diario solo se renueva cuando el día avanza (no al cambiar de zona
-- horaria hacia atrás y adelante) y una devolución no suma a una suscripción ya terminada.

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
  -- solo hacia delante: cambiar de zona horaria no vuelve a regalar el diario del mismo día
  if not guest and (p.platino_daily_on is null or today > p.platino_daily_on) then
    update public.profiles set platino_daily = public.platino_daily_amount(), platino_daily_on = today where id = p_user returning * into p;
  end if;
  if p.platino_sub > 0 and p.platino_sub_until is not null and p.platino_sub_until < now() then
    update public.profiles set platino_sub = 0 where id = p_user returning * into p;
  end if;
  return p;
end;
$$;

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
    if p.platino_sub_until is null or p.platino_sub_until < now() then s := 0; end if;
    update public.profiles
       set platino_daily = platino_daily + d, platino_sub = platino_sub + s,
           platino_gift = platino_gift + g, platino_bought = platino_bought + b
     where id = l.user_id returning * into p;
  end if;
  select coalesce(u.is_anonymous, false) into guest from auth.users u where u.id = l.user_id;
  return public.platino_json(p, guest);
end;
$$;
