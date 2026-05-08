import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/query-timeout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Users, Search } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/explore")({ component: ExplorePage });

function ExplorePage() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includePast, setIncludePast] = useState(false);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ["explore", "events", includePast],
    queryFn: async () => {
      let query = supabase.from("events")
        .select("id, title, description, location, starts_at, ends_at, capacity, cover_url")
        .eq("is_hidden", false)
        .eq("visibility", "public")
        .eq("publish_state", "published")
        .order("starts_at", { ascending: true });
      if (!includePast) query = query.gte("ends_at", new Date().toISOString());
      const { data, error } = await withTimeout(query);
      if (error) throw error;
      return data;
    },
  });

  const now = useMemo(() => new Date(), []);

  const filtered = events?.filter((e) => {
    const s = q.trim().toLowerCase();
    if (s && !(e.title.toLowerCase().includes(s) || (e.location ?? "").toLowerCase().includes(s) || (e.description ?? "").toLowerCase().includes(s))) return false;
    if (loc.trim() && !(e.location ?? "").toLowerCase().includes(loc.trim().toLowerCase())) return false;
    if (from && new Date(e.starts_at) < new Date(from)) return false;
    if (to && new Date(e.starts_at) > new Date(to + "T23:59:59")) return false;
    return true;
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold">Explore events</h1>
      <p className="mt-2 text-muted-foreground">All free, all community-hosted.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or topic" className="pl-9" />
        </div>
        <Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Location" />
        <div className="flex items-center justify-between rounded-md border px-3">
          <Label htmlFor="past" className="text-sm">Include past</Label>
          <Switch id="past" checked={includePast} onCheckedChange={setIncludePast} />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Label className="text-sm shrink-0">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Label className="text-sm shrink-0">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
      {error && <p className="mt-8 text-destructive">{(error as Error).message || "A network or server error occurred."}</p>}
      {filtered && filtered.length === 0 && <p className="mt-8 text-muted-foreground">No matching events.</p>}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered?.map((e) => {
          const ended = new Date(e.ends_at) < now;
          return (
            <Link key={e.id} to="/events/$id" params={{ id: e.id }} className="group rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-elegant">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-gradient-hero">
                {e.cover_url && <img src={e.cover_url} alt="" className="h-full w-full object-cover" />}
                {ended && <span className="absolute right-2 top-2 rounded bg-background/90 px-2 py-0.5 text-xs font-medium">Ended</span>}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold group-hover:text-accent">{e.title}</h3>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{format(new Date(e.starts_at), "PPP · p")}</div>
                {e.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{e.location}</div>}
                <div className="flex items-center gap-2"><Users className="h-4 w-4" />Up to {e.capacity}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
