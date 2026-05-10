import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="group flex items-center gap-2.5 font-display text-xl font-bold tracking-tight">
          <span
            aria-hidden
            className="relative grid h-8 w-8 place-items-center rounded-xl bg-gradient-hero text-primary-foreground shadow-elegant ring-1 ring-border/40 transition-transform group-hover:-rotate-3 group-hover:scale-105"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="8" r="2.2" />
              <circle cx="18" cy="8" r="2.2" />
              <circle cx="12" cy="16" r="2.2" />
              <path d="M7.6 9.4l3 5M16.4 9.4l-3 5" />
            </svg>
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_0_2px_hsl(var(--background))]" />
          </span>
          <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Gather</span>
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
