import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getAttendeesForExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Authorize: user must be host or team member of the event
    const { data: ev, error: evErr } = await supabase
      .from("events").select("id, host_id").eq("id", data.eventId).maybeSingle();
    if (evErr || !ev) throw new Response("Event not found", { status: 404 });
    let allowed = ev.host_id === userId;
    if (!allowed) {
      const { data: m } = await supabase.from("host_members")
        .select("id").eq("host_owner_id", ev.host_id).eq("member_user_id", userId).maybeSingle();
      allowed = !!m;
    }
    if (!allowed) throw new Response("Forbidden", { status: 403 });

    // Pull rsvps + profile via admin (need email from auth.users)
    const { data: rsvps, error } = await supabaseAdmin
      .from("rsvps")
      .select("id, user_id, status, ticket_code, checked_in_at, created_at")
      .eq("event_id", data.eventId)
      .order("created_at");
    if (error) throw new Response(error.message, { status: 500 });

    const userIds = Array.from(new Set((rsvps ?? []).map((r) => r.user_id)));
    const profilesMap = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles").select("id, display_name").in("id", userIds);
      profs?.forEach((p) => profilesMap.set(p.id, p.display_name ?? ""));
    }

    const emailMap = new Map<string, string>();
    // admin.listUsers is paginated; fetch enough pages for typical events
    let page = 1;
    while (page < 20) {
      const { data: list, error: lerr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (lerr) break;
      list.users.forEach((u) => { if (u.id) emailMap.set(u.id, u.email ?? ""); });
      if (list.users.length < 200) break;
      page++;
    }

    return (rsvps ?? []).map((r) => ({
      name: profilesMap.get(r.user_id) ?? "",
      email: emailMap.get(r.user_id) ?? "",
      status: r.status,
      checked_in_at: r.checked_in_at ?? "",
      ticket_code: r.ticket_code,
      rsvped_at: r.created_at,
    }));
  });
