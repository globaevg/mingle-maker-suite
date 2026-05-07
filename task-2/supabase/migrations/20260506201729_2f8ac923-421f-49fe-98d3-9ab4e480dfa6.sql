
-- profiles table (host & user info)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Member',
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- events table
create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  location text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 50 check (capacity > 0),
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.events enable row level security;

create policy "events are viewable by everyone"
  on public.events for select using (true);
create policy "authenticated users can create events"
  on public.events for insert with check (auth.uid() = host_id);
create policy "hosts can update their events"
  on public.events for update using (auth.uid() = host_id);
create policy "hosts can delete their events"
  on public.events for delete using (auth.uid() = host_id);

create index events_starts_at_idx on public.events (starts_at);

-- rsvps
create type public.rsvp_status as enum ('confirmed', 'waitlist', 'cancelled');

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.rsvp_status not null default 'confirmed',
  ticket_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
alter table public.rsvps enable row level security;

-- helper: is user the host of this event?
create or replace function public.is_event_host(_event_id uuid, _user_id uuid)
returns boolean
language sql
stable security definer set search_path = public
as $$
  select exists (select 1 from public.events where id = _event_id and host_id = _user_id);
$$;

create policy "users can view their own rsvps"
  on public.rsvps for select using (auth.uid() = user_id);
create policy "hosts can view rsvps for their events"
  on public.rsvps for select using (public.is_event_host(event_id, auth.uid()));
create policy "users can rsvp themselves"
  on public.rsvps for insert with check (auth.uid() = user_id);
create policy "users can cancel their own rsvps"
  on public.rsvps for update using (auth.uid() = user_id);
create policy "hosts can update rsvps for their events"
  on public.rsvps for update using (public.is_event_host(event_id, auth.uid()));

-- auto-assign confirmed/waitlist based on capacity
create or replace function public.assign_rsvp_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cap integer;
  taken integer;
begin
  select capacity into cap from public.events where id = new.event_id;
  select count(*) into taken from public.rsvps
    where event_id = new.event_id and status = 'confirmed';
  if taken >= cap then
    new.status := 'waitlist';
  else
    new.status := 'confirmed';
  end if;
  return new;
end;
$$;

create trigger rsvps_assign_status
  before insert on public.rsvps
  for each row execute function public.assign_rsvp_status();
