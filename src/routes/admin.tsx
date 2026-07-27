import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Users,
  Building2,
  Briefcase,
  Code2,
  Map,
  Crown,
  Bell,
  Flag,
  BarChart3,
  ArrowRight,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { requireAdmin } from "@/lib/auth-guard";
import { useAdminOverviewStats } from "@/lib/admin-overview-client";

export const Route = createFileRoute("/admin")({
  beforeLoad: requireAdmin,
  head: () => ({
    meta: [
      { title: "Admin · Provn" },
      {
        name: "description",
        content: "Provn admin panel — users, companies, jobs, content, and moderation.",
      },
    ],
  }),
  component: AdminHub,
});

const SECTIONS = [
  {
    to: "/admin/users" as const,
    icon: Users,
    title: "Manage Users",
    desc: "Search profiles, ban/unban, and change roles.",
  },
  {
    to: "/admin/companies" as const,
    icon: Building2,
    title: "Manage Companies",
    desc: "Verify companies and suspend a company's open jobs.",
  },
  {
    to: "/admin/jobs" as const,
    icon: Briefcase,
    title: "Manage Jobs",
    desc: "Pause, reopen, close, or delete any job posting.",
  },
  {
    to: "/admin/challenges" as const,
    icon: Code2,
    title: "Manage Challenges",
    desc: "Full CRUD on coding challenges and their test cases.",
  },
  {
    to: "/admin/roadmaps" as const,
    icon: Map,
    title: "Manage Roadmaps",
    desc: "Full CRUD on role roadmap templates and steps.",
  },
  {
    to: "/admin/premium" as const,
    icon: Crown,
    title: "Manage Premium",
    desc: "Grant or revoke premium access for a user.",
  },
  {
    to: "/admin/notifications" as const,
    icon: Bell,
    title: "Manage Notifications",
    desc: "Send a system notification to a specific user.",
  },
  {
    to: "/admin/reports" as const,
    icon: Flag,
    title: "Reports & Moderation",
    desc: "Review reports, moderate posts and comments.",
  },
  {
    to: "/admin/analytics" as const,
    icon: BarChart3,
    title: "Analytics",
    desc: "Real platform-wide counts, trends, and revenue estimate.",
  },
];

function AdminHub() {
  const { data: stats, isLoading } = useAdminOverviewStats();

  return (
    <AppShell>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Admin only
          </div>
          <h1 className="mt-3 font-display text-4xl tracking-tight">Admin Panel</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage users, companies, jobs, content, and moderation across Provn.
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatTile label="Users" value={stats?.totalUsers} loading={isLoading} />
        <StatTile label="Banned" value={stats?.bannedUsers} loading={isLoading} />
        <StatTile label="Open reports" value={stats?.openReports} loading={isLoading} />
        <StatTile
          label="Unverified companies"
          value={stats?.unverifiedCompanies}
          loading={isLoading}
        />
        <StatTile label="Active challenges" value={stats?.activeChallenges} loading={isLoading} />
        <StatTile label="Open jobs" value={stats?.openJobs} loading={isLoading} />
        <StatTile label="Premium users" value={stats?.premiumSubscribers} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition hover:border-brand/60 hover:shadow-sm"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="mt-4 font-display text-xl">{s.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand">
              Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

function StatTile({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-2xl">{loading ? "—" : (value ?? 0)}</div>
    </div>
  );
}
