# Gather — Free Community Events

A lightweight, free event-hosting and attendance platform. Anyone can browse public events, RSVP for free, get a QR-coded ticket, and hosts can check attendees in by ticket code.

## Features (v1 core)
- **Auth** — email + password (powered by Lovable Cloud).
- **Public browsing** — anyone can see upcoming events without signing in.
- **Host profiles** — display name and bio shown on every event.
- **RSVP** — one-tap RSVP with automatic waitlist when an event is full.
- **QR tickets** — every confirmed (or waitlisted) RSVP gets a unique ticket code rendered as a QR.
- **Manual check-in** — hosts type a ticket code into the dashboard to mark a guest as checked in.
- **Host dashboard** — manage events, see RSVPs, check guests in, export attendees as CSV.
- **CSV export** — one-click attendee export per event.
- **Row-level security** — strict RLS so hosts only see their own event data and users only see their own RSVPs.

## Tech
- TanStack Start (React 19) + Vite 7
- Tailwind v4 design system, "Ocean Deep" palette, Space Grotesk + DM Sans
- Lovable Cloud (Supabase): auth, Postgres, RLS

## Data model
- `profiles(id, display_name, bio, avatar_url)` — auto-created via trigger on signup.
- `events(id, host_id, title, description, location, starts_at, ends_at, capacity, cover_url)`
- `rsvps(id, event_id, user_id, status, ticket_code, checked_in_at)` — `status` is auto-assigned to `confirmed` until capacity is reached, then `waitlist`.

## Roadmap (v2)
- Photo gallery with host approval
- Post-event feedback & ratings
- Reports / analytics dashboard
- Per-event email reminders
- Cover image storage (Lovable Cloud Storage)

## Local dev
The project runs in the Lovable preview automatically. Push changes via Lovable to deploy.
