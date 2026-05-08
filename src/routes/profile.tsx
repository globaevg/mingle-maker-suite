import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ display_name: "", bio: "", avatar_url: "", contact_email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({ display_name: data.display_name ?? "", bio: data.bio ?? "", avatar_url: data.avatar_url ?? "", contact_email: (data as any).contact_email ?? "" });
    });
  }, [user]);

  if (!user) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: form.display_name,
      bio: form.bio || null,
      avatar_url: form.avatar_url || null,
      contact_email: form.contact_email || null,
    } as any).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Your host profile</h1>
        <Link to="/hosts/$id" params={{ id: user.id }} className="text-sm text-accent underline">View public page</Link>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">This is what attendees see when they browse your events.</p>
      <form onSubmit={save} className="mt-8 space-y-4">
        <div className="space-y-1.5"><Label>Display name</Label><Input required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Bio</Label><Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell the community about yourself" /></div>
        <div className="space-y-1.5"><Label>Avatar URL</Label><Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" /></div>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
      </form>
    </div>
  );
}
