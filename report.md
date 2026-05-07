# Project Report — Gather

## Tools and techniques

- **TanStack Start v1** (React 19 + Vite 7) with file-based routing under `src/routes/`.
- **Tailwind v4** via `src/styles.css` with semantic tokens; "Ocean Deep" palette, Space Grotesk + DM Sans.
- **shadcn/ui** for primitives (button, dialog, table, tabs, etc.).
- **Lovable Cloud (Supabase)** for Postgres, Auth, Storage, RLS.
- **Postgres triggers + security-definer functions** for capacity/waitlist logic and role checks (avoids RLS recursion).
- **`qrcode.react`** for ticket QR rendering.
- **CSV export** built client-side from RSVP queries.
- **Storage bucket `event-photos`** with per-user folder upload policies.

## What worked

- **Database-driven RSVP status.** A `BEFORE INSERT` trigger compares confirmed count vs. capacity and assigns `confirmed` or `waitlist`. The same logic powers FIFO promotion when an attendee cancels or capacity is increased — clients never compute this.
- **`is_event_host()` / `can_manage_event()` security-definer helpers.** Cleanly separated host vs. checker permissions across `events`, `rsvps`, `event_photos`, `reports` without RLS recursion.
- **Auto profile creation.** `on_auth_user_created` trigger seeds a `profiles` row from signup metadata, so every user has a display name available to RLS and joins.
- **Flat route convention** (e.g. `events.$id.gallery.tsx`) made it cheap to add per-event sub-pages (edit, gallery, check-in) without touching a router config.
- **Seed migration with deterministic UUIDs** (`11111111-…`, `44444444-…`) made it easy to wire RSVPs, tickets, and check-ins to the right rows on every reset.
- **Storage path convention `userId/eventId/uuid.ext`** lined up perfectly with Storage RLS (`auth.uid()` matches the first folder), giving safe uploads with one policy.

## What did not work / had to be reworked

- **Initial attempt to put roles on the `profiles` table** was discarded immediately — moved to a dedicated `user_roles` / `host_members` table with a `has_role()` security-definer function to avoid privilege-escalation issues.
- **Early CHECK constraints with `now()`** (e.g. invite expiry) were rejected by Postgres because CHECK must be immutable. Replaced with validation triggers.
- **Attempted to filter hidden events purely in the UI**; switched to a server-side `is_hidden` filter in `explore` queries so the hidden state is enforced regardless of client.
- **First gallery upload flow** allowed any authenticated user to upload anywhere — tightened to require a confirmed RSVP and a path beginning with `auth.uid()`.

## Notable decisions

- **No anonymous sign-ups.** Standard email + password only; ticket codes are not enough to identify a user.
- **Single `reports` table** with a polymorphic `target_type` (`event` | `photo`) instead of one table per target — simpler review queue, single RLS policy set.
- **Hosts moderate their own content.** No global admin role. Reports route by event ownership via `can_manage_event()`.
- **Promotion is automatic, not opt-in.** When a confirmed RSVP cancels, the FIFO trigger immediately promotes the next waitlisted user and generates their ticket — no host action required.
- **Browser-only data calls** for v1. Server functions are reserved for later privileged operations (e.g. admin reports).
- **Ticket codes are 8-char hex** generated server-side with a unique constraint — short enough to type at a door, long enough to avoid collisions at this scale.

## Known limitations

- **Manual code-entry check-in only.** No camera-based QR scanner yet.
- **No email notifications** for RSVP confirmation, waitlist promotion, or event reminders.
- **Cover images are URL-only**; no upload pipeline for event covers (gallery has its own storage bucket).
- **Feedback aggregation is computed client-side** on the event page — fine at MVP scale, will need a view or materialized view later.
- **No pagination** on Explore, Dashboard, or Reports — assumes small lists.
- **No soft-delete / audit log** on events or RSVPs.
- **Reports moderation is binary** (hide / dismiss). No appeals, no reporter notifications.
- **Timezone handling** stores UTC and renders in the browser locale; no per-event timezone field.
