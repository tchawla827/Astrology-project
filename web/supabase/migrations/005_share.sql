create table public.share_tokens (
  id uuid primary key default gen_random_uuid(),
  ask_message_id uuid not null references public.ask_messages(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references public.user_profiles(id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index share_tokens_ask_message_id_idx on public.share_tokens (ask_message_id);
create index share_tokens_created_by_idx on public.share_tokens (created_by);
create index share_tokens_active_token_idx on public.share_tokens (token)
  where revoked_at is null;

alter table public.share_tokens enable row level security;

create policy "user owns share tokens" on public.share_tokens for all
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create or replace function public.get_shared_ask_answer(input_token text)
returns table (
  token text,
  ask_message_id uuid,
  topic text,
  tone_mode text,
  answer jsonb,
  charts_used text[],
  created_at timestamptz
) as $$
begin
  return query
  select
    st.token,
    m.id as ask_message_id,
    s.topic,
    s.tone_mode,
    jsonb_build_object(
      'verdict', m.content_structured -> 'verdict',
      'why', m.content_structured -> 'why',
      'timing', m.content_structured -> 'timing',
      'confidence', m.content_structured -> 'confidence'
    ) as answer,
    coalesce(
      array(
        select jsonb_array_elements_text(m.content_structured #> '{technical_basis,charts_used}')
      ),
      array[]::text[]
    ) as charts_used,
    st.created_at
  from public.share_tokens st
  join public.ask_messages m on m.id = st.ask_message_id
  join public.ask_sessions s on s.id = m.ask_session_id
  where st.token = input_token
    and st.revoked_at is null
    and (st.expires_at is null or st.expires_at > now())
    and m.role = 'assistant'
  limit 1;
end;
$$ language plpgsql stable security definer set search_path = public;

grant execute on function public.get_shared_ask_answer(text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('share-cards', 'share-cards', true)
on conflict (id) do update set public = excluded.public;

create policy "public reads share cards" on storage.objects for select
  using (bucket_id = 'share-cards');

create policy "owners insert share cards" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'share-cards'
    and exists (
      select 1
      from public.share_tokens st
      where st.token = regexp_replace(name, '\.png$', '')
        and st.created_by = auth.uid()
        and st.revoked_at is null
        and (st.expires_at is null or st.expires_at > now())
    )
  );

create policy "owners update share cards" on storage.objects for update to authenticated
  using (
    bucket_id = 'share-cards'
    and exists (
      select 1
      from public.share_tokens st
      where st.token = regexp_replace(name, '\.png$', '')
        and st.created_by = auth.uid()
    )
  )
  with check (
    bucket_id = 'share-cards'
    and exists (
      select 1
      from public.share_tokens st
      where st.token = regexp_replace(name, '\.png$', '')
        and st.created_by = auth.uid()
        and st.revoked_at is null
        and (st.expires_at is null or st.expires_at > now())
    )
  );
