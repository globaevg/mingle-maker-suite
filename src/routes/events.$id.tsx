import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Ticket } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { EventFeedback } from "@/components/EventFeedback";
import { EventGallery } from "@/components/EventGallery";

export const Route = createFileRoute("/events/$id")({ component: EventPage });

function EventPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data: event } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("events")
        .select("*, profiles:host_id(display_name, bio, avatar_url)")
        .eq("id", id).single();
      if (error) throw error;
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
    if (!user) { nav({ to: "/login" }); return; }
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

  const full = (counts?.confirmed ?? 0) >= event.capacity;
  const active = myRsvp && myRsvp.status !== "cancelled";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <div className="aspect-[21/9] w-full overflow-hidden rounded-2xl bg-gradient-hero">
        {event.cover_url && <img src={event.cover_url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{event.title}</h1>
          <p className="mt-4 whitespace-pre-line text-foreground/80">{event.description}</p>
          <div className="mt-8 rounded-xl border bg-card p-5">
            <h3 className="font-display font-semibold">Hosted by</h3>
            <p className="mt-1 text-sm">{(event as any).profiles?.display_name ?? "A community member"}</p>
            {(event as any).profiles?.bio && <p className="mt-2 text-sm text-muted-foreground">{(event as any).profiles.bio}</p>}
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-accent" />{format(new Date(event.starts_at), "PPP · p")}</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" />{event.location || "Location TBA"}</div>
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" />{counts?.confirmed ?? 0} / {event.capacity} going</div>
            </div>
            {active ? (
              <Button variant="outline" className="mt-4 w-full" onClick={cancel}>Cancel RSVP</Button>
            ) : (
              <Button className="mt-4 w-full" onClick={rsvp}>
                {full ? "Join waitlist" : "RSVP — it's free"}
              </Button>
            )}
            {!user && <p className="mt-2 text-xs text-muted-foreground">You'll need to <Link to="/login" className="underline">sign in</Link> first.</p>}
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
