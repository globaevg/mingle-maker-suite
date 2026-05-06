REVOKE EXECUTE ON FUNCTION public.promote_waitlist(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_rsvp_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_event_capacity_change() FROM PUBLIC, anon, authenticated;