-- Track promotion timestamp
ALTER TABLE public.rsvps ADD COLUMN IF NOT EXISTS promoted_at timestamptz;

-- Promote N earliest waitlisted RSVPs for an event up to remaining capacity
CREATE OR REPLACE FUNCTION public.promote_waitlist(_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cap integer;
  taken integer;
  slots integer;
BEGIN
  SELECT capacity INTO cap FROM public.events WHERE id = _event_id;
  IF cap IS NULL THEN RETURN; END IF;
  SELECT count(*) INTO taken FROM public.rsvps
    WHERE event_id = _event_id AND status = 'confirmed';
  slots := cap - taken;
  IF slots <= 0 THEN RETURN; END IF;

  UPDATE public.rsvps
  SET status = 'confirmed', promoted_at = now()
  WHERE id IN (
    SELECT id FROM public.rsvps
    WHERE event_id = _event_id AND status = 'waitlist'
    ORDER BY created_at ASC
    LIMIT slots
  );
END;
$$;

-- Trigger: when a confirmed RSVP is cancelled, promote next waitlisted
CREATE OR REPLACE FUNCTION public.on_rsvp_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
    PERFORM public.promote_waitlist(NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rsvps_status_change ON public.rsvps;
CREATE TRIGGER rsvps_status_change
AFTER UPDATE OF status ON public.rsvps
FOR EACH ROW EXECUTE FUNCTION public.on_rsvp_status_change();

-- Trigger: when event capacity grows, promote waitlisted users
CREATE OR REPLACE FUNCTION public.on_event_capacity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.capacity > OLD.capacity THEN
    PERFORM public.promote_waitlist(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_capacity_change ON public.events;
CREATE TRIGGER events_capacity_change
AFTER UPDATE OF capacity ON public.events
FOR EACH ROW EXECUTE FUNCTION public.on_event_capacity_change();

-- Ensure the assign_rsvp_status BEFORE INSERT trigger is attached
DROP TRIGGER IF EXISTS assign_rsvp_status_trg ON public.rsvps;
CREATE TRIGGER assign_rsvp_status_trg
BEFORE INSERT ON public.rsvps
FOR EACH ROW EXECUTE FUNCTION public.assign_rsvp_status();