-- Helper: true if _user is the host owner or a host-role team member of _owner
create or replace function public.is_team_host(_owner uuid, _user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _user is not null and (
    _owner = _user
    or exists (
      select 1 from public.host_members
      where host_owner_id = _owner
        and member_user_id = _user
        and role = 'host'
    )
  );
$$;

revoke execute on function public.is_team_host(uuid, uuid) from public, anon;
grant execute on function public.is_team_host(uuid, uuid) to authenticated;

-- Replace events INSERT policy: allow owner OR team co-host
drop policy if exists "authenticated users can create events" on public.events;

create policy "hosts and team co-hosts can create events"
on public.events
for insert
to authenticated
with check (public.is_team_host(host_id, auth.uid()));
