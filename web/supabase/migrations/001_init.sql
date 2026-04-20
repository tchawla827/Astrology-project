create extension if not exists pgcrypto;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  default_tone_mode text not null default 'direct' check (default_tone_mode in ('balanced', 'direct', 'brutal')),
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'premium')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table public.birth_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  name text not null,
  birth_date date not null,
  birth_time time not null,
  birth_time_confidence text not null check (birth_time_confidence in ('exact', 'approximate', 'unknown')),
  birth_place_text text not null,
  latitude double precision not null,
  longitude double precision not null,
  timezone text not null,
  ayanamsha text not null default 'lahiri' check (ayanamsha in ('lahiri', 'raman', 'kp')),
  engine_version text not null,
  status text not null default 'processing' check (status in ('processing', 'ready', 'error')),
  created_at timestamptz not null default now()
);

create table public.chart_snapshots (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  engine_version text not null,
  computed_at timestamptz not null default now(),
  payload jsonb not null
);

create table public.derived_feature_snapshots (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  chart_snapshot_id uuid not null references public.chart_snapshots(id) on delete cascade,
  schema_version text not null,
  payload jsonb not null,
  computed_at timestamptz not null default now()
);

create table public.ask_sessions (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  topic text not null,
  tone_mode text not null check (tone_mode in ('balanced', 'direct', 'brutal')),
  created_at timestamptz not null default now()
);

create table public.ask_messages (
  id uuid primary key default gen_random_uuid(),
  ask_session_id uuid not null references public.ask_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text,
  content_structured jsonb,
  llm_metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  kind text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigserial primary key,
  user_id uuid references public.user_profiles(id) on delete set null,
  event_name text not null,
  properties jsonb,
  occurred_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.user_profiles enable row level security;
alter table public.birth_profiles enable row level security;
alter table public.chart_snapshots enable row level security;
alter table public.derived_feature_snapshots enable row level security;
alter table public.ask_sessions enable row level security;
alter table public.ask_messages enable row level security;
alter table public.exports enable row level security;
alter table public.analytics_events enable row level security;

create policy "user owns profile" on public.user_profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

create policy "user owns row" on public.birth_profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "user owns chart profile" on public.chart_snapshots for all
  using (exists (
    select 1 from public.birth_profiles bp
    where bp.id = chart_snapshots.birth_profile_id and bp.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.birth_profiles bp
    where bp.id = chart_snapshots.birth_profile_id and bp.user_id = auth.uid()
  ));

create policy "user owns derived profile" on public.derived_feature_snapshots for all
  using (exists (
    select 1 from public.birth_profiles bp
    where bp.id = derived_feature_snapshots.birth_profile_id and bp.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.birth_profiles bp
    where bp.id = derived_feature_snapshots.birth_profile_id and bp.user_id = auth.uid()
  ));

create policy "user owns ask session profile" on public.ask_sessions for all
  using (exists (
    select 1 from public.birth_profiles bp
    where bp.id = ask_sessions.birth_profile_id and bp.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.birth_profiles bp
    where bp.id = ask_sessions.birth_profile_id and bp.user_id = auth.uid()
  ));

create policy "user owns ask message session" on public.ask_messages for all
  using (exists (
    select 1
    from public.ask_sessions s
    join public.birth_profiles bp on bp.id = s.birth_profile_id
    where s.id = ask_messages.ask_session_id and bp.user_id = auth.uid()
  )) with check (exists (
    select 1
    from public.ask_sessions s
    join public.birth_profiles bp on bp.id = s.birth_profile_id
    where s.id = ask_messages.ask_session_id and bp.user_id = auth.uid()
  ));

create policy "user owns export profile" on public.exports for all
  using (exists (
    select 1 from public.birth_profiles bp
    where bp.id = exports.birth_profile_id and bp.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.birth_profiles bp
    where bp.id = exports.birth_profile_id and bp.user_id = auth.uid()
  ));

create policy "user owns analytics event" on public.analytics_events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
