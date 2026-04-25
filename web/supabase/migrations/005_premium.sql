alter table public.user_profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_current_period_end timestamptz;

create table if not exists public.ask_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  ask_message_id uuid references public.ask_messages(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ask_usage_user_created_idx on public.ask_usage (user_id, created_at desc);

alter table public.ask_usage enable row level security;

drop policy if exists "user owns ask usage" on public.ask_usage;
create policy "user owns ask usage" on public.ask_usage for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "owners read exports" on storage.objects;
create policy "owners read exports" on storage.objects for select to authenticated
  using (
    bucket_id = 'exports'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "owners insert exports" on storage.objects;
create policy "owners insert exports" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exports'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "owners delete exports" on storage.objects;
create policy "owners delete exports" on storage.objects for delete to authenticated
  using (
    bucket_id = 'exports'
    and split_part(name, '/', 1) = auth.uid()::text
  );
