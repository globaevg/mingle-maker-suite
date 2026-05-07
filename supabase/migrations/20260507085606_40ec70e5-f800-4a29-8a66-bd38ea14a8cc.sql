
-- Feedback
create table public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  user_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);
alter table public.event_feedback enable row level security;

create or replace function public.has_confirmed_rsvp(_event uuid, _user uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.rsvps where event_id=_event and user_id=_user and status='confirmed')
$$;

create policy "attendees submit feedback after event ends" on public.event_feedback
for insert with check (
  auth.uid()=user_id
  and public.has_confirmed_rsvp(event_id, auth.uid())
  and exists(select 1 from public.events e where e.id=event_id and e.ends_at < now())
);
create policy "author views own feedback" on public.event_feedback
for select using (auth.uid()=user_id);
create policy "host views feedback" on public.event_feedback
for select using (public.can_manage_event(event_id, auth.uid()));
create policy "everyone views feedback" on public.event_feedback
for select using (true);

-- Photos
create type public.photo_status as enum ('pending','approved','rejected');

create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  user_id uuid not null,
  storage_path text not null,
  status public.photo_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.event_photos enable row level security;

create policy "attendees upload photos" on public.event_photos
for insert with check (
  auth.uid()=user_id and public.has_confirmed_rsvp(event_id, auth.uid())
);
create policy "everyone views approved photos" on public.event_photos
for select using (status='approved');
create policy "uploader views own photos" on public.event_photos
for select using (auth.uid()=user_id);
create policy "host views all photos" on public.event_photos
for select using (public.can_manage_event(event_id, auth.uid()));
create policy "host moderates photos" on public.event_photos
for update using (public.can_manage_event(event_id, auth.uid()));
create policy "host deletes photos" on public.event_photos
for delete using (public.can_manage_event(event_id, auth.uid()));
create policy "uploader deletes own pending" on public.event_photos
for delete using (auth.uid()=user_id and status='pending');

-- Storage bucket
insert into storage.buckets (id, name, public) values ('event-photos','event-photos', true);

create policy "public read event photos" on storage.objects
for select using (bucket_id='event-photos');
create policy "auth users upload event photos" on storage.objects
for insert with check (bucket_id='event-photos' and auth.uid() is not null and (storage.foldername(name))[1]=auth.uid()::text);
create policy "users delete own uploads" on storage.objects
for delete using (bucket_id='event-photos' and auth.uid()::text=(storage.foldername(name))[1]);
