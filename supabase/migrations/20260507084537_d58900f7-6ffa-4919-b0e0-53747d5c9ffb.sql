
create type public.host_member_role as enum ('host','checker');

create table public.host_members (
  id uuid primary key default gen_random_uuid(),
  host_owner_id uuid not null,
  member_user_id uuid not null,
  role public.host_member_role not null,
  created_at timestamptz not null default now(),
  unique(host_owner_id, member_user_id)
);
alter table public.host_members enable row level security;

create table public.host_invites (
  id uuid primary key default gen_random_uuid(),
  host_owner_id uuid not null,
  role public.host_member_role not null,
  token text not null unique default encode(gen_random_bytes(16),'hex'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid,
  created_at timestamptz not null default now()
);
alter table public.host_invites enable row level security;

create or replace function public.can_manage_event(_event_id uuid, _user uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.events e
    where e.id=_event_id and (
      e.host_id=_user or exists(
        select 1 from public.host_members m
        where m.host_owner_id=e.host_id and m.member_user_id=_user and m.role='host'
      )
    )
  )
$$;

create or replace function public.can_checkin_event(_event_id uuid, _user uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.events e
    where e.id=_event_id and (
      e.host_id=_user or exists(
        select 1 from public.host_members m
        where m.host_owner_id=e.host_id and m.member_user_id=_user
      )
    )
  )
$$;

create policy "owner manages members" on public.host_members for all
  using (auth.uid()=host_owner_id) with check (auth.uid()=host_owner_id);
create policy "members can view their membership" on public.host_members for select
  using (auth.uid()=member_user_id);

create policy "owner manages invites" on public.host_invites for all
  using (auth.uid()=host_owner_id) with check (auth.uid()=host_owner_id);

drop policy if exists "hosts can update their events" on public.events;
create policy "hosts can update their events" on public.events for update
  using (public.can_manage_event(id, auth.uid()));

drop policy if exists "hosts can delete their events" on public.events;
create policy "hosts can delete their events" on public.events for delete
  using (auth.uid() = host_id);

drop policy if exists "hosts can view rsvps for their events" on public.rsvps;
create policy "hosts can view rsvps for their events" on public.rsvps for select
  using (public.can_checkin_event(event_id, auth.uid()));

drop policy if exists "hosts can update rsvps for their events" on public.rsvps;
create policy "hosts can update rsvps for their events" on public.rsvps for update
  using (public.can_checkin_event(event_id, auth.uid()));

create or replace function public.accept_host_invite(_token text)
returns table(host_owner_id uuid, role public.host_member_role)
language plpgsql security definer set search_path=public as $$
declare inv public.host_invites%rowtype;
begin
  select * into inv from public.host_invites where token=_token;
  if not found then raise exception 'Invalid invite'; end if;
  if inv.used_at is not null then raise exception 'Invite already used'; end if;
  if inv.expires_at < now() then raise exception 'Invite expired'; end if;
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if inv.host_owner_id = auth.uid() then raise exception 'Cannot accept your own invite'; end if;
  insert into public.host_members(host_owner_id, member_user_id, role)
    values (inv.host_owner_id, auth.uid(), inv.role)
    on conflict (host_owner_id, member_user_id) do update set role=excluded.role;
  update public.host_invites set used_at=now(), used_by=auth.uid() where id=inv.id;
  return query select inv.host_owner_id, inv.role;
end$$;

revoke execute on function public.accept_host_invite(text) from public, anon;
grant execute on function public.accept_host_invite(text) to authenticated;

create or replace function public.get_invite(_token text)
returns table(host_owner_id uuid, role public.host_member_role, expires_at timestamptz, used_at timestamptz, host_name text)
language sql stable security definer set search_path=public as $$
  select i.host_owner_id, i.role, i.expires_at, i.used_at, p.display_name
  from public.host_invites i left join public.profiles p on p.id=i.host_owner_id
  where i.token=_token
$$;
revoke execute on function public.get_invite(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;
