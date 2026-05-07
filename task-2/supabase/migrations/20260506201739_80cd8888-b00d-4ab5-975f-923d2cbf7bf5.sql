
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.assign_rsvp_status() from public, anon, authenticated;
revoke execute on function public.is_event_host(uuid, uuid) from public, anon;
