import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { useMemo, useState } from "react";
import { ArrowLeft, Globe2, Linkedin, Search, ExternalLink, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CANDIDATES } from "@/lib/mock-data";
import { rankCandidates } from "@/lib/matching";

export const Route = createFileRoute("/business/sourcing")({
  head: () => ({
    meta: [
      { title: "Sourcing · Provn Business" },
      { name: "description", content: "Search Provn's verified candidate pool alongside external signals from LinkedIn and other sites." },
      { property: "og:title", content: "Sourcing · Provn Business" },
      { property: "og:description", content: "Find candidates on Provn and across the web." },
    ],
  }),
  component: Sourcing,
});

const EXTERNAL_SOURCES = [
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, connected: false },
  { id: "github", label: "GitHub", icon: Globe2, connected: false },
  { id: "angellist", label: "Wellfound", icon: Globe2, connected: false },
];

function Sourcing() {
  const [q, setQ] = useState("react typescript nextjs");
  const skills = useMemo(() => q.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean), [q]);
  const ranked = useMemo(() => rankCandidates(CANDIDATES, skills).slice(0, 6), [skills]);

  return (
    <AppShell>
      <Link to="/business" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Business Hub
      </Link>

      <header className="mb-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Globe2 className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-3xl tracking-tight">Sourcing</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Search Provn's verified candidates and enrich results with signals from LinkedIn and other professional sites.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Skills, roles, keywords…" className="border-0 shadow-none focus-visible:ring-0" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Provn · verified candidates
          </div>
          <div className="space-y-2">
            {ranked.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <img src={c.avatar} alt="" className="h-10 w-10 rounded-full bg-muted" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.headline} · {c.location}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {c.verifiedSkills.slice(0, 4).map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl">{Math.round(c.score * 100)}%</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">match</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">External sources</div>
            <ul className="space-y-2">
              {EXTERNAL_SOURCES.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{s.label}</span>
                  <Button size="sm" variant="outline" className="ml-auto h-7">Connect</Button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Connect a source to pull candidate signals in alongside Provn's verified pool.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
              <ExternalLink className="h-3.5 w-3.5" /> Coming soon
            </div>
            Cross-source enrichment: dedupe candidates across LinkedIn, GitHub, and Provn into one ranked view.
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
