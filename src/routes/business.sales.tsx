import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireBusinessAccount } from "@/lib/auth-guard";

export const Route = createFileRoute("/business/sales")({
  beforeLoad: requireBusinessAccount,
  head: () => ({
    meta: [
      { title: "Sales · Provn Business" },
      { name: "description", content: "Outreach tools to grow your business on Provn." },
      { property: "og:title", content: "Sales · Provn Business" },
      {
        property: "og:description",
        content: "Outreach, pipelines, and lead tools for the Provn community.",
      },
    ],
  }),
  component: Sales,
});

function Sales() {
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
          <TrendingUp className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-3xl tracking-tight">Sales</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Reach decision-makers and grow your presence on Provn with structured outreach.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { t: "Lead lists", d: "Segment by verified skill, seniority, and location." },
          { t: "Message sequences", d: "Multi-touch outreach with reply tracking." },
          { t: "Warm intros", d: "Discover mutual connections across the community." },
          { t: "Pipeline board", d: "Track deals from first contact to close." },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-border bg-card p-5">
            <div className="font-display text-lg">{c.t}</div>
            <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
            <Button variant="outline" size="sm" className="mt-3">
              Join waitlist
            </Button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
