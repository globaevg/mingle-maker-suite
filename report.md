# Project Report — Gather

## Scope delivered (v1)
This iteration ships the **core** of the platform per the agreed plan:

| Capability | Status |
|---|---|
| Auth (email + password) | ✅ |
| Public event browsing | ✅ |
| Host profile shown on event detail | ✅ |
| RSVP with capacity + waitlist | ✅ |
| Ticket code + QR | ✅ |
| Manual ticket-code check-in | ✅ |
| Host dashboard (events + RSVPs) | ✅ |
| CSV export of attendees | ✅ |
| Row-level security on all tables | ✅ |
| README.md, report.md | ✅ |
| Photo gallery + approval | ⏳ v2 |
| Feedback / reports | ⏳ v2 |

## Architecture decisions
- **Database-driven RSVP status**: a `BEFORE INSERT` trigger reads current confirmed count vs. capacity and sets `confirmed` or `waitlist`. This keeps the rule consistent regardless of client.
- **`is_event_host()` security-definer function**: avoids RLS recursion when checking host ownership for RSVP rows.
- **Auto profile creation**: `on_auth_user_created` trigger seeds a `profiles` row from signup metadata so hosts always have a display name.
- **Browser-only data calls** for v1 simplicity. Server functions can be added later for privileged reporting.

## Security posture
- All public tables have RLS enabled.
- Anonymous users can only `SELECT` `events` and `profiles`.
- RSVPs are visible only to the owning user and the hosting user.
- Ticket codes are random 8-char hex generated server-side and unique.
- HIBP password check enabled at the auth layer.

## Known limitations
- No file storage yet for cover images (URL field only).
- Check-in is manual code entry (no QR scanner).
- No email reminders.
- v2 features (gallery approval, feedback, reports) not yet built.

## Next steps
1. Storage bucket + image upload for event covers and gallery.
2. `gallery_photos` table with `approved` flag and host-only update policy.
3. `feedback` table (rating + comment) restricted to checked-in attendees.
4. Reports view: attendance %, waitlist conversions, feedback averages.
