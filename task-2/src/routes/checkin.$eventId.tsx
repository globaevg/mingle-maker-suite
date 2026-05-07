import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ScanLine } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/checkin/$eventId")({ component: CheckinPage });

function CheckinPage() {
  const { eventId } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [last, setLast] = useState<{ code: string; ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  const { data: event } = useQuery({
    queryKey: ["event-meta", eventId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("id, title, host_id, starts_at, capacity").eq("id", eventId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: canCheckin } = useQuery({
    queryKey: ["can-checkin", eventId, user?.id],
    enabled: !!user && !!event,
    queryFn: async () => {
      if (event!.host_id === user!.id) return true;
      const { data } = await supabase.from("host_members")
        .select("id").eq("host_owner_id", event!.host_id).eq("member_user_id", user!.id).maybeSingle();
      return !!data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["checkin-stats", eventId],
    enabled: !!user && !!event && canCheckin === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("rsvps")
        .select("id, ticket_code, status, checked_in_at")
        .eq("event_id", eventId).eq("status", "confirmed");
      if (error) throw error;
      return data;
    },
  });

  if (!user || !event) return <div className="container mx-auto max-w-2xl px-4 py-12">Loading…</div>;
  if (canCheckin === false) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <p className="text-muted-foreground">You don't have access to check-in for this event.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-accent underline">Back to dashboard</Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    const { data, error } = await supabase.from("rsvps")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("event_id", eventId).eq("ticket_code", c).select().maybeSingle();
    if (error) { setLast({ code: c, ok: false, msg: error.message }); toast.error(error.message); }
    else if (!data) { setLast({ code: c, ok: false, msg: "Ticket not found" }); toast.error("Ticket not found"); }
    else { setLast({ code: c, ok: true, msg: data.status === "waitlist" ? "Checked in (waitlist)" : "Checked in" }); toast.success(`Checked in ${c}`); }
    setCode("");
    qc.invalidateQueries({ queryKey: ["checkin-stats", eventId] });
  };

  const checkedIn = stats?.filter(s => s.checked_in_at).length ?? 0;
  const total = stats?.length ?? 0;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:underline">← Dashboard</Link>
      <h1 className="mt-2 font-display text-3xl font-semibold">{event.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{format(new Date(event.starts_at), "PPP · p")}</p>

      <div className="mt-6 rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Checked in</span>
          <span className="font-display text-2xl font-bold">{checkedIn} <span className="text-base text-muted-foreground">/ {total}</span></span>
        </div>
      </div>

      <form onSubmit={submit} className="mt-6 rounded-xl border bg-card p-5">
        <label className="flex items-center gap-2 text-sm font-medium"><ScanLine className="h-4 w-4 text-accent" />Enter ticket code</label>
        <div className="mt-3 flex gap-2">
          <Input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD1234" className="font-mono text-lg uppercase tracking-widest" />
          <Button type="submit">Check in</Button>
        </div>
      </form>

      {last && (
        <div className={`mt-4 flex items-center gap-3 rounded-xl border p-4 ${last.ok ? "border-accent/40 bg-accent/5 text-accent" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>
          {last.ok && <CheckCircle2 className="h-5 w-5" />}
          <div>
            <div className="font-mono">{last.code}</div>
            <div className="text-sm">{last.msg}</div>
          </div>
        </div>
      )}
    </div>
  );
}
