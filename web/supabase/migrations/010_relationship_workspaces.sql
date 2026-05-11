create table if not exists public.relationship_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  requester_user_id uuid not null references public.user_profiles(id) on delete cascade,
  requester_birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  requester_label text not null,
  recipient_label text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'revoked')),
  recipient_user_id uuid references public.user_profiles(id) on delete set null,
  recipient_birth_profile_id uuid references public.birth_profiles(id) on delete set null,
  relationship_id uuid,
  expires_at timestamptz not null default (now() + interval '14 days'),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_by uuid not null references public.user_profiles(id) on delete cascade,
  revoked_by uuid references public.user_profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.relationship_invites
  drop constraint if exists relationship_invites_relationship_id_fkey;

alter table public.relationship_invites
  add constraint relationship_invites_relationship_id_fkey
  foreign key (relationship_id) references public.relationships(id) on delete set null;

create table if not exists public.relationship_participants (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  label_for_other text not null,
  created_at timestamptz not null default now(),
  unique (relationship_id, user_id)
);

create table if not exists public.relationship_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references public.user_profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_user_id, blocked_user_id)
);

create table if not exists public.relationship_insight_snapshots (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  schema_version text not null,
  engine_version text not null,
  profile_a_id uuid not null references public.birth_profiles(id) on delete cascade,
  profile_b_id uuid not null references public.birth_profiles(id) on delete cascade,
  chart_snapshot_a_id uuid not null references public.chart_snapshots(id) on delete cascade,
  chart_snapshot_b_id uuid not null references public.chart_snapshots(id) on delete cascade,
  payload jsonb not null,
  computed_at timestamptz not null default now()
);

create table if not exists public.relationship_ask_sessions (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  created_by uuid not null references public.user_profiles(id) on delete cascade,
  tone_mode text not null check (tone_mode in ('balanced', 'direct', 'brutal')),
  depth text not null default 'simple' check (depth in ('simple', 'technical')),
  context_kind text not null default 'natal' check (context_kind in ('natal', 'daily')),
  context_date date,
  created_at timestamptz not null default now(),
  check (
    (context_kind = 'natal' and context_date is null)
    or (context_kind = 'daily' and context_date is not null)
  )
);

create table if not exists public.relationship_ask_messages (
  id uuid primary key default gen_random_uuid(),
  relationship_ask_session_id uuid not null references public.relationship_ask_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text,
  content_structured jsonb,
  llm_metadata jsonb,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.relationship_share_tokens (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  relationship_ask_message_id uuid references public.relationship_ask_messages(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references public.user_profiles(id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (relationship_ask_message_id is not null)
);

create index if not exists relationship_invites_requester_idx
  on public.relationship_invites (requester_user_id, created_at desc);
create index if not exists relationship_invites_token_idx
  on public.relationship_invites (token) where status = 'pending';
create index if not exists relationship_participants_user_idx
  on public.relationship_participants (user_id, created_at desc);
create index if not exists relationship_participants_relationship_idx
  on public.relationship_participants (relationship_id);
create index if not exists relationship_insights_relationship_idx
  on public.relationship_insight_snapshots (relationship_id, computed_at desc);
create index if not exists relationship_ask_sessions_relationship_idx
  on public.relationship_ask_sessions (relationship_id, created_at desc);
create index if not exists relationship_ask_messages_session_idx
  on public.relationship_ask_messages (relationship_ask_session_id, created_at);

alter table public.relationship_invites enable row level security;
alter table public.relationships enable row level security;
alter table public.relationship_participants enable row level security;
alter table public.relationship_blocks enable row level security;
alter table public.relationship_insight_snapshots enable row level security;
alter table public.relationship_ask_sessions enable row level security;
alter table public.relationship_ask_messages enable row level security;
alter table public.relationship_share_tokens enable row level security;

drop policy if exists "relationship invite participants read" on public.relationship_invites;
create policy "relationship invite participants read" on public.relationship_invites for select
  using (
    requester_user_id = auth.uid()
    or recipient_user_id = auth.uid()
    or (status = 'pending' and expires_at > now())
  );

drop policy if exists "relationship invite requester inserts" on public.relationship_invites;
create policy "relationship invite requester inserts" on public.relationship_invites for insert
  with check (requester_user_id = auth.uid());

drop policy if exists "relationship invite requester updates" on public.relationship_invites;
create policy "relationship invite requester updates" on public.relationship_invites for update
  using (requester_user_id = auth.uid())
  with check (requester_user_id = auth.uid());

drop policy if exists "relationship members read" on public.relationships;
create policy "relationship members read" on public.relationships for select
  using (exists (
    select 1 from public.relationship_participants rp
    where rp.relationship_id = relationships.id and rp.user_id = auth.uid()
  ));

drop policy if exists "relationship participants read own" on public.relationship_participants;
create policy "relationship participants read own" on public.relationship_participants for select
  using (exists (
    select 1 from public.relationship_participants member
    where member.relationship_id = relationship_participants.relationship_id and member.user_id = auth.uid()
  ));

drop policy if exists "relationship blocks owner" on public.relationship_blocks;
create policy "relationship blocks owner" on public.relationship_blocks for all
  using (blocker_user_id = auth.uid()) with check (blocker_user_id = auth.uid());

drop policy if exists "relationship insights members read" on public.relationship_insight_snapshots;
create policy "relationship insights members read" on public.relationship_insight_snapshots for select
  using (exists (
    select 1 from public.relationship_participants rp
    join public.relationships r on r.id = rp.relationship_id
    where rp.relationship_id = relationship_insight_snapshots.relationship_id
      and rp.user_id = auth.uid()
      and r.status = 'active'
  ));

drop policy if exists "relationship ask sessions members read" on public.relationship_ask_sessions;
create policy "relationship ask sessions members read" on public.relationship_ask_sessions for select
  using (exists (
    select 1 from public.relationship_participants rp
    join public.relationships r on r.id = rp.relationship_id
    where rp.relationship_id = relationship_ask_sessions.relationship_id
      and rp.user_id = auth.uid()
      and r.status = 'active'
  ));

drop policy if exists "relationship ask messages members read" on public.relationship_ask_messages;
create policy "relationship ask messages members read" on public.relationship_ask_messages for select
  using (exists (
    select 1
    from public.relationship_ask_sessions s
    join public.relationship_participants rp on rp.relationship_id = s.relationship_id
    join public.relationships r on r.id = s.relationship_id
    where s.id = relationship_ask_messages.relationship_ask_session_id
      and rp.user_id = auth.uid()
      and r.status = 'active'
  ));

drop policy if exists "relationship share tokens members read" on public.relationship_share_tokens;
create policy "relationship share tokens members read" on public.relationship_share_tokens for select
  using (exists (
    select 1 from public.relationship_participants rp
    join public.relationships r on r.id = rp.relationship_id
    where rp.relationship_id = relationship_share_tokens.relationship_id
      and rp.user_id = auth.uid()
      and r.status = 'active'
  ));
