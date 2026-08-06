import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home,
  Users,
  MessageSquare,
  Trophy,
  Code2,
  Bell,
  FileSearch,
  BookOpen,
  Compass,
  Gauge,
  Terminal,
  UserCheck,
  FileEdit,
  Target,
  Briefcase,
  Building2,
  UserCircle2,
  Menu,
  LogOut,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Wordmark } from "./Logo";
import { DarkModeToggle } from "./DarkModeToggle";
import { cn } from "@/lib/utils";
import { signOutFn } from "@/lib/auth.server";
import { invalidateCurrentUser, useCurrentUser } from "@/lib/auth-client";
import { useUnreadNotificationCount } from "@/lib/notifications-client";
import { useConversations } from "@/lib/messages-client";

const itemsBeforeBusiness = [
  { to: "/home", label: "Home", icon: Home, badge: null },
  { to: "/friends", label: "Friends", icon: Users, badge: null },
  { to: "/messages", label: "Messages", icon: MessageSquare, badge: "messages" },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, badge: null },
  { to: "/challenges", label: "Daily Challenges", icon: Code2, badge: null },
  { to: "/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
  { to: "/resume-analyse", label: "Resume Analyse", icon: FileSearch, badge: null },
  { to: "/resume-builder", label: "Resume Builder", icon: FileEdit, badge: null },
  { to: "/career-roadmap", label: "Career Roadmap", icon: Compass, badge: null },
  { to: "/eligibility", label: "Eligibility", icon: Gauge, badge: null },
  { to: "/coding-interview", label: "Coding Interview", icon: Terminal, badge: null },
  { to: "/hr-interview", label: "HR Interview", icon: UserCheck, badge: null },
  { to: "/job-recommendations", label: "Job Matches", icon: Target, badge: null },
  { to: "/job-preparation", label: "Job Prep", icon: BookOpen, badge: null },
  { to: "/apply", label: "Apply", icon: Briefcase, badge: null },
] as const;

const itemsAfterBusiness = [
  { to: "/search", label: "Search", icon: Search, badge: null },
  { to: "/profile", label: "Me", icon: UserCircle2, badge: null },
] as const;

// AppNav only renders for student accounts (company accounts use
// BusinessNav/BusinessShell instead), so this item always needs to point
// non-company users at signup rather than the auth-gated /business
// dashboard - see the matching fix on the home feed's Business card.
function businessItem(isCompany: boolean) {
  return {
    to: isCompany ? "/business" : "/business-signup",
    label: "Business",
    icon: Building2,
    badge: null,
  } as const;
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-medium leading-none text-destructive-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function AppNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: unreadNotifications } = useUnreadNotificationCount(user?.id);
  const { data: conversations } = useConversations(user?.id);
  const unreadMessages = (conversations ?? []).reduce((n, c) => n + c.unreadCount, 0);
  const items = [
    ...itemsBeforeBusiness,
    businessItem(user?.accountType === "company"),
    ...itemsAfterBusiness,
  ];

  const badgeCount = (badge: string | null) =>
    badge === "messages"
      ? unreadMessages
      : badge === "notifications"
        ? (unreadNotifications ?? 0)
        : 0;

  const logout = async () => {
    await signOutFn();
    await invalidateCurrentUser(queryClient);
    await router.invalidate();
    router.navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link to="/home" className="shrink-0">
          <Wordmark />
        </Link>
        <nav className="ml-4 hidden flex-1 items-center gap-0.5 lg:flex">
          {items.map(({ to, label, icon: Icon, badge }) => {
            const active = pathname === to || (to !== "/home" && pathname.startsWith(to));
            const count = badgeCount(badge);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:text-foreground hover:bg-muted",
                  active && "text-foreground bg-muted",
                )}
              >
                <span className="relative inline-flex">
                  <Icon className="h-4 w-4" />
                  <NavBadge count={count} />
                </span>
                <span className="hidden xl:inline">{label}</span>
              </Link>
            );
          })}
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:text-foreground hover:bg-muted",
                pathname.startsWith("/admin") && "text-foreground bg-muted",
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden xl:inline">Admin</span>
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <DarkModeToggle />
          <button
            onClick={logout}
            className="hidden h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm text-muted-foreground transition hover:text-foreground hover:bg-muted lg:inline-flex"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden xl:inline">Log out</span>
          </button>
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
            {items.map(({ to, label, icon: Icon, badge }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <span className="relative inline-flex">
                  <Icon className="h-4 w-4" />
                  <NavBadge count={badgeCount(badge)} />
                </span>
                {label}
              </Link>
            ))}
            {user?.role === "admin" && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ShieldCheck className="h-4 w-4" /> Admin
              </Link>
            )}
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
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
