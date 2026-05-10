import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { withTimeout } from "@/lib/query-timeout";
import { toast } from "sonner";

export const Route = createFileRoute("/events/$id/edit")({ component: EditEventPage });

type LoadState = "idle" | "loading" | "not-found" | "permission-denied" | "error";

function RouteMessage({ title, message, action }: { title: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const toLocal = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function EditEventPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [loading, user, nav]);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    setLoadState("loading");
    setLoadError(null);
    (async () => {
      try {
        const { data, error } = await withTimeout(supabase.from("events").select("*").eq("id", id).maybeSingle());
        if (cancelled) return;
        if (error) { setLoadError(error.message); setLoadState("error"); return; }
        if (!data) { setLoadState("not-found"); return; }
        if (data.host_id !== user.id) {
          const { data: membership, error: membershipError } = await withTimeout(supabase.from("host_members")
            .select("id")
            .eq("host_owner_id", data.host_id)
            .eq("member_user_id", user.id)
            .eq("role", "host")
            .maybeSingle());
          if (cancelled) return;
          if (membershipError) { setLoadError(membershipError.message); setLoadState("error"); return; }
          if (!membership) { setLoadState("permission-denied"); return; }
        }
        setForm({
          title: data.title, description: data.description, location: data.location,
          online_url: (data as any).online_url ?? "",
          starts_at: toLocal(data.starts_at), ends_at: toLocal(data.ends_at),
          timezone: (data as any).timezone ?? "UTC",
          capacity: data.capacity, cover_url: data.cover_url ?? "",
          visibility: (data as any).visibility ?? "public",
          publish_state: (data as any).publish_state ?? "draft",
        });
        setLoadState("idle");
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "A network or server error occurred.");
        setLoadState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [id, user, loading, nav, retryKey]);

  if (loading || loadState === "loading") return <RouteMessage title="Loading event…" />;
  if (!user) return <RouteMessage title="Redirecting to sign in…" />;
  if (loadState === "not-found") return <RouteMessage title="Event not found" message="This event may have been removed or is unavailable." />;
  if (loadState === "permission-denied") return <RouteMessage title="Permission denied" message="You don't have access to edit this event." action={<Button variant="outline" onClick={() => nav({ to: "/events/$id", params: { id } })}>View event</Button>} />;
  if (loadState === "error") return (
    <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="font-display text-2xl font-semibold">Couldn't load event</h1>
      <p className="mt-2 text-sm text-muted-foreground">{loadError || "A network or server error occurred."}</p>
      <Button className="mt-4" variant="outline" onClick={() => setRetryKey((v) => v + 1)}>Retry</Button>
    </div>
  );
  if (!form) return <RouteMessage title="Loading event…" />;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const updatePayload = () => ({
    title: form.title, description: form.description, location: form.location,
    online_url: form.online_url || null,
    starts_at: new Date(form.starts_at).toISOString(),
    ends_at: new Date(form.ends_at).toISOString(),
    timezone: form.timezone || "UTC",
    capacity: Number(form.capacity),
    cover_url: form.cover_url || null,
    visibility: form.visibility,
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("events").update(updatePayload() as any).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Event updated");
  };

  const setLifecycle = async (publish_state: "draft" | "published") => {
    setBusy(true);
    const { error } = await supabase.from("events").update({ publish_state } as any).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setForm({ ...form, publish_state });
    toast.success(publish_state === "published" ? "Published" : "Unpublished (back to draft)");
  };

  const duplicate = async () => {
    setBusy(true);
    const { data, error } = await supabase.from("events").insert({
      host_id: user!.id,
      ...updatePayload(),
      title: `${form.title} (copy)`,
      publish_state: "draft",
      is_paid: false,
    } as any).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Duplicated as draft");
    nav({ to: "/events/$id/edit", params: { id: data.id } });
  };

  const del = async () => {
    if (!confirm("Delete this event? RSVPs will be removed.")) return;
    setBusy(true);
    const { error } = await supabase.from("events").delete().eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Event deleted");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Edit event</h1>
        <span className={`rounded px-2 py-0.5 text-xs ${form.publish_state === "published" ? "bg-accent/15 text-accent" : "bg-muted"}`}>
          {form.publish_state === "published" ? "Published" : "Draft"}
        </span>
      </div>

      <form onSubmit={save} className="mt-8 space-y-4">
        <div className="space-y-1.5"><Label>Title</Label><Input required value={form.title} onChange={set("title")} /></div>
        <div className="space-y-1.5"><Label>Description</Label><Textarea rows={5} value={form.description} onChange={set("description")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Venue address</Label><Input value={form.location} onChange={set("location")} /></div>
          <div className="space-y-1.5"><Label>Online link</Label><Input value={form.online_url} onChange={set("online_url")} placeholder="https://…" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Starts</Label><Input type="datetime-local" required value={form.starts_at} onChange={set("starts_at")} /></div>
          <div className="space-y-1.5"><Label>Ends</Label><Input type="datetime-local" required value={form.ends_at} onChange={set("ends_at")} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Timezone</Label><Input value={form.timezone} onChange={set("timezone")} /></div>
          <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" min={1} required value={form.capacity} onChange={set("capacity")} /></div>
        </div>
        <div className="space-y-1.5"><Label>Cover image URL</Label><Input value={form.cover_url} onChange={set("cover_url")} /></div>

        <div className="space-y-1.5">
          <Label>Visibility</Label>
          <div className="flex gap-2">
            <Button type="button" variant={form.visibility === "public" ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, visibility: "public" })}>Public</Button>
            <Button type="button" variant={form.visibility === "unlisted" ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, visibility: "unlisted" })}>Unlisted</Button>
          </div>
        </div>

        <TooltipProvider>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Paid event</div>
              <div className="text-xs text-muted-foreground">Charge attendees for tickets</div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild><span><Switch checked={false} disabled /></span></TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          {form.publish_state === "published" ? (
            <Button type="button" variant="outline" onClick={() => setLifecycle("draft")} disabled={busy}>Unpublish</Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setLifecycle("published")} disabled={busy}>Publish</Button>
          )}
          <Button type="button" variant="outline" onClick={duplicate} disabled={busy}>Duplicate</Button>
          <Button type="button" variant="destructive" onClick={del} disabled={busy}>Delete</Button>
        </div>
      </form>
    </div>
  );
}
