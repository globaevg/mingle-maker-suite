import { createFileRoute, Link, notFound, useRouter, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { withTimeout } from "@/lib/query-timeout";

export const Route = createFileRoute("/events/$id")({
  loader: async ({ params }) => {
    const { data, error } = await withTimeout(
      supabase.from("events").select("*").eq("id", params.id).maybeSingle()
    );
    if (error) throw error;
    if (!data) throw notFound();
    const { data: hostProfile } = await withTimeout(
      supabase
        .from("profiles")
        .select("id, display_name, bio, avatar_url")
        .eq("id", data.host_id)
        .maybeSingle()
    ).catch(() => ({ data: null }));
    return { event: data, hostProfile: hostProfile ?? null };
  },
  head: ({ loaderData }) => {
    const e = loaderData?.event;
    if (!e) return { meta: [] };
    const title = `${e.title} — Gather`;
    const desc = (e.description || "Join this community event on Gather.").slice(0, 160);
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "event" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    if (e.cover_url) {
      meta.push({ property: "og:image", content: e.cover_url });
      meta.push({ name: "twitter:image", content: e.cover_url });
    }
    return { meta };
  },
  pendingComponent: () => (
    <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold">Loading event…</h1>
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Couldn't load event</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message || "A network or server error occurred."}</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button variant="outline" onClick={() => { router.invalidate(); reset(); }}>Retry</Button>
          <Link to="/explore"><Button variant="outline">Back to explore</Button></Link>
        </div>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold">Event not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This event may have been removed or is unavailable.</p>
      <Link to="/explore" className="mt-4 inline-block underline">Back to explore</Link>
    </div>
  ),
  component: () => <Outlet />,
});
