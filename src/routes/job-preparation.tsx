import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Code2,
  Database,
  LineChart,
  Brain,
  Server,
  Palette,
  Cloud,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Lock,
  Video,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/job-preparation")({
  head: () => ({
    meta: [
      { title: "Job Preparation · Provn" },
      { name: "description", content: "Pick a target role and get a step-by-step roadmap — from fundamentals to interview." },
      { property: "og:title", content: "Job Preparation · Provn" },
      { property: "og:description", content: "Role-based roadmaps for every technical career track." },
    ],
  }),
  component: JobPrep,
});

type Role = {
  id: string;
  title: string;
  icon: typeof Code2;
  blurb: string;
  weeks: number;
  roadmap: { phase: string; items: string[] }[];
};

const ROLES: Role[] = [
  {
    id: "frontend",
    title: "Frontend Developer",
    icon: Code2,
    blurb: "React, TypeScript, performance, accessibility, design systems.",
    weeks: 10,
    roadmap: [
      { phase: "Foundations", items: ["HTML semantics & a11y", "Modern CSS + Flex/Grid", "TypeScript essentials"] },
      { phase: "React deep-dive", items: ["Hooks & reconciliation", "State: local, server, URL", "Suspense & data loading"] },
      { phase: "Systems & perf", items: ["Bundle & runtime perf", "Design systems w/ Tailwind", "Testing with Vitest + Playwright"] },
      { phase: "Interview prep", items: ["10 UI machine coding rounds", "Frontend system design", "Behavioral & STAR"] },
    ],
  },
  {
    id: "backend",
    title: "Backend Developer",
    icon: Server,
    blurb: "APIs, databases, distributed systems, reliability.",
    weeks: 12,
    roadmap: [
      { phase: "Foundations", items: ["HTTP, REST, idempotency", "SQL & indexing", "Data modelling"] },
      { phase: "Systems", items: ["Caching (Redis)", "Queues & workers", "Auth & rate limiting"] },
      { phase: "Scale", items: ["Sharding & replication", "Observability", "Failure modes"] },
      { phase: "Interview prep", items: ["12 API design drills", "System design rounds", "Behavioral & STAR"] },
    ],
  },
  {
    id: "fullstack",
    title: "Full-stack Developer",
    icon: Sparkles,
    blurb: "Ship end-to-end features across UI, API, and database.",
    weeks: 12,
    roadmap: [
      { phase: "Web fundamentals", items: ["TypeScript everywhere", "React + a modern meta-framework", "Postgres basics"] },
      { phase: "Product engineering", items: ["Auth & billing flows", "File uploads & storage", "Background jobs"] },
      { phase: "Delivery", items: ["CI/CD, previews", "Observability", "Cost & perf tuning"] },
      { phase: "Interview prep", items: ["Product case rounds", "Mixed FE + BE system design", "Behavioral & STAR"] },
    ],
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    icon: LineChart,
    blurb: "SQL, dashboards, experimentation, business storytelling.",
    weeks: 8,
    roadmap: [
      { phase: "Foundations", items: ["Advanced SQL & window fns", "Statistics for analysts", "Excel / Sheets power moves"] },
      { phase: "Tooling", items: ["Tableau or Metabase", "Python (pandas) basics", "dbt & modelling"] },
      { phase: "Impact", items: ["Experiment design (A/B)", "Metric trees & north stars", "Executive-ready dashboards"] },
      { phase: "Interview prep", items: ["10 SQL case interviews", "Product-sense rounds", "Guesstimates & PM cases"] },
    ],
  },
  {
    id: "data-scientist",
    title: "Data Scientist / ML",
    icon: Brain,
    blurb: "Statistics, ML modelling, MLOps, and applied research.",
    weeks: 14,
    roadmap: [
      { phase: "Math & stats", items: ["Linear algebra refresh", "Probability & inference", "Hypothesis testing"] },
      { phase: "ML core", items: ["Regression / trees / boosting", "Deep learning basics", "Evaluation & leakage"] },
      { phase: "Applied", items: ["Feature stores", "MLOps & deployment", "LLM prompting & RAG"] },
      { phase: "Interview prep", items: ["ML system design", "Case studies", "Behavioral & STAR"] },
    ],
  },
  {
    id: "devops",
    title: "DevOps / SRE",
    icon: Cloud,
    blurb: "Cloud, CI/CD, observability, incident response.",
    weeks: 10,
    roadmap: [
      { phase: "Linux & networking", items: ["Bash & scripting", "TCP, DNS, TLS", "Containers 101"] },
      { phase: "Cloud", items: ["AWS or GCP core", "Kubernetes & Helm", "IaC with Terraform"] },
      { phase: "Reliability", items: ["SLIs / SLOs", "Observability stack", "Chaos & incident drills"] },
      { phase: "Interview prep", items: ["Debugging rounds", "Cloud system design", "Behavioral & STAR"] },
    ],
  },
  {
    id: "mobile",
    title: "Mobile Developer",
    icon: Smartphone,
    blurb: "iOS, Android, or React Native — ship shippable apps.",
    weeks: 10,
    roadmap: [
      { phase: "Foundations", items: ["Platform basics", "Navigation & state", "Offline & caching"] },
      { phase: "Product polish", items: ["Animations", "Push & deep links", "Store submission"] },
      { phase: "Perf & QA", items: ["Startup & jank", "Automated tests", "Crash triage"] },
      { phase: "Interview prep", items: ["UI machine coding", "Mobile system design", "Behavioral & STAR"] },
    ],
  },
  {
    id: "designer",
    title: "Product Designer",
    icon: Palette,
    blurb: "UX research, IA, visual craft, and design systems.",
    weeks: 8,
    roadmap: [
      { phase: "Foundations", items: ["UX research basics", "IA & flows", "Typography & layout"] },
      { phase: "Craft", items: ["Design systems in Figma", "Motion & micro-interactions", "Prototyping"] },
      { phase: "Impact", items: ["Metrics-led design", "Design critique", "Stakeholder communication"] },
      { phase: "Interview prep", items: ["Portfolio deep-dives", "App critique rounds", "Whiteboard challenges"] },
    ],
  },
  {
    id: "sql",
    title: "Database / SQL Engineer",
    icon: Database,
    blurb: "Modelling, tuning, warehousing, and analytical SQL.",
    weeks: 8,
    roadmap: [
      { phase: "Foundations", items: ["Relational modelling", "Indexes & execution plans", "Transactions & isolation"] },
      { phase: "Analytics", items: ["Window functions", "Warehousing (Snowflake/BQ)", "dbt & data contracts"] },
      { phase: "Scale", items: ["Sharding & partitioning", "Replication", "Query tuning"] },
      { phase: "Interview prep", items: ["Advanced SQL sets", "Schema design rounds", "Behavioral & STAR"] },
    ],
  },
  {
    id: "security",
    title: "Security Engineer",
    icon: ShieldCheck,
    blurb: "AppSec, cloud security, threat modelling, response.",
    weeks: 12,
    roadmap: [
      { phase: "Foundations", items: ["OWASP Top 10", "AuthN vs AuthZ", "Crypto basics"] },
      { phase: "AppSec", items: ["Threat modelling", "SAST / DAST", "Secure code review"] },
      { phase: "Cloud & IR", items: ["Cloud IAM", "Detection engineering", "Incident response"] },
      { phase: "Interview prep", items: ["Vuln walkthroughs", "Security system design", "Behavioral & STAR"] },
    ],
  },
];

