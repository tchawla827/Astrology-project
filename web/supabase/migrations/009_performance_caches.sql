create index if not exists birth_profiles_user_created_idx
  on public.birth_profiles (user_id, created_at desc);

create index if not exists chart_snapshots_profile_computed_idx
  on public.chart_snapshots (birth_profile_id, computed_at desc);

create index if not exists derived_feature_snapshots_profile_computed_idx
  on public.derived_feature_snapshots (birth_profile_id, computed_at desc);

create index if not exists ask_sessions_profile_created_idx
  on public.ask_sessions (birth_profile_id, created_at desc);

create index if not exists ask_messages_session_created_idx
  on public.ask_messages (ask_session_id, created_at);

create index if not exists analytics_events_user_occurred_idx
  on public.analytics_events (user_id, occurred_at desc);

create table if not exists public.timeline_year_cache (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  year integer not null check (year >= 1900 and year <= 2200),
  chart_snapshot_id uuid not null references public.chart_snapshots(id) on delete cascade,
  engine_version text not null,
  ayanamsha text not null,
  timezone text not null,
  lat_rounded numeric(6, 2) not null,
  lon_rounded numeric(6, 2) not null,
  payload jsonb not null,
  computed_at timestamptz not null default now(),
  unique (birth_profile_id, year, chart_snapshot_id, engine_version, ayanamsha, timezone, lat_rounded, lon_rounded)
);

create index if not exists timeline_year_cache_lookup_idx
  on public.timeline_year_cache (
    birth_profile_id,
    year,
    chart_snapshot_id,
    engine_version,
    ayanamsha,
    timezone,
    lat_rounded,
    lon_rounded,
    computed_at desc
  );

alter table public.timeline_year_cache enable row level security;

drop policy if exists "user owns timeline cache profile" on public.timeline_year_cache;
create policy "user owns timeline cache profile" on public.timeline_year_cache for all
  using (exists (
    select 1 from public.birth_profiles bp
    where bp.id = timeline_year_cache.birth_profile_id and bp.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.birth_profiles bp
    where bp.id = timeline_year_cache.birth_profile_id and bp.user_id = auth.uid()
  ));

alter table public.daily_predictions_cache
  add column if not exists render_payload jsonb;
