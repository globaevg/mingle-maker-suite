import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

export const Route = createFileRoute("/events/new")({ component: NewEventPage });

function NewEventPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", location: "", online_url: "",
    starts_at: "", ends_at: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    capacity: 50, cover_url: "",
    visibility: "public" as "public" | "unlisted",
    is_paid: false,
  });
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !user) { nav({ to: "/login" }); return null; }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const save = async (publish: boolean) => {
    if (!user) return;
    if (!form.title || !form.starts_at || !form.ends_at) {
      return toast.error("Title, start, and end are required");
    }
    setSubmitting(true);
    const { data, error } = await supabase.from("events").insert({
      host_id: user.id,
      title: form.title,
      description: form.description,
      location: form.location,
      online_url: form.online_url || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      timezone: form.timezone,
      capacity: Number(form.capacity),
      cover_url: form.cover_url || null,
      visibility: form.visibility,
      publish_state: publish ? "published" : "draft",
      is_paid: false,
    } as any).select().single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(publish ? "Event published!" : "Draft saved");
    nav({ to: "/events/$id", params: { id: data.id } });
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold">Host an event</h1>
      <p className="mt-2 text-sm text-muted-foreground">Free for the community. Save as draft or publish now.</p>
      <form onSubmit={(e) => { e.preventDefault(); save(true); }} className="mt-8 space-y-4">
        <div className="space-y-1.5"><Label>Title</Label><Input required value={form.title} onChange={set("title")} /></div>
        <div className="space-y-1.5"><Label>Description</Label><Textarea rows={5} value={form.description} onChange={set("description")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Venue address</Label><Input value={form.location} onChange={set("location")} placeholder="123 Main St" /></div>
          <div className="space-y-1.5"><Label>Online link (optional)</Label><Input value={form.online_url} onChange={set("online_url")} placeholder="https://meet…" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Starts</Label><Input type="datetime-local" required value={form.starts_at} onChange={set("starts_at")} /></div>
          <div className="space-y-1.5"><Label>Ends</Label><Input type="datetime-local" required value={form.ends_at} onChange={set("ends_at")} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Timezone</Label><Input value={form.timezone} onChange={set("timezone")} placeholder="UTC" /></div>
          <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" min={1} required value={form.capacity} onChange={set("capacity")} /></div>
        </div>
        <div className="space-y-1.5"><Label>Cover image URL (optional)</Label><Input value={form.cover_url} onChange={set("cover_url")} placeholder="https://…" /></div>

        <div className="space-y-1.5">
          <Label>Visibility</Label>
          <div className="flex gap-2">
            <Button type="button" variant={form.visibility === "public" ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, visibility: "public" })}>Public</Button>
            <Button type="button" variant={form.visibility === "unlisted" ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, visibility: "unlisted" })}>Unlisted (link only)</Button>
          </div>
        </div>

        <TooltipProvider>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Paid event</div>
              <div className="text-xs text-muted-foreground">Charge attendees for tickets</div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span><Switch checked={false} disabled /></span>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="button" variant="outline" disabled={submitting || loading || !user} onClick={() => save(false)}>Save Draft</Button>
          <Button type="submit" disabled={submitting || loading || !user}>{submitting ? "Saving…" : loading ? "Loading…" : "Publish"}</Button>
        </div>
      </form>
    </div>
  );
}
