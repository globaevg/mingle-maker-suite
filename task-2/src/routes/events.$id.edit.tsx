import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/events/$id/edit")({ component: EditEventPage });

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
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    supabase.from("events").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error || !data) { toast.error("Event not found"); nav({ to: "/" }); return; }
      if (user && data.host_id !== user.id) { toast.error("You can't edit this event"); nav({ to: "/events/$id", params: { id } }); return; }
      setForm({
        title: data.title, description: data.description, location: data.location,
        starts_at: toLocal(data.starts_at), ends_at: toLocal(data.ends_at),
        capacity: data.capacity, cover_url: data.cover_url ?? "",
      });
    });
  }, [id, user, nav]);

  if (!form) return <div className="container mx-auto max-w-2xl px-4 py-12">Loading…</div>;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("events").update({
      title: form.title, description: form.description, location: form.location,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      capacity: Number(form.capacity),
      cover_url: form.cover_url || null,
    }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Event updated");
    nav({ to: "/events/$id", params: { id } });
  };

  const del = async () => {
    if (!confirm("Delete this event? RSVPs will be removed.")) return;
    setDeleting(true);
    const { error } = await supabase.from("events").delete().eq("id", id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Event deleted");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold">Edit event</h1>
      <form onSubmit={save} className="mt-8 space-y-4">
        <div className="space-y-1.5"><Label>Title</Label><Input required value={form.title} onChange={set("title")} /></div>
        <div className="space-y-1.5"><Label>Description</Label><Textarea rows={5} value={form.description} onChange={set("description")} /></div>
        <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={set("location")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Starts</Label><Input type="datetime-local" required value={form.starts_at} onChange={set("starts_at")} /></div>
          <div className="space-y-1.5"><Label>Ends</Label><Input type="datetime-local" required value={form.ends_at} onChange={set("ends_at")} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" min={1} required value={form.capacity} onChange={set("capacity")} /></div>
          <div className="space-y-1.5"><Label>Cover image URL</Label><Input value={form.cover_url} onChange={set("cover_url")} /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          <Button type="button" variant="destructive" onClick={del} disabled={deleting}>{deleting ? "Deleting…" : "Delete event"}</Button>
        </div>
      </form>
    </div>
  );
}
