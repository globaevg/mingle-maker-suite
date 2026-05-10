# Gather — Usage Guide

A step-by-step walkthrough of the four core flows in Gather:
**Publish → RSVP → Ticket → Check-in.**

> Live demo: https://mingle-maker-suite.lovable.app
> All seeded accounts use the password **`Password123!`**.

| Role | Email | What they can do |
|---|---|---|
| Host | `host@demo.app` | Create / edit events, moderate, check-in, export CSV |
| Attendee | `alice@demo.app`, `bob@demo.app` | RSVP, get tickets |
| Waitlisted | `cara@demo.app` | Sits on waitlist until a spot opens |
| Checker | `ivan@demo.app`, `mona@demo.app` | Check-in only — no host powers |

---

## 1. Publish an event (Host)

**Goal:** put a new event live on `/explore` and `/events/:id`.

1. Go to `/login` and sign in as `host@demo.app`.
2. Click **Dashboard** in the header.
3. Click **New event** (top-right) → you land on `/events/new`.
4. Fill in the form:
   - **Title**, **description**, **location**
   - **Start** and **End** date/time
   - **Capacity** (integer; controls RSVP vs waitlist)
   - **Cover image URL** (optional)
   - **Pricing**: leave on **Free** — the **Paid** toggle is visible but disabled (“Coming soon”).
5. Click **Create event**.
6. You are redirected to `/events/:id`. The event is **immediately public** and appears on `/explore`.

To change something later: open the event → **Edit** button → `/events/:id/edit`.
To moderate uploaded photos: **Gallery** button → `/events/:id/gallery`.

---

## 2. RSVP (Attendee)

**Goal:** reserve a spot — confirmed if there's room, waitlisted if not.

1. Sign in as `alice@demo.app` (or sign up at `/signup`).
2. Open `/explore`.
   - Use **Search**, **date range** (defaults to upcoming), **location**, and **Include past** to filter.
3. Click an event card → `/events/:id`.
4. Click **RSVP**.
   - **Capacity remaining** → status `confirmed`, ticket issued instantly.
   - **Capacity full** → status `waitlist`, no ticket yet.
5. To cancel: click **Cancel RSVP** on the same page.

**Waitlist promotion** is automatic and FIFO. When a confirmed attendee cancels, or the host raises capacity, the oldest waitlisted RSVP is promoted to `confirmed` and gets a ticket. The promoted attendee sees a **Promoted** badge on `/tickets`.

---

## 3. Ticket

**Goal:** carry your QR to the door.

1. After a confirmed RSVP, open **My Tickets** in the header (`/tickets`).
2. Each ticket shows:
   - Event title + start time
   - **8-character ticket code**
   - **QR code** encoding the same code
   - **Promoted** badge if the RSVP was promoted from the waitlist
3. The same QR/code is also visible on `/events/:id` while you are signed in and confirmed.

Tickets are tied to your account and your RSVP — cancelling the RSVP invalidates the ticket.

---

## 4. Check-in (Host or Checker)

**Goal:** mark attendees present at the door.

1. Sign in as `host@demo.app` **or** as a checker (`ivan@demo.app`).
   - Checkers can ONLY reach `/checkin/:eventId`. They cannot edit events, see exports, or moderate photos.
2. From the dashboard (host) or directly via URL (checker), open `/checkin/:eventId`.
3. Type or paste the attendee's **8-char ticket code** and press **Check in**.
4. Result:
   - **OK** → `checked_in_at = now()`, attendee appears in the checked-in list.
   - **Already checked in** → duplicate scan flagged with the original timestamp.
   - **Invalid / wrong event** → rejected.

---

## After the event

- **CSV export** (Host): Dashboard → event row → **Export CSV**. The file follows the strict schema: `name,email,RSVP status,check-in time` with UTF-8 BOM, CRLF line endings, all fields quoted, empty string for attendees who never checked in. See [`examples/attendees-example.csv`](./examples/attendees-example.csv).
- **Past events** show an **Ended** badge on `/events/:id` and the RSVP button is hidden.
- **Photo gallery**: attendees can submit photos on the event page; the host approves or rejects them at `/events/:id/gallery`.
- **Reports**: any user can report an event or photo via the **Report** button. Hosts review queued reports at `/reports`.

---

## Page map

| Path | Who | Purpose |
|---|---|---|
| `/` | Public | Landing page |
| `/explore` | Public | Browse events with search + filters |
| `/events/:id` | Public | Event detail, RSVP, gallery, feedback |
| `/events/new` | Host | Create event |
| `/events/:id/edit` | Host | Edit event |
| `/events/:id/gallery` | Host | Approve / reject submitted photos |
| `/my-events` | Attendee | Events I've RSVP'd to |
| `/tickets` | Attendee | My QR tickets |
| `/dashboard` | Host | Events, RSVPs, CSV export, check-in links |
| `/checkin/:eventId` | Host / Checker | Manual ticket-code check-in |
| `/team` | Host | Invite checkers via link |
| `/invite/:token` | Invitee | Accept a team invite |
| `/reports` | Host | Review reported events / photos |
| `/hosts/:id` | Public | Host profile + their events |
| `/profile` | Signed-in | Edit name, bio, register as host |
| `/login`, `/signup` | Public | Auth |

---

## Local setup

```bash
bun install
bun run dev
# open http://localhost:5173
```

`.env` is auto-generated by Lovable Cloud and contains
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

Database schema, RLS policies, and seed data live in `supabase/migrations/` and run automatically.
