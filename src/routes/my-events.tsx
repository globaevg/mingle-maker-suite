import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/my-events")({ component: MyEventsPage });

type Row = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  host_id: string;
  role: "host" | "checker";
  hostName?: string;
};

function PageState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 text-center">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

function MyEventsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [loading, user, nav]);

  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hostFilter, setHostFilter] = useState("all");

  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["my-events", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Row[]> => {
      // Self-hosted events
      const { data: own, error: ownError } = await supabase.from("events")
        .select("id, title, starts_at, ends_at, location, host_id")
        .eq("host_id", user!.id);
      if (ownError) throw ownError;

      // Team memberships → events I can manage/check-in
      const { data: mems, error: memsError } = await supabase.from("host_members")
        .select("host_owner_id, role")
        .eq("member_user_id", user!.id);
      if (memsError) throw memsError;

      const hostIds = Array.from(new Set([user!.id, ...(mems ?? []).map((m: any) => m.host_owner_id)]));
      const hostNames = new Map<string, string>();
      if (hostIds.length) {
        const { data: profiles } = await supabase.from("profiles")
          .select("id, display_name")
          .in("id", hostIds);
        profiles?.forEach((p) => hostNames.set(p.id, p.display_name ?? p.id.slice(0, 8)));
      }

      let teamEvents: any[] = [];
      if (mems && mems.length > 0) {
        const ownerIds = mems.map((m: any) => m.host_owner_id);
        const { data, error } = await supabase.from("events")
          .select("id, title, starts_at, ends_at, location, host_id")
          .in("host_id", ownerIds);
        if (error) throw error;
        teamEvents = (data ?? []).map((e: any) => {
          const m = mems.find((x: any) => x.host_owner_id === e.host_id);
          return { ...e, role: m?.role, hostName: hostNames.get(e.host_id) };
        });
      }

      const ownRows: Row[] = (own ?? []).map((e) => ({ ...e, role: "host" as const, hostName: hostNames.get(e.host_id) ?? "Me" }));
      const map = new Map<string, Row>();
      [...ownRows, ...teamEvents].forEach((r) => { if (!map.has(r.id)) map.set(r.id, r); });
      return Array.from(map.values()).sort((a, b) => a.starts_at < b.starts_at ? 1 : -1);
    },
  });

  const hosts = useMemo(() => {
    const m = new Map<string, string>();
    rows?.forEach((r) => m.set(r.host_id, r.hostName || (r.host_id === user?.id ? "Me" : r.host_id.slice(0, 8))));
    return Array.from(m.entries());
  }, [rows, user?.id]);

  const filtered = rows?.filter((r) => {
    const s = q.trim().toLowerCase();
    if (s && !r.title.toLowerCase().includes(s) && !(r.location ?? "").toLowerCase().includes(s)) return false;
    if (hostFilter !== "all" && r.host_id !== hostFilter) return false;
    if (from && new Date(r.starts_at) < new Date(from)) return false;
    if (to && new Date(r.starts_at) > new Date(to + "T23:59:59")) return false;
    return true;
  });

  if (loading) return <PageState title="Loading your events…" />;
  if (!user) return <PageState title="Redirecting to sign in…" />;
  if (error) return <PageState title="Couldn't load your events" message={(error as Error).message || "A network or server error occurred."} />;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">My events</h1>
      <p className="mt-2 text-sm text-muted-foreground">All events where you have a host or checker role.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Input className="sm:col-span-2" placeholder="Search title or location" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={hostFilter} onChange={(e) => setHostFilter(e.target.value)}>
          <option value="all">All hosts</option>
          {hosts.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <div className="flex items-center gap-2 sm:col-span-4">
          <Label className="text-sm shrink-0">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Label className="text-sm shrink-0">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-muted-foreground">Loading events…</p>}
        {filtered?.length === 0 && <p className="text-muted-foreground">No events match.</p>}
        {filtered?.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-xl border bg-card p-4">
            <div>
              <Link to="/events/$id" params={{ id: e.id }} className="font-medium hover:text-accent">{e.title}</Link>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />{format(new Date(e.starts_at), "PPP · p")}
                {e.location && <span>· {e.location}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-accent/15 px-2 py-0.5 text-xs text-accent capitalize">{e.role}</span>
              <Link to="/events/$id" params={{ id: e.id }}><Button variant="outline" size="sm">View</Button></Link>
              <Link to="/checkin/$eventId" params={{ eventId: e.id }}><Button variant="outline" size="sm">Check-in</Button></Link>
              {e.role === "host" && (
                <>
                  <Link to="/events/$id/edit" params={{ id: e.id }}><Button variant="outline" size="sm">Edit</Button></Link>
                  <Link to="/events/$id/gallery" params={{ id: e.id }}><Button variant="outline" size="sm">Gallery</Button></Link>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
