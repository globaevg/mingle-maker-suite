import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Users, Search } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/explore")({ component: ExplorePage });

function ExplorePage() {
  const [q, setQ] = useState("");

  const { data: events, isLoading } = useQuery({
    queryKey: ["explore", "events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events")
        .select("id, title, description, location, starts_at, capacity, cover_url")
        .eq("is_hidden", false)
        .eq("visibility", "public")
        .eq("publish_state", "published")
        .gte("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = events?.filter(e => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return e.title.toLowerCase().includes(s) || (e.location ?? "").toLowerCase().includes(s) || (e.description ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold">Explore events</h1>
      <p className="mt-2 text-muted-foreground">All free, all community-hosted.</p>
      <div className="relative mt-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, location, or topic" className="pl-9" />
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
      {filtered && filtered.length === 0 && <p className="mt-8 text-muted-foreground">No matching events.</p>}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered?.map((e) => (
          <Link key={e.id} to="/events/$id" params={{ id: e.id }} className="group rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-elegant">
            <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-gradient-hero">
              {e.cover_url && <img src={e.cover_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold group-hover:text-accent">{e.title}</h3>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{format(new Date(e.starts_at), "PPP · p")}</div>
              {e.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{e.location}</div>}
              <div className="flex items-center gap-2"><Users className="h-4 w-4" />Up to {e.capacity}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
