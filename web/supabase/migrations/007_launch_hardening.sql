create table if not exists public.api_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists api_rate_limit_events_user_key_created_idx
  on public.api_rate_limit_events (user_id, key, created_at desc);

alter table public.api_rate_limit_events enable row level security;

drop policy if exists "user owns api rate limit events" on public.api_rate_limit_events;
create policy "user owns api rate limit events" on public.api_rate_limit_events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
