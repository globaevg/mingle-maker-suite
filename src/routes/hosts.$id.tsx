import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/hosts/$id")({
  loader: async ({ params }) => {
    const { data, error } = await supabase.from("profiles")
      .select("id, display_name, bio, avatar_url").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { profile: data };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.profile;
    if (!p) return { meta: [] };
    const title = `${p.display_name} — Host on Gather`;
    const desc = (p.bio || `Events hosted by ${p.display_name} on Gather.`).slice(0, 160);
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    if (p.avatar_url) {
      meta.push({ property: "og:image", content: p.avatar_url });
      meta.push({ name: "twitter:image", content: p.avatar_url });
    }
    return { meta };
  },
  component: HostPage,
});

function HostPage() {
  const { id } = Route.useParams();

  const { data: profile } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ["host-events", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("events")
        .select("id, title, starts_at, location, cover_url, ends_at")
        .eq("host_id", id).order("starts_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!profile) return <div className="container mx-auto max-w-3xl px-4 py-16">Loading…</div>;

  const now = new Date().toISOString();
  const upcoming = events?.filter(e => e.ends_at >= now) ?? [];
  const past = events?.filter(e => e.ends_at < now) ?? [];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center gap-5">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-gradient-hero">
          {profile.avatar_url && <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold">{profile.display_name}</h1>
          {profile.bio && <p className="mt-1 max-w-xl text-muted-foreground">{profile.bio}</p>}
          {(profile as any).contact_email && (
            <p className="mt-1 text-sm"><a href={`mailto:${(profile as any).contact_email}`} className="text-accent underline">{(profile as any).contact_email}</a></p>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Upcoming events</h2>
        {upcoming.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No upcoming events.</p>}
        <div className="mt-4 space-y-3">
          {upcoming.map(e => <EventRow key={e.id} e={e} />)}
        </div>
      </section>

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Past events</h2>
          <div className="mt-4 space-y-3">
            {past.map(e => <EventRow key={e.id} e={e} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function EventRow({ e }: { e: any }) {
  return (
    <Link to="/events/$id" params={{ id: e.id }} className="flex items-center justify-between rounded-xl border bg-card p-4 hover:shadow-sm">
      <div>
        <div className="font-medium">{e.title}</div>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(e.starts_at), "PPP · p")}</span>
          {e.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{e.location}</span>}
        </div>
      </div>
    </Link>
  );
}
