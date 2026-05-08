import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Download, Plus, Ticket } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getAttendeesForExport } from "@/lib/attendees.functions";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  if (!loading && !user) { nav({ to: "/login" }); return null; }

  const { data: hosted } = useQuery({
    queryKey: ["hosted", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("events")
        .select("*, rsvps(count)").eq("host_id", user!.id).order("starts_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: memberships } = useQuery({
    queryKey: ["memberships", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: mems, error } = await supabase.from("host_members")
        .select("host_owner_id, role, profiles:host_owner_id(display_name)")
        .eq("member_user_id", user!.id);
      if (error) throw error;
      if (!mems?.length) return [];
      const ownerIds = mems.map((m: any) => m.host_owner_id);
      const { data: events } = await supabase.from("events")
        .select("id, title, starts_at, location, host_id")
        .in("host_id", ownerIds)
        .order("starts_at", { ascending: false });
      return (events ?? []).map((e: any) => {
        const m = mems.find((x: any) => x.host_owner_id === e.host_id);
        return { ...e, role: m?.role, hostName: (m as any)?.profiles?.display_name };
      });
    },
  });

  const { data: myRsvps } = useQuery({
    queryKey: ["my-rsvps", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("rsvps")
        .select("id, status, ticket_code, events(id, title, starts_at, location)")
        .eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
        <Link to="/events/new"><Button><Plus className="mr-1 h-4 w-4" />New event</Button></Link>
      </div>

      <Tabs defaultValue="hosting" className="mt-8">
        <TabsList>
          <TabsTrigger value="hosting">Hosting</TabsTrigger>
          <TabsTrigger value="team">Team events</TabsTrigger>
          <TabsTrigger value="attending">My RSVPs</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-6 space-y-3">
          {memberships?.length === 0 && <p className="text-muted-foreground">You're not on any host teams. Ask a host for an invite link.</p>}
          {memberships?.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl border bg-card p-4">
              <div>
                <div className="font-medium">{e.title}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />{format(new Date(e.starts_at), "PPP · p")} · {e.hostName}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-accent/15 px-2 py-0.5 text-xs text-accent">{e.role}</span>
                <Link to="/checkin/$eventId" params={{ eventId: e.id }}><Button variant="outline" size="sm">Check-in</Button></Link>
                {e.role === "host" && (
                  <Link to="/events/$id/edit" params={{ id: e.id }}><Button variant="outline" size="sm">Edit</Button></Link>
                )}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="hosting" className="mt-6 space-y-4">
          {hosted?.length === 0 && <p className="text-muted-foreground">You haven't hosted any events yet.</p>}
          {hosted?.map((e: any) => (
            <HostedEventCard key={e.id} event={e} />
          ))}
        </TabsContent>

        <TabsContent value="attending" className="mt-6 space-y-3">
          {myRsvps?.length === 0 && <p className="text-muted-foreground">No RSVPs yet. Find an event to attend!</p>}
          {myRsvps?.map((r: any) => (
            <Link key={r.id} to="/events/$id" params={{ id: r.events.id }}
              className="flex items-center justify-between rounded-xl border bg-card p-4 hover:shadow-sm">
              <div>
                <div className="font-medium">{r.events.title}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />{format(new Date(r.events.starts_at), "PPP · p")}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Ticket className="h-4 w-4 text-accent" />
                <span className="font-mono">{r.ticket_code}</span>
                <span className={`rounded px-2 py-0.5 text-xs ${r.status === "confirmed" ? "bg-accent/15 text-accent" : r.status === "waitlist" ? "bg-muted" : "bg-destructive/10 text-destructive"}`}>{r.status}</span>
              </div>
            </Link>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HostedEventCard({ event }: { event: any }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["event-stats", event.id],
    queryFn: async () => {
      const [{ count: going }, { count: waitlist }, { count: checked }] = await Promise.all([
        supabase.from("rsvps").select("*", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "confirmed"),
        supabase.from("rsvps").select("*", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "waitlist"),
        supabase.from("rsvps").select("*", { count: "exact", head: true }).eq("event_id", event.id).not("checked_in_at", "is", null),
      ]);
      return { going: going ?? 0, waitlist: waitlist ?? 0, checked: checked ?? 0 };
    },
  });

  const { data: rsvps } = useQuery({
    queryKey: ["rsvps", event.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("rsvps")
        .select("id, status, ticket_code, checked_in_at, created_at, user_id, profiles:user_id(display_name)")
        .eq("event_id", event.id).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const checkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    const { data: existing } = await supabase.from("rsvps")
      .select("id, checked_in_at").eq("event_id", event.id).eq("ticket_code", c).maybeSingle();
    if (!existing) return toast.error("Ticket not found");
    if (existing.checked_in_at) return toast.error(`Already checked in at ${format(new Date(existing.checked_in_at), "p")}`);
    const { error } = await supabase.from("rsvps")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return toast.error(error.message);
    toast.success(`Checked in: ${c}`);
    setCode("");
    qc.invalidateQueries({ queryKey: ["rsvps", event.id] });
    qc.invalidateQueries({ queryKey: ["event-stats", event.id] });
  };

  const exportCsv = async () => {
    const { data, error } = await supabase.from("rsvps")
      .select("ticket_code, status, checked_in_at, created_at, profiles:user_id(display_name)").eq("event_id", event.id);
    if (error) return toast.error(error.message);
    const rows = [
      ["name", "ticket_code", "status", "checked_in_at", "created_at"],
      ...data.map((r: any) => [r.profiles?.display_name ?? "", r.ticket_code, r.status, r.checked_in_at ?? "", r.created_at]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${event.title.replace(/\W+/g, "-")}-attendees.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/events/$id" params={{ id: event.id }} className="font-display text-lg font-semibold hover:text-accent">{event.title}</Link>
          <div className="text-sm text-muted-foreground">{format(new Date(event.starts_at), "PPP · p")} · {event.location}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/events/$id/edit" params={{ id: event.id }}><Button variant="outline" size="sm">Edit</Button></Link>
          <Link to="/checkin/$eventId" params={{ eventId: event.id }}><Button variant="outline" size="sm">Check-in</Button></Link>
          <Link to="/events/$id/gallery" params={{ id: event.id }}><Button variant="outline" size="sm">Gallery</Button></Link>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1 h-3.5 w-3.5" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>{open ? "Hide" : "Manage"}</Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Going</div><div className="font-display text-xl font-bold">{stats?.going ?? "—"}</div></div>
        <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Waitlist</div><div className="font-display text-xl font-bold">{stats?.waitlist ?? "—"}</div></div>
        <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Checked-in</div><div className="font-display text-xl font-bold">{stats?.checked ?? "—"}</div></div>
      </div>
      {open && (
        <div className="mt-4 border-t pt-4">
          <form onSubmit={checkIn} className="flex gap-2">
            <Input placeholder="Enter ticket code" value={code} onChange={(e) => setCode(e.target.value)} className="font-mono uppercase" />
            <Button type="submit">Check in</Button>
          </form>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground">
                <th className="py-2">Name</th><th>Ticket</th><th>Status</th><th>Checked in</th>
              </tr></thead>
              <tbody>
                {rsvps?.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2">{r.profiles?.display_name ?? "—"}</td>
                    <td className="font-mono">{r.ticket_code}</td>
                    <td>{r.status}</td>
                    <td>{r.checked_in_at ? format(new Date(r.checked_in_at), "p") : "—"}</td>
                  </tr>
                ))}
                {rsvps?.length === 0 && <tr><td colSpan={4} className="py-4 text-muted-foreground">No RSVPs yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
