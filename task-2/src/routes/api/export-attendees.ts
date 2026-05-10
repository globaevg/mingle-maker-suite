import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/export-attendees")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const token = auth.slice(7);
        const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (userErr || !userResp?.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const userId = userResp.user.id;

        let body: any;
        try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400 }); }
        const eventId = String(body?.eventId ?? "");
        if (!/^[0-9a-f-]{36}$/i.test(eventId)) {
          return new Response(JSON.stringify({ error: "Invalid eventId" }), { status: 400 });
        }

        const { data: ev } = await supabaseAdmin.from("events").select("id, host_id").eq("id", eventId).maybeSingle();
        if (!ev) return new Response(JSON.stringify({ error: "Event not found" }), { status: 404 });

        let allowed = ev.host_id === userId;
        if (!allowed) {
          const { data: m } = await supabaseAdmin.from("host_members")
            .select("id").eq("host_owner_id", ev.host_id).eq("member_user_id", userId).maybeSingle();
          allowed = !!m;
        }
        if (!allowed) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

        const { data: rsvps, error } = await supabaseAdmin.from("rsvps")
          .select("id, user_id, status, ticket_code, checked_in_at, created_at")
          .eq("event_id", eventId).order("created_at");
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        const userIds = Array.from(new Set((rsvps ?? []).map((r) => r.user_id)));
        const profilesMap = new Map<string, string>();
        if (userIds.length) {
          const { data: profs } = await supabaseAdmin.from("profiles").select("id, display_name").in("id", userIds);
          profs?.forEach((p) => profilesMap.set(p.id, p.display_name ?? ""));
        }

        const emailMap = new Map<string, string>();
        let page = 1;
        while (page < 20) {
          const { data: list, error: lerr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          if (lerr) break;
          list.users.forEach((u) => { if (u.id) emailMap.set(u.id, u.email ?? ""); });
          if (list.users.length < 200) break;
          page++;
        }

        const rows = (rsvps ?? []).map((r) => ({
          name: profilesMap.get(r.user_id) ?? "",
          email: emailMap.get(r.user_id) ?? "",
          status: r.status,
          checked_in_at: r.checked_in_at ?? "",
        }));

        return new Response(JSON.stringify({ rows }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
