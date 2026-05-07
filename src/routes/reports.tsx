import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";

const BUCKET = "event-photos";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

function ReportsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  if (!loading && !user) { nav({ to: "/login" }); return null; }

  const { data: reports } = useQuery({
    queryKey: ["reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("reports" as any)
        .select("*, events:event_id(id, title, is_hidden, host_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const photoIds = (reports ?? []).filter(r => r.target_type === "photo").map(r => r.target_id);
  const { data: photos } = useQuery({
    queryKey: ["report-photos", photoIds.join(",")],
    enabled: photoIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("event_photos")
        .select("id, storage_path, status").in("id", photoIds);
      return data ?? [];
    },
  });

  const setReportStatus = async (id: string, status: "reviewed" | "dismissed") => {
    const { error } = await supabase.from("reports" as any)
      .update({ status, reviewed_at: new Date().toISOString() } as any).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["reports"] });
  };

  const hideEvent = async (eventId: string, hidden: boolean) => {
    const { error } = await supabase.from("events").update({ is_hidden: hidden } as any).eq("id", eventId);
    if (error) return toast.error(error.message);
    toast.success(hidden ? "Event hidden" : "Event restored");
    qc.invalidateQueries({ queryKey: ["reports"] });
  };

  const hidePhoto = async (photoId: string) => {
    const { error } = await supabase.from("event_photos").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", photoId);
    if (error) return toast.error(error.message);
    toast.success("Photo hidden");
    qc.invalidateQueries({ queryKey: ["report-photos"] });
  };

  const photoById = (id: string) => photos?.find(p => p.id === id);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Review queue</h1>
      <p className="mt-2 text-muted-foreground">Reports from the community for events and photos you host.</p>

      <div className="mt-8 space-y-4">
        {reports?.length === 0 && <p className="text-muted-foreground">No reports right now. </p>}
        {reports?.map((r) => {
          const ev = (r as any).events;
          const photo = r.target_type === "photo" ? photoById(r.target_id) : null;
          return (
            <div key={r.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">{format(new Date(r.created_at), "PPP · p")} · {r.status}</div>
                  <div className="mt-1 font-medium">
                    {r.target_type === "event" ? "Event report" : "Photo report"} ·{" "}
                    {ev ? <Link to="/events/$id" params={{ id: ev.id }} className="underline">{ev.title}</Link> : "—"}
                  </div>
                  {r.reason && <p className="mt-2 text-sm text-foreground/80">"{r.reason}"</p>}
                  {photo && (
                    <img src={supabase.storage.from(BUCKET).getPublicUrl(photo.storage_path).data.publicUrl}
                      alt="" className="mt-3 max-h-48 rounded-lg" />
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {r.target_type === "event" && ev && (
                    <Button size="sm" variant="outline" onClick={() => hideEvent(ev.id, !ev.is_hidden)}>
                      {ev.is_hidden ? "Unhide event" : "Hide event"}
                    </Button>
                  )}
                  {r.target_type === "photo" && photo && photo.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => hidePhoto(photo.id)}>Hide photo</Button>
                  )}
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setReportStatus(r.id, "reviewed")}>Mark reviewed</Button>
                      <Button size="sm" variant="ghost" onClick={() => setReportStatus(r.id, "dismissed")}>Dismiss</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
