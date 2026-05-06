import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/events/new")({ component: NewEventPage });

function NewEventPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", location: "",
    starts_at: "", ends_at: "", capacity: 50, cover_url: "",
  });
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !user) { nav({ to: "/login" }); return null; }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase.from("events").insert({
      host_id: user.id,
      title: form.title,
      description: form.description,
      location: form.location,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      capacity: Number(form.capacity),
      cover_url: form.cover_url || null,
    }).select().single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Event created!");
    nav({ to: "/events/$id", params: { id: data.id } });
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold">Host an event</h1>
      <p className="mt-2 text-sm text-muted-foreground">Free for the community. RSVPs and tickets included.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="space-y-1.5"><Label>Title</Label><Input required value={form.title} onChange={set("title")} /></div>
        <div className="space-y-1.5"><Label>Description</Label><Textarea rows={5} value={form.description} onChange={set("description")} /></div>
        <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={set("location")} placeholder="123 Main St, or Zoom link" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Starts</Label><Input type="datetime-local" required value={form.starts_at} onChange={set("starts_at")} /></div>
          <div className="space-y-1.5"><Label>Ends</Label><Input type="datetime-local" required value={form.ends_at} onChange={set("ends_at")} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" min={1} required value={form.capacity} onChange={set("capacity")} /></div>
          <div className="space-y-1.5"><Label>Cover image URL (optional)</Label><Input value={form.cover_url} onChange={set("cover_url")} placeholder="https://…" /></div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Creating…" : "Publish event"}</Button>
      </form>
    </div>
  );
}
