import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Ticket, Globe } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { EventFeedback } from "@/components/EventFeedback";
import { EventGallery } from "@/components/EventGallery";
import { ReportButton } from "@/components/ReportButton";
import { AddToCalendarButton } from "@/components/AddToCalendarButton";

export const Route = createFileRoute("/events/$id")({
  loader: async ({ params }) => {
    const { data, error } = await supabase.from("events")
      .select("id, title, description, location, cover_url, starts_at, ends_at")
      .eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { event: data };
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
  component: EventPage,
});

function EventPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("events")
        .select("*")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Event not found");
      return data;
    },
  });

  const { data: hostProfile } = useQuery({
    queryKey: ["host-profile", event?.host_id],
    enabled: !!event?.host_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("display_name, bio, avatar_url")
        .eq("id", event!.host_id).maybeSingle();
      if (error) return null;
      return data;
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["event-counts", id],
    queryFn: async () => {
      const { count: confirmed } = await supabase.from("rsvps").select("*", { count: "exact", head: true })
        .eq("event_id", id).eq("status", "confirmed");
      return { confirmed: confirmed ?? 0 };
    },
  });

  const { data: myRsvp } = useQuery({
    queryKey: ["my-rsvp", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("rsvps").select("*").eq("event_id", id).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const rsvp = async () => {
    if (!user) {
      // returnTo flow: come back to this exact event after login
      const returnTo = `/events/${id}`;
      nav({ to: "/login", search: { redirect: returnTo } as any });
      return;
    }
    const { error } = await supabase.from("rsvps").insert({ event_id: id, user_id: user.id });
    if (error) return toast.error(error.message);
    toast.success("You're in! Check your ticket below.");
    qc.invalidateQueries({ queryKey: ["my-rsvp", id] });
    qc.invalidateQueries({ queryKey: ["event-counts", id] });
  };

  const cancel = async () => {
    if (!myRsvp) return;
    const { error } = await supabase.from("rsvps").update({ status: "cancelled" }).eq("id", myRsvp.id);
    if (error) return toast.error(error.message);
    toast.success("RSVP cancelled");
    qc.invalidateQueries({ queryKey: ["my-rsvp", id] });
    qc.invalidateQueries({ queryKey: ["event-counts", id] });
  };

  if (!event) return <div className="container mx-auto max-w-4xl px-4 py-16">Loading…</div>;

  const ended = new Date(event.ends_at) < new Date();
  const full = (counts?.confirmed ?? 0) >= event.capacity;
  const active = myRsvp && myRsvp.status !== "cancelled";
  const isUnlisted = (event as any).visibility === "unlisted";
  const isDraft = (event as any).publish_state === "draft";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <div className="aspect-[21/9] w-full overflow-hidden rounded-2xl bg-gradient-hero">
        {event.cover_url && <img src={event.cover_url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            {ended && <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">Ended</span>}
            {isDraft && <span className="rounded bg-muted px-2 py-0.5 text-xs">Draft</span>}
            {isUnlisted && <span className="rounded bg-muted px-2 py-0.5 text-xs">Unlisted</span>}
          </div>
          <div className="mt-2 flex items-start justify-between gap-4">
            <h1 className="font-display text-3xl font-bold sm:text-4xl">{event.title}</h1>
            {user && user.id !== event.host_id && (
              <ReportButton targetType="event" targetId={event.id} eventId={event.id} label="Report" />
            )}
          </div>
          {(event as any).is_hidden && <p className="mt-2 text-sm text-destructive">This event is hidden from public listings.</p>}
          <p className="mt-4 whitespace-pre-line text-foreground/80">{event.description}</p>
          <div className="mt-8 rounded-xl border bg-card p-5">
            <h3 className="font-display font-semibold">Hosted by</h3>
            <p className="mt-1 text-sm">
              <Link to="/hosts/$id" params={{ id: event.host_id }} className="hover:text-accent">
                {(event as any).profiles?.display_name ?? "A community member"}
              </Link>
            </p>
            {(event as any).profiles?.bio && <p className="mt-2 text-sm text-muted-foreground">{(event as any).profiles.bio}</p>}
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-accent" />{format(new Date(event.starts_at), "PPP · p")}</div>
              {event.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" />{event.location}</div>}
              {(event as any).online_url && <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-accent" /><a className="underline truncate" href={(event as any).online_url} target="_blank" rel="noreferrer">Online link</a></div>}
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" />{counts?.confirmed ?? 0} / {event.capacity} going</div>
              {(event as any).timezone && <div className="text-xs text-muted-foreground">Timezone: {(event as any).timezone}</div>}
            </div>

            {ended ? (
              <div className="mt-4 rounded-md bg-muted p-3 text-center text-sm text-muted-foreground">This event has ended.</div>
            ) : active ? (
              <Button variant="outline" className="mt-4 w-full" onClick={cancel}>Cancel RSVP</Button>
            ) : (
              <Button className="mt-4 w-full" onClick={rsvp}>
                {full ? "Join waitlist" : "RSVP — it's free"}
              </Button>
            )}
            {!user && !ended && <p className="mt-2 text-xs text-muted-foreground">You'll need to <Link to="/login" search={{ redirect: `/events/${id}` } as any} className="underline">sign in</Link> first.</p>}
          </div>

          {active && (
            <div className="rounded-xl border bg-card p-5 text-center shadow-sm">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                <Ticket className="h-4 w-4 text-accent" />
                Your ticket
                {myRsvp.status === "waitlist" && <span className="rounded bg-muted px-2 py-0.5 text-xs">Waitlist</span>}
                {myRsvp.status === "confirmed" && myRsvp.promoted_at && <span className="rounded bg-accent/15 px-2 py-0.5 text-xs text-accent">Promoted</span>}
              </div>
              {myRsvp.status === "confirmed" && myRsvp.promoted_at && (
                <p className="mt-1 text-xs text-accent">A spot opened up — you're in!</p>
              )}
              <div className="mt-4 inline-block rounded-lg bg-white p-3">
                <QRCodeSVG value={myRsvp.ticket_code} size={160} />
              </div>
              <div className="mt-3 font-mono text-lg tracking-widest">{myRsvp.ticket_code}</div>
              <p className="mt-1 text-xs text-muted-foreground">Show this at check-in</p>
              <div className="mt-3">
                <AddToCalendarButton event={{
                  uid: event.id,
                  title: event.title,
                  description: event.description,
                  location: event.location || (event as any).online_url || "",
                  startsAt: event.starts_at,
                  endsAt: event.ends_at,
                  timezone: (event as any).timezone,
                }} />
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <EventGallery eventId={id} isAttendee={!!active && myRsvp?.status === "confirmed"} />
        <EventFeedback eventId={id} endsAt={event.ends_at} isAttendee={!!active && myRsvp?.status === "confirmed"} />
      </div>
    </div>
  );
}
