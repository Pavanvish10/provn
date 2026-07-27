import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { ArrowLeft, Megaphone, Target, Eye, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireBusinessAccount } from "@/lib/auth-guard";

export const Route = createFileRoute("/business/advertising")({
  beforeLoad: requireBusinessAccount,
  head: () => ({
    meta: [
      { title: "Job Advertising · Provn Business" },
      {
        name: "description",
        content: "Promote open roles to relevant verified candidates on Provn.",
      },
      { property: "og:title", content: "Job Advertising · Provn Business" },
      {
        property: "og:description",
        content: "Reach the right verified candidates for your open roles.",
      },
    ],
  }),
  component: Advertising,
});

function Advertising() {
  return (
    <AppShell>
      <Link
        to="/business"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Business Hub
      </Link>

      <header className="mb-8">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Megaphone className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-3xl tracking-tight">Job Advertising</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Boost open roles across the Provn feed, targeted to candidates with matching verified
          skills.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat
          icon={<Eye className="h-4 w-4 text-brand" />}
          label="Impressions this week"
          value="—"
        />
        <Stat
          icon={<MousePointerClick className="h-4 w-4 text-brand" />}
          label="Clicks"
          value="—"
        />
        <Stat icon={<Target className="h-4 w-4 text-brand" />} label="Verified reach" value="—" />
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <div className="font-display text-xl">No campaigns yet</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Post a job first, then promote it to the right verified candidates.
        </p>
        <Button asChild className="mt-4">
          <Link to="/business/jobs">Post a job</Link>
        </Button>
      </div>
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 font-display text-3xl">{value}</div>
    </div>
  );
}
