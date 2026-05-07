import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["events", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, location, starts_at, capacity, cover_url")
        .gte("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl max-w-3xl">
            Free community events, beautifully simple.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-primary-foreground/85">
            Discover gatherings near you, RSVP in one tap, get a QR ticket, and check in at the door.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/signup" className="rounded-md bg-background px-5 py-3 text-sm font-medium text-foreground shadow-elegant hover:bg-background/90">
              Create an account
            </Link>
            <a href="#events" className="rounded-md border border-primary-foreground/30 px-5 py-3 text-sm font-medium hover:bg-primary-foreground/10">
              Browse events
            </a>
          </div>
        </div>
      </section>

      <section id="events" className="container mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-2xl font-semibold">Upcoming events</h2>
        {isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}
        {events && events.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground">No events yet. Be the first to host!</p>
            <Link to="/events/new" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Host an event
            </Link>
          </div>
        )}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events?.map((e) => (
            <Link key={e.id} to="/events/$id" params={{ id: e.id }}
              className="group rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-elegant">
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
      </section>
    </div>
  );
}