function JobPrep() {
  const s = useAppState();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = ROLES.find((r) => r.id === activeId) ?? null;
  const isPro = s.plan === "pro";

  if (active) {
    return (
      <AppShell>
        <button
          onClick={() => setActiveId(null)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All roles
        </button>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{active.weeks}-week track</div>
            <h1 className="mt-1 font-display text-4xl tracking-tight">{active.title} roadmap</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{active.blurb}</p>
          </div>
          <Link to="/challenges">
            <Button variant="outline">Start today's drill</Button>
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {active.roadmap.map((phase, i) => (
            <div key={phase.phase} className="rounded-2xl border border-border bg-card p-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Phase 0{i + 1}</div>
              <h3 className="mt-1 font-display text-2xl">{phase.phase}</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {phase.items.map((it) => (
                  <li key={it} className="flex items-start gap-2">
                    <Circle className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Premium upgrade */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-brand/40 bg-brand-soft/50">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
            <div className="p-7">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-background px-2.5 py-1 text-xs text-brand">
                <Sparkles className="h-3 w-3" /> Premium roadmap
              </div>
              <h2 className="mt-3 font-display text-3xl tracking-tight">
                Unlock the full {active.title} experience.
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Video lectures for every phase, curated projects, weekly mentor review, and a mock-interview loop calibrated to this role.
              </p>
              <ul className="mt-5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {[
                  { icon: Video, t: "40+ HD video lessons" },
                  { icon: CheckCircle2, t: "Graded projects" },
                  { icon: ShieldCheck, t: "Role-tuned skill verification" },
                  { icon: Sparkles, t: "AI mentor + weekly review" },
                ].map((b) => (
                  <li key={b.t} className="flex items-center gap-2">
                    <b.icon className="h-4 w-4 text-brand" /> {b.t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-border bg-background p-7 lg:border-l lg:border-t-0">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Provn Pro</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl">₹299</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              {isPro ? (
                <>
                  <Button size="lg" className="mt-5 w-full">Start Premium roadmap</Button>
                  <p className="mt-2 text-[11px] text-muted-foreground">You're on Pro — full content is unlocked.</p>
                </>
              ) : (
                <>
                  <Link to="/plan">
                    <Button size="lg" className="mt-5 w-full">
                      <Lock className="mr-2 h-4 w-4" /> Upgrade to unlock
                    </Button>
                  </Link>
                  <p className="mt-2 text-[11px] text-muted-foreground">Cancel any time. Includes every role's premium roadmap.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Job preparation, by role.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Pick your target role. We'll open a step-by-step roadmap and, if you want it, a premium track with video lectures and mentor review.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveId(r.id)}
            className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:border-foreground/20 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <r.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{r.weeks} wk track</div>
                <h3 className="font-display text-xl leading-tight">{r.title}</h3>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{r.blurb}</p>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary">Roadmap</Badge>
              <Badge variant="secondary" className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Premium option
              </Badge>
            </div>
            <div className="mt-5 text-sm font-medium text-brand">View roadmap →</div>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
