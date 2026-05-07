import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/invite/$token")({ component: InvitePage });

function InvitePage() {
  const { token } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invite", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const accept = async () => {
    if (!user) { nav({ to: "/login" }); return; }
    const { error } = await supabase.rpc("accept_host_invite", { _token: token });
    if (error) return toast.error(error.message);
    toast.success("You've joined the host team!");
    nav({ to: "/dashboard" });
  };

  if (isLoading) return <div className="container mx-auto max-w-lg px-4 py-16">Loading…</div>;
  if (!data) return <div className="container mx-auto max-w-lg px-4 py-16"><h1 className="font-display text-2xl font-semibold">Invite not found</h1><p className="mt-2 text-muted-foreground">This invite link is invalid.</p></div>;

  const expired = new Date(data.expires_at) < new Date();
  const used = !!data.used_at;

  return (
    <div className="container mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border bg-card p-8">
        <h1 className="font-display text-2xl font-semibold">Host team invitation</h1>
        <p className="mt-3 text-muted-foreground">
          <span className="font-medium text-foreground">{data.host_name}</span> invited you to join their team as a{" "}
          <span className="rounded bg-accent/15 px-2 py-0.5 text-accent">{data.role}</span>.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {data.role === "host"
            ? "Hosts can manage events, view dashboards, and check attendees in."
            : "Checkers can run check-in for any event under this host."}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Expires {format(new Date(data.expires_at), "PPP")}</p>

        {used && <div className="mt-4 rounded-lg bg-muted p-3 text-sm">This invite has already been used.</div>}
        {expired && !used && <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">This invite has expired.</div>}

        <div className="mt-6 flex gap-2">
          {!user ? (
            <>
              <Link to="/login"><Button>Sign in to accept</Button></Link>
              <Link to="/signup"><Button variant="outline">Create account</Button></Link>
            </>
          ) : (
            <Button onClick={accept} disabled={used || expired}>Accept invite</Button>
          )}
        </div>
      </div>
    </div>
  );
}
