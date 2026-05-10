
-- A) Event publishing model: new enums + columns
CREATE TYPE public.event_visibility AS ENUM ('public', 'unlisted');
CREATE TYPE public.event_publish_state AS ENUM ('draft', 'published');

ALTER TABLE public.events
  ADD COLUMN visibility public.event_visibility NOT NULL DEFAULT 'public',
  ADD COLUMN publish_state public.event_publish_state NOT NULL DEFAULT 'draft',
  ADD COLUMN timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN online_url text;

-- Backfill: existing events were already live, mark them published
UPDATE public.events SET publish_state = 'published' WHERE publish_state = 'draft';

CREATE INDEX IF NOT EXISTS idx_events_discovery
  ON public.events(starts_at)
  WHERE publish_state = 'published' AND visibility = 'public' AND is_hidden = false;

-- B) Discovery policy: replace permissive SELECT with visibility-aware policy
DROP POLICY IF EXISTS "events are viewable by everyone" ON public.events;

CREATE POLICY "public events are viewable by everyone"
  ON public.events FOR SELECT
  USING (
    publish_state = 'published'
    AND is_hidden = false
    -- both 'public' and 'unlisted' selectable; explore page filters to public.
    -- draft never visible to non-host.
  );

CREATE POLICY "hosts view their own events"
  ON public.events FOR SELECT
  USING (public.can_manage_event(id, auth.uid()));

-- D) Duplicate check-in protection
-- Prevent overwriting an existing checked_in_at value
CREATE OR REPLACE FUNCTION public.prevent_duplicate_checkin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.checked_in_at IS NOT NULL
     AND NEW.checked_in_at IS NOT NULL
     AND OLD.checked_in_at IS DISTINCT FROM NEW.checked_in_at THEN
    NEW.checked_in_at := OLD.checked_in_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rsvps_prevent_duplicate_checkin ON public.rsvps;
CREATE TRIGGER rsvps_prevent_duplicate_checkin
BEFORE UPDATE OF checked_in_at ON public.rsvps
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_checkin();

-- E) Undo last check-in (host/checker only)
CREATE OR REPLACE FUNCTION public.undo_checkin(_rsvp_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event uuid;
BEGIN
  SELECT event_id INTO _event FROM public.rsvps WHERE id = _rsvp_id;
  IF _event IS NULL THEN RAISE EXCEPTION 'RSVP not found'; END IF;
  IF NOT public.can_checkin_event(_event, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.rsvps SET checked_in_at = NULL WHERE id = _rsvp_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.undo_checkin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_checkin(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.prevent_duplicate_checkin() FROM PUBLIC, anon, authenticated;
