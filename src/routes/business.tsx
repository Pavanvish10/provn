import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { Briefcase, Megaphone, Sparkles, TrendingUp, Globe2, ArrowRight, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "Business Hub · Provn" },
      { name: "description", content: "Post jobs, run outreach, and hire skill-verified candidates on Provn." },
      { property: "og:title", content: "Business Hub · Provn" },
      { property: "og:description", content: "A lightweight ATS built on verified skills." },
    ],
  }),
  component: BusinessHub,
});

const OPTIONS = [
  {
    to: "/business/hiring" as const,
    icon: Briefcase,
    title: "Job Hiring",
    desc: "Post a role and get candidates ranked by verified-skill match tiers.",
    badge: "Core",
  },
  {
    to: "/business/advertising" as const,
    icon: Megaphone,
    title: "Job Advertising",
    desc: "Promote open roles to relevant verified candidates across Provn.",
  },
  {
    to: "/business/marketing" as const,
    icon: Sparkles,
    title: "Marketing",
    desc: "Build your company brand in front of the student & early-career community.",
  },
  {
    to: "/business/sales" as const,
    icon: TrendingUp,
    title: "Sales",
    desc: "Outreach tools to grow your business on-platform.",
  },
  {
    to: "/business/sourcing" as const,
    icon: Globe2,
    title: "Other · Sourcing",
    desc: "Pull candidate signals from LinkedIn and external professional sites.",
  },
];

function BusinessHub() {
  return (
    <AppShell>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" /> For companies & recruiters
          </div>
          <h1 className="mt-3 font-display text-4xl tracking-tight">Business Hub</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Skip the resume pile. Post a role, and Provn ranks candidates by how well their
            <span className="text-foreground"> verified skills </span> match your requirements — not just keywords.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OPTIONS.map((o) => (
          <Link
            key={o.to}
            to={o.to}
            className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition hover:border-brand/60 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <o.icon className="h-5 w-5" />
              </div>
              {o.badge && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-brand">
                  {o.badge}
                </span>
              )}
            </div>
            <div className="mt-4 font-display text-xl">{o.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand">
              Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
