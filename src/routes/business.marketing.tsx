import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/business/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing · Provn Business" },
      { name: "description", content: "Promote your company brand to the Provn student & early-career community." },
      { property: "og:title", content: "Marketing · Provn Business" },
      { property: "og:description", content: "Build brand affinity with the next wave of talent." },
    ],
  }),
  component: Marketing,
});

function Marketing() {
  return (
    <AppShell>
      <Link to="/business" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Business Hub
      </Link>

      <header className="mb-8">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-3xl tracking-tight">Marketing</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Get in front of thousands of verified builders. Company pages, sponsored posts, and event pushes — coming soon.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { t: "Company page", d: "A verified profile for your company on Provn." },
          { t: "Sponsored feed posts", d: "Native posts targeted to candidates by verified skill." },
          { t: "Event pushes", d: "Promote hackathons, campus visits, and info-sessions." },
          { t: "Newsletter placements", d: "Feature in the weekly Provn digest." },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-border bg-card p-5">
            <div className="font-display text-lg">{c.t}</div>
            <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
            <Button variant="outline" size="sm" className="mt-3">Request early access</Button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
