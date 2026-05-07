import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Anchor } from "lucide-react";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <Anchor className="h-5 w-5 text-accent" />
          Gather
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link to="/explore" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Explore</Link>
          {user ? (
            <>
              <Link to="/tickets" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">My tickets</Link>
              <Link to="/my-events" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">My events</Link>
              <Link to="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Dashboard</Link>
              <Link to="/team" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Team</Link>
              <Link to="/reports" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Reports</Link>
              <Link to="/profile" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Profile</Link>
              <Link to="/events/new"><Button size="sm">Host event</Button></Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>Sign out</Button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Sign in</Link>
              <Link to="/signup"><Button size="sm">Get started</Button></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
