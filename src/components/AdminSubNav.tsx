import { Link, useRouterState } from "@tanstack/react-router";
import {
  Users,
  Building2,
  Briefcase,
  Code2,
  Map,
  Crown,
  Bell,
  Flag,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const ADMIN_SECTIONS = [
  { to: "/admin/users" as const, label: "Users", icon: Users },
  { to: "/admin/companies" as const, label: "Companies", icon: Building2 },
  { to: "/admin/jobs" as const, label: "Jobs", icon: Briefcase },
  { to: "/admin/challenges" as const, label: "Challenges", icon: Code2 },
  { to: "/admin/roadmaps" as const, label: "Roadmaps", icon: Map },
  { to: "/admin/premium" as const, label: "Premium", icon: Crown },
  { to: "/admin/notifications" as const, label: "Notifications", icon: Bell },
  { to: "/admin/reports" as const, label: "Reports & Moderation", icon: Flag },
  { to: "/admin/analytics" as const, label: "Analytics", icon: BarChart3 },
];

export function AdminSubNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mb-6 -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-2">
      <Link
        to="/admin"
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition",
          pathname === "/admin"
            ? "border-foreground bg-foreground text-background"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5" /> Overview
      </Link>
      {ADMIN_SECTIONS.map((s) => {
        const active = pathname.startsWith(s.to);
        return (
          <Link
            key={s.to}
            to={s.to}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition",
              active
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <s.icon className="h-3.5 w-3.5" /> {s.label}
          </Link>
        );
      })}
    </div>
  );
}
