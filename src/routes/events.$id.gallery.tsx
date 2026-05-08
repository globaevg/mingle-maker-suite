import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { withTimeout } from "@/lib/query-timeout";
import { toast } from "sonner";

const BUCKET = "event-photos";
const publicUrl = (p: string) => supabase.storage.from(BUCKET).getPublicUrl(p).data.publicUrl;

export const Route = createFileRoute("/events/$id/gallery")({ component: GalleryAdmin });

function RouteState({ title, message, action }: { title: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 text-center">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function GalleryAdmin() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ["event-min", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await withTimeout(supabase.from("events").select("id, title, host_id").eq("id", id).maybeSingle());
      if (error) throw error;
      if (!data) throw new Error("Event not found");
      return data;
    },
  });

  const { data: canManage, isLoading: permissionLoading, error: permissionError } = useQuery({
    queryKey: ["gallery-permission", id, user?.id, event?.host_id],
    enabled: !!user && !!event,
    queryFn: async () => {
      if (event!.host_id === user!.id) return true;
      const { data, error } = await withTimeout(supabase.from("host_members")
        .select("id")
        .eq("host_owner_id", event!.host_id)
        .eq("member_user_id", user!.id)
        .eq("role", "host")
        .maybeSingle());
      if (error) throw error;
      return !!data;
    },
  });

  const { data: photos, isLoading: photosLoading, error: photosError } = useQuery({
    queryKey: ["gallery-admin", id, canManage],
    enabled: !!user && !!event && canManage === true,
    queryFn: async () => {
      const { data: rows, error } = await withTimeout(supabase.from("event_photos")
        .select("id, storage_path, status, user_id, created_at")
        .eq("event_id", id).order("created_at", { ascending: false }));
      if (error) throw error;
      const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
      const nameMap = new Map<string, string>();
      if (userIds.length) {
        const { data: profs } = await withTimeout(supabase.from("profiles").select("id, display_name").in("id", userIds)).catch(() => ({ data: [] }));
        profs?.forEach((p) => nameMap.set(p.id, p.display_name ?? "Attendee"));
      }
      return (rows ?? []).map((r) => ({ ...r, profiles: { display_name: nameMap.get(r.user_id) ?? "Attendee" } }));
    },
  });

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [loading, user, nav]);

  if (loading) return <RouteState title="Loading gallery…" />;
  if (!user) return <RouteState title="Redirecting to sign in…" />;
  if (eventError) {
    const message = (eventError as Error).message;
    return <RouteState title={message === "Event not found" ? "Event not found" : "Couldn't load gallery"} message={message === "Event not found" ? "This event may have been removed or is unavailable." : message || "A network or server error occurred."} />;
  }
  if (eventLoading || !event) return <RouteState title="Loading event…" />;
  if (permissionError) return <RouteState title="Couldn't verify access" message={(permissionError as Error).message || "A network or server error occurred."} />;
  if (permissionLoading || canManage === undefined) return <RouteState title="Checking permissions…" />;
  if (!canManage) return <RouteState title="Permission denied" message="You don't have access to moderate this gallery." action={<Link to="/events/$id" params={{ id }}><Button variant="outline">View event</Button></Link>} />;
  if (photosError) return <RouteState title="Couldn't load photos" message={(photosError as Error).message || "A network or server error occurred."} />;

  const setStatus = async (photoId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("event_photos")
      .update({ status, reviewed_at: new Date().toISOString() }).eq("id", photoId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["gallery-admin", id] });
  };

  const remove = async (photoId: string, path: string) => {
    await supabase.storage.from(BUCKET).remove([path]);
    const { error } = await supabase.from("event_photos").delete().eq("id", photoId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["gallery-admin", id] });
  };

  const pending = photos?.filter(p => p.status === "pending") ?? [];
  const approved = photos?.filter(p => p.status === "approved") ?? [];
  const rejected = photos?.filter(p => p.status === "rejected") ?? [];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Gallery moderation</h1>
          <p className="text-sm text-muted-foreground">{event?.title}</p>
        </div>
        <Link to="/events/$id" params={{ id }}><Button variant="outline" size="sm">View event</Button></Link>
      </div>

      {photosLoading && <p className="mt-8 text-sm text-muted-foreground">Loading photos…</p>}

      <Section title={`Pending (${pending.length})`}>
        {pending.length === 0 && <Empty />}
        <Grid items={pending} actions={(p) => (
          <>
            <Button size="sm" onClick={() => setStatus(p.id, "approved")}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "rejected")}>Reject</Button>
          </>
        )} />
      </Section>

      <Section title={`Approved (${approved.length})`}>
        {approved.length === 0 && <Empty />}
        <Grid items={approved} actions={(p) => (
          <Button size="sm" variant="outline" onClick={() => remove(p.id, p.storage_path)}>Remove</Button>
        )} />
      </Section>

      <Section title={`Rejected (${rejected.length})`}>
        {rejected.length === 0 && <Empty />}
        <Grid items={rejected} actions={(p) => (
          <>
            <Button size="sm" onClick={() => setStatus(p.id, "approved")}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => remove(p.id, p.storage_path)}>Delete</Button>
          </>
        )} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-8"><h2 className="font-display text-xl font-semibold">{title}</h2><div className="mt-3">{children}</div></section>;
}
function Empty() { return <p className="text-sm text-muted-foreground">Nothing here.</p>; }
function Grid({ items, actions }: { items: any[]; actions: (p: any) => React.ReactNode }) {
  if (!items.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {items.map(p => (
        <div key={p.id} className="overflow-hidden rounded-xl border bg-card">
          <div className="aspect-square bg-muted"><img src={publicUrl(p.storage_path)} alt="" className="h-full w-full object-cover" /></div>
          <div className="p-3">
            <div className="text-xs text-muted-foreground">By {p.profiles?.display_name ?? "Attendee"}</div>
            <div className="mt-2 flex gap-2">{actions(p)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
