import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { QRCodeSVG } from "qrcode.react";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { format } from "date-fns";
import { AddToCalendarButton } from "@/components/AddToCalendarButton";

export const Route = createFileRoute("/tickets")({ component: TicketsPage });

function TicketsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  const { data: rsvps } = useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("rsvps")
        .select("id, status, ticket_code, checked_in_at, promoted_at, events(id, title, starts_at, location, ends_at)")
        .eq("user_id", user!.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  if (!user) return null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold">My tickets</h1>
      <p className="mt-2 text-muted-foreground">Show the QR or read the code at check-in.</p>

      {rsvps && rsvps.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">No tickets yet.</p>
          <Link to="/explore" className="mt-3 inline-block text-accent underline">Find an event</Link>
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {rsvps?.map((r) => (
          <div key={r.id} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link to="/events/$id" params={{ id: r.events.id }} className="font-display text-lg font-semibold hover:text-accent">{r.events.title}</Link>
                <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{format(new Date(r.events.starts_at), "PPP · p")}</div>
                  {r.events.location && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{r.events.location}</div>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded px-2 py-0.5 text-xs ${r.status === "confirmed" ? "bg-accent/15 text-accent" : "bg-muted"}`}>{r.status}</span>
                {r.promoted_at && r.status === "confirmed" && (
                  <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">Promoted from waitlist</span>
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-col items-center">
              <div className="rounded-lg bg-white p-3"><QRCodeSVG value={r.ticket_code} size={140} /></div>
              <div className="mt-3 flex items-center gap-2 font-mono text-base tracking-widest">
                <Ticket className="h-4 w-4 text-accent" />{r.ticket_code}
              </div>
              {r.checked_in_at && <p className="mt-2 text-xs text-accent">Checked in {format(new Date(r.checked_in_at), "PPp")}</p>}
              <div className="mt-3">
                <AddToCalendarButton event={{
                  uid: r.events.id,
                  title: r.events.title,
                  description: "",
                  location: r.events.location || "",
                  startsAt: r.events.starts_at,
                  endsAt: r.events.ends_at,
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
