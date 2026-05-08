# Gather — Compliance Checklist

Status legend: ✅ done · ⚠️ partial · ❌ missing

## A) Publishing / hosting
- [x] ✅ Host profile: display name, avatar, bio, contact email — `/profile`, shown publicly at `/hosts/:id`.
- [x] ✅ Public host page at `/hosts/:id` with upcoming + past events.
- [x] ✅ Event fields: title, description, start/end, timezone, venue address OR online link, capacity, cover image, visibility.
- [x] ✅ Free/Paid toggle visible; Paid is disabled with "Coming soon" tooltip.
- [x] ✅ Lifecycle: Save Draft, Publish, Unpublish, Duplicate (in `/events/:id/edit`).

## B) Discovery / sharing
- [x] ✅ `/explore` supports text, location, date range, and "Include past" toggle.
- [x] ✅ Past events render an "Ended" badge.
- [x] ✅ RSVP button hidden on event page when ended.
- [x] ✅ Dynamic OG / Twitter metadata on `/events/:id` and `/hosts/:id` (TanStack `head`).

## C) RSVP / tickets / waitlist
- [x] ✅ RSVP requires sign-in (button routes to `/login?redirect=...`).
- [x] ✅ Signed-out RSVP returns user to the same event page after login.
- [x] ✅ Capacity → waitlist via `assign_rsvp_status` BEFORE-INSERT trigger.
- [x] ✅ FIFO auto-promotion via `promote_waitlist` on cancellation and capacity increase.
- [x] ✅ Each confirmed RSVP gets a unique ticket code + QR (`qrcode.react`).
- [x] ✅ Add-to-Calendar (`.ics` download) on event + tickets page.
- [x] ✅ RSVP cancellation supported.
- [x] ✅ `/tickets` shows upcoming/active tickets, with waitlist + promoted badges.

## D) Roles / permissions
- [x] ✅ Roles: Host + Checker (`host_member_role` enum, table `host_members`).
- [x] ✅ Invite by copyable link with role (`/team`, token at `/invite/:token`).
- [x] ✅ Hosts can manage events (RLS via `can_manage_event`).
- [x] ✅ Checkers can only access check-in (RLS via `can_checkin_event`).

## E) Dashboard / operations
- [x] ✅ Per-event stats: Going / Waitlist / Checked-in.
- [x] ✅ CSV export with exact columns: `name`, `email`, `RSVP status`, `check-in time`.
- [x] ✅ CSV uses CRLF + UTF-8 BOM → opens cleanly in Excel and Google Sheets.
- [x] ✅ `/my-events` page with host/date/text filters and role-aware actions.

## F) Check-in
- [x] ✅ Manual code entry at `/checkin/:eventId`.
- [x] ✅ Live counters (checked-in / total confirmed).
- [x] ✅ Duplicate check-in prevention: explicit UI banner + DB trigger `prevent_duplicate_checkin` preserves original time.
- [x] ✅ "Undo last scan" via `undo_checkin` RPC (auth-gated).

## G) Community
- [x] ✅ Post-event feedback (1–5 + optional comment) gated by `ends_at < now()`.
- [x] ✅ Gallery uploads require host approval before public display (`event_photos.status = 'pending'`).
- [x] ✅ Report flow on events and photos (`reports` table + `ReportButton`).
- [x] ✅ Review queue at `/reports` with hide actions for events and photos.

## H) Submission artifacts
- [x] ✅ Public deployed URL: https://mingle-maker-suite.lovable.app
- [x] ✅ Seed includes ≥1 host, ≥1 upcoming event, ≥1 past event.
- [x] ✅ Example CSV: `examples/attendees-example.csv`.
- [x] ✅ `report.md` present at repo root.
- [x] ✅ `README.md` is a step-by-step guide for Publish → RSVP → Ticket → Check-in.

## Test routes / accounts
- Public: `/`, `/explore`, `/events/:id`, `/hosts/:id`
- Auth: `/login`, `/signup`
- Attendee: `/tickets`, `/profile`
- Host: `/dashboard`, `/events/new`, `/events/:id/edit`, `/team`, `/reports`, `/my-events`
- Checker: `/checkin/:eventId`
- Invite: `/invite/:token`

Seeded accounts (password `Password123!`): `host@demo.app`, `alice@demo.app`, `bob@demo.app`, `cara@demo.app` (waitlisted), `ivan@demo.app` (checker), `mona@demo.app` (checker).

## Remaining risks
- CSV email export depends on `auth.admin.listUsers` pagination; for events with very many attendees (>4000) you may need to bump page count in `src/lib/attendees.functions.ts`.
- Timezone is stored as a string (e.g. `America/New_York`) but rendering still uses the browser locale; per-event localized rendering not yet wired.
- No email notifications (RSVP confirmation, waitlist promotion).
- No camera-based QR scanner (manual code entry only).
