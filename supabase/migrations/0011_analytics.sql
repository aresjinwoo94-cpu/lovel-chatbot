-- Analítica propia (panel privado /admin). Sin IPs ni datos personales: un identificador
-- aleatorio por dispositivo, el país aproximado (zona horaria del dispositivo) y lo que se hace
-- en la app. Solo el servidor (service_role) lee y escribe: RLS activo y sin políticas.

create table if not exists public.analytics_sessions (
  id text primary key check (char_length(id) between 8 and 64),
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  user_id uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  country text,
  timezone text,
  language text,
  platform text,          -- web · ios · android
  device text,            -- mobile · desktop · tablet (web) o el modelo en móvil
  referrer text,          -- dominio de procedencia (web)
  utm_source text,
  utm_medium text,
  utm_campaign text,
  entry_route text,
  screens integer not null default 0
);
create index if not exists analytics_sessions_started_idx on public.analytics_sessions (started_at desc);
create index if not exists analytics_sessions_visitor_idx on public.analytics_sessions (visitor_id);

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text not null references public.analytics_sessions (id) on delete cascade,
  visitor_id text not null,
  name text not null check (name ~ '^[a-z_]{2,40}$'),
  route text,
  props jsonb not null default '{}'::jsonb
);
create index if not exists analytics_events_name_idx on public.analytics_events (name, created_at desc);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id);

alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;
revoke all on public.analytics_sessions, public.analytics_events from anon, authenticated;

-- Resumen para el panel: todo en una llamada (lo usa la función admin-stats).
create or replace function public.analytics_summary(p_days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select * from analytics_sessions where started_at >= now() - make_interval(days => p_days)
  ),
  e as (
    select * from analytics_events where created_at >= now() - make_interval(days => p_days)
  ),
  first_visit as (
    select visitor_id, min(started_at) as first_at from analytics_sessions group by visitor_id
  ),
  funnel_steps(step, ord) as (
    values ('visit', 1), ('age_confirmed', 2), ('welcome_started', 3), ('character_created', 4),
           ('message_sent', 5), ('account_created', 6), ('paywall_shown', 7), ('checkout_started', 8),
           ('checkout_completed', 9)
  )
  select jsonb_build_object(
    'days', p_days,
    'generated_at', now(),
    'totals', (
      select jsonb_build_object(
        'visitors', count(distinct s.visitor_id),
        'new_visitors', count(distinct s.visitor_id) filter (where fv.first_at >= now() - make_interval(days => p_days)),
        'sessions', count(*),
        'signed_in_sessions', count(*) filter (where s.user_id is not null),
        'avg_seconds', coalesce(round(avg(extract(epoch from s.last_seen_at - s.started_at)))::int, 0),
        'median_seconds', coalesce(round(percentile_cont(0.5) within group (order by extract(epoch from s.last_seen_at - s.started_at)))::int, 0),
        'bounce_rate', coalesce(round(100.0 * count(*) filter (where s.screens <= 1) / nullif(count(*), 0))::int, 0),
        'online_now', count(distinct s.visitor_id) filter (where s.last_seen_at >= now() - interval '2 minutes')
      )
      from s left join first_visit fv using (visitor_id)
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'visitors', d.visitors, 'sessions', d.sessions) order by d.day)
      from (
        select date_trunc('day', started_at)::date as day, count(distinct visitor_id) as visitors, count(*) as sessions
        from s group by 1
      ) d
    ), '[]'::jsonb),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object('country', c.country, 'visitors', c.visitors) order by c.visitors desc)
      from (select coalesce(country, '??') as country, count(distinct visitor_id) as visitors from s group by 1 order by 2 desc limit 20) c
    ), '[]'::jsonb),
    'platforms', coalesce((
      select jsonb_agg(jsonb_build_object('platform', p.platform, 'device', p.device, 'sessions', p.sessions) order by p.sessions desc)
      from (select coalesce(platform, '?') as platform, coalesce(device, '?') as device, count(*) as sessions from s group by 1, 2) p
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('source', r.source, 'sessions', r.sessions) order by r.sessions desc)
      from (select coalesce(utm_source, referrer, 'directo') as source, count(*) as sessions from s group by 1 order by 2 desc limit 15) r
    ), '[]'::jsonb),
    'screens', coalesce((
      select jsonb_agg(jsonb_build_object('route', x.route, 'views', x.views, 'visitors', x.visitors) order by x.views desc)
      from (select route, count(*) as views, count(distinct visitor_id) as visitors from e where name = 'screen_view' group by 1 order by 2 desc limit 15) x
    ), '[]'::jsonb),
    'funnel', (
      select jsonb_agg(jsonb_build_object('step', f.step, 'visitors', f.visitors) order by f.ord)
      from (
        select fs.step, fs.ord,
          case when fs.step = 'visit' then (select count(distinct visitor_id) from s)
               else (select count(distinct visitor_id) from e where e.name = fs.step) end as visitors
        from funnel_steps fs
      ) f
    ),
    'recent', coalesce((
      select jsonb_agg(row_to_json(r)) from (
        select s.started_at, s.country, s.platform, s.device, s.entry_route, s.screens,
               extract(epoch from s.last_seen_at - s.started_at)::int as seconds,
               s.user_id is not null as signed_in,
               coalesce(s.utm_source, s.referrer) as source,
               (select array_agg(distinct ev.name) from analytics_events ev where ev.session_id = s.id and ev.name <> 'screen_view') as events
        from s order by s.started_at desc limit 30
      ) r
    ), '[]'::jsonb),
    'pro', (select jsonb_build_object('active', count(*) filter (where is_pro), 'accounts', count(*)) from profiles)
  );
$$;

revoke all on function public.analytics_summary(integer) from public, anon, authenticated;
grant execute on function public.analytics_summary(integer) to service_role;
