create or replace function public.is_relationship_member(check_relationship_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.relationship_participants rp
    where rp.relationship_id = check_relationship_id
      and rp.user_id = auth.uid()
  );
$$;

revoke all on function public.is_relationship_member(uuid) from public;
grant execute on function public.is_relationship_member(uuid) to authenticated;

drop policy if exists "relationship members read" on public.relationships;
create policy "relationship members read" on public.relationships for select
  using (public.is_relationship_member(id));

drop policy if exists "relationship participants read own" on public.relationship_participants;
create policy "relationship participants read own" on public.relationship_participants for select
  using (public.is_relationship_member(relationship_id));

drop policy if exists "relationship insights members read" on public.relationship_insight_snapshots;
create policy "relationship insights members read" on public.relationship_insight_snapshots for select
  using (
    public.is_relationship_member(relationship_id)
    and exists (
      select 1
      from public.relationships r
      where r.id = relationship_insight_snapshots.relationship_id
        and r.status = 'active'
    )
  );

drop policy if exists "relationship ask sessions members read" on public.relationship_ask_sessions;
create policy "relationship ask sessions members read" on public.relationship_ask_sessions for select
  using (
    public.is_relationship_member(relationship_id)
    and exists (
      select 1
      from public.relationships r
      where r.id = relationship_ask_sessions.relationship_id
        and r.status = 'active'
    )
  );

drop policy if exists "relationship ask messages members read" on public.relationship_ask_messages;
create policy "relationship ask messages members read" on public.relationship_ask_messages for select
  using (exists (
    select 1
    from public.relationship_ask_sessions s
    join public.relationships r on r.id = s.relationship_id
    where s.id = relationship_ask_messages.relationship_ask_session_id
      and public.is_relationship_member(s.relationship_id)
      and r.status = 'active'
  ));

drop policy if exists "relationship share tokens members read" on public.relationship_share_tokens;
create policy "relationship share tokens members read" on public.relationship_share_tokens for select
  using (
    public.is_relationship_member(relationship_id)
    and exists (
      select 1
      from public.relationships r
      where r.id = relationship_share_tokens.relationship_id
        and r.status = 'active'
    )
  );

notify pgrst, 'reload schema';
