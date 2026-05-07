import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Trash2, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/team")({ component: TeamPage });

function TeamPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [role, setRole] = useState<"host" | "checker">("checker");

  if (!loading && !user) { nav({ to: "/login" }); return null; }

  const { data: members } = useQuery({
    queryKey: ["host-members", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_members")
        .select("id, role, created_at, member_user_id, profiles:member_user_id(display_name, avatar_url)")
        .eq("host_owner_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const { data: invites } = useQuery({
    queryKey: ["host-invites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_invites")
        .select("*")
        .eq("host_owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createInvite = async () => {
    const { error } = await supabase.from("host_invites").insert({ host_owner_id: user!.id, role });
    if (error) return toast.error(error.message);
    toast.success("Invite link created");
    qc.invalidateQueries({ queryKey: ["host-invites", user?.id] });
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase.from("host_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Member removed");
    qc.invalidateQueries({ queryKey: ["host-members", user?.id] });
  };

  const revokeInvite = async (id: string) => {
    const { error } = await supabase.from("host_invites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["host-invites", user?.id] });
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Your host team</h1>
      <p className="mt-2 text-muted-foreground">Invite collaborators as <strong>Hosts</strong> (manage events) or <strong>Checkers</strong> (check-in only).</p>

      <section className="mt-8 rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-accent" />
          <h2 className="font-medium">Create invite link</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Select value={role} onValueChange={(v) => setRole(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="host">Host</SelectItem>
              <SelectItem value="checker">Checker</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={createInvite}>Generate link</Button>
        </div>

        <div className="mt-4 space-y-2">
          {invites?.map((i) => {
            const expired = new Date(i.expires_at) < new Date();
            const status = i.used_at ? "used" : expired ? "expired" : "active";
            return (
              <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-accent/15 px-2 py-0.5 text-xs text-accent">{i.role}</span>
                    <span className={`rounded px-2 py-0.5 text-xs ${status === "active" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>{status}</span>
                    <span className="text-xs text-muted-foreground">expires {format(new Date(i.expires_at), "PP")}</span>
                  </div>
                  <div className="mt-1 truncate font-mono text-xs text-muted-foreground">/invite/{i.token}</div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => copyLink(i.token)}><Copy className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => revokeInvite(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            );
          })}
          {invites?.length === 0 && <p className="text-sm text-muted-foreground">No invites yet.</p>}
        </div>
      </section>

      <section className="mt-8 rounded-xl border bg-card p-5">
        <h2 className="font-medium">Team members</h2>
        <div className="mt-3 space-y-2">
          {members?.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <div className="font-medium">{m.profiles?.display_name ?? "Member"}</div>
                <div className="text-xs text-muted-foreground">Joined {format(new Date(m.created_at), "PP")}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-accent/15 px-2 py-0.5 text-xs text-accent">{m.role}</span>
                <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
          {members?.length === 0 && <p className="text-sm text-muted-foreground">No team members yet. Share an invite link above.</p>}
        </div>
      </section>
    </div>
  );
}
