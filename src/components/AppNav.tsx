import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Users,
  MessageSquare,
  Trophy,
  Code2,
  Bell,
  FileSearch,
  BookOpen,
  Briefcase,
  Building2,
  UserCircle2,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { Wordmark } from "./Logo";
import { DarkModeToggle } from "./DarkModeToggle";
import { cn } from "@/lib/utils";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/challenges", label: "Challenges", icon: Code2 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/resume-analyse", label: "Resume Analyse", icon: FileSearch },
  { to: "/job-preparation", label: "Job Prep", icon: BookOpen },
  { to: "/apply", label: "Apply", icon: Briefcase },
  { to: "/business", label: "Business", icon: Building2 },
  { to: "/profile", label: "Me", icon: UserCircle2 },
] as const;

export function AppNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link to="/home" className="shrink-0"><Wordmark /></Link>
        <nav className="ml-4 hidden flex-1 items-center gap-0.5 lg:flex">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/home" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:text-foreground hover:bg-muted",
                  active && "text-foreground bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden xl:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <DarkModeToggle />
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-1 p-3 sm:grid-cols-3">
            {items.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
