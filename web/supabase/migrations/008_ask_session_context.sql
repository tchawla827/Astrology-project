alter table public.ask_sessions
  add column if not exists context_kind text not null default 'natal'
    check (context_kind in ('natal', 'daily')),
  add column if not exists context_date date;

alter table public.ask_sessions
  drop constraint if exists ask_sessions_context_date_required;

alter table public.ask_sessions
  add constraint ask_sessions_context_date_required
    check (
      (context_kind = 'natal' and context_date is null)
      or (context_kind = 'daily' and context_date is not null)
    );

create index if not exists ask_sessions_context_idx
  on public.ask_sessions (birth_profile_id, context_kind, context_date, created_at desc);
