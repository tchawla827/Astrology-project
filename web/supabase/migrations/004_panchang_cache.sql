create table public.panchang_cache (
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

create index panchang_cache_lookup_idx
  on public.panchang_cache (date, lat_rounded, lon_rounded, timezone, ayanamsha, expires_at);

alter table public.panchang_cache enable row level security;

create policy "authenticated users read panchang cache" on public.panchang_cache for select
  using (auth.role() = 'authenticated');

create policy "authenticated users write panchang cache" on public.panchang_cache for insert
  with check (auth.role() = 'authenticated');

create policy "authenticated users update panchang cache" on public.panchang_cache for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
