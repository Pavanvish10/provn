import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Menu, LogOut } from "lucide-react";
import { useState } from "react";

import { Wordmark } from "./Logo";
import { DarkModeToggle } from "./DarkModeToggle";
import { cn } from "@/lib/utils";
import { signOutFn } from "@/lib/auth.server";
import { invalidateCurrentUser } from "@/lib/auth-client";

// Mirrors BusinessShell (src/components/BusinessNav.tsx) exactly — same
// shell/nav pattern, scoped to the single /college dashboard route since
// Sprint 26's college portal doesn't need a multi-page nav (drive detail
// is reached by clicking into a drive from the dashboard, not a separate
// top-level section).
const SECTIONS = [
  { to: "/college", label: "Dashboard", icon: LayoutDashboard, exact: true },
] as const;

function isActive(pathname: string, to: string, exact?: boolean) {
  return exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
}

export function CollegeShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const logout = async () => {
    await signOutFn();
    await invalidateCurrentUser(queryClient);
    await router.invalidate();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border"
          aria-label="Menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link to="/college">
          <Wordmark />
        </Link>
        <div className="ml-auto">
          <DarkModeToggle />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-64 shrink-0 border-r border-border bg-background transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col p-4">
            <div className="hidden items-center justify-between px-2 pb-4 lg:flex">
              <Link to="/college">
                <Wordmark />
              </Link>
              <DarkModeToggle />
            </div>
            <div className="mb-2 px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              College
            </div>
            <nav className="flex-1 space-y-0.5">
              {SECTIONS.map((s) => {
                const active = isActive(pathname, s.to, s.exact);
                return (
                  <Link
                    key={s.to}
                    to={s.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                      active && "bg-muted font-medium text-foreground",
                    )}
                  >
                    <s.icon className="h-4 w-4" /> {s.label}
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={logout}
              className="mt-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </aside>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-20 bg-background/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
