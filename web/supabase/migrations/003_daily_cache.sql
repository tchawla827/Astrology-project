create table public.daily_predictions_cache (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  date date not null,
  tone text not null check (tone in ('balanced', 'direct', 'brutal')),
  answer_schema_version text not null,
  payload jsonb not null,
  computed_at timestamptz not null default now(),
  unique (birth_profile_id, date, tone, answer_schema_version)
);

create table public.daily_transit_cache (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  lat_rounded numeric(6, 2) not null,
  lon_rounded numeric(6, 2) not null,
  timezone text not null,
  ayanamsha text not null default 'lahiri',
  payload jsonb not null,
  computed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (date, lat_rounded, lon_rounded, timezone, ayanamsha)
);

create index daily_predictions_cache_profile_date_idx
  on public.daily_predictions_cache (birth_profile_id, date);

create index daily_transit_cache_lookup_idx
  on public.daily_transit_cache (date, lat_rounded, lon_rounded, timezone, ayanamsha, expires_at);

alter table public.daily_predictions_cache enable row level security;
alter table public.daily_transit_cache enable row level security;

create policy "user owns daily prediction profile" on public.daily_predictions_cache for all
  using (exists (
    select 1 from public.birth_profiles bp
    where bp.id = daily_predictions_cache.birth_profile_id and bp.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.birth_profiles bp
    where bp.id = daily_predictions_cache.birth_profile_id and bp.user_id = auth.uid()
  ));

create policy "authenticated users read transit cache" on public.daily_transit_cache for select
  using (auth.role() = 'authenticated');

create policy "authenticated users write transit cache" on public.daily_transit_cache for insert
  with check (auth.role() = 'authenticated');

create policy "authenticated users update transit cache" on public.daily_transit_cache for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
