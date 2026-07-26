import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { AVATARS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Flame, MapPin, Link as LinkIcon, Github, Linkedin, Plus, ShieldCheck, Sparkles, Check } from "lucide-react";
import { useState } from "react";
import { useAppState, setState } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My profile · Provn" },
      { name: "description", content: "Your public Provn profile — verified skills, projects, and streak." },
      { property: "og:title", content: "My profile · Provn" },
      { property: "og:description", content: "Proof of skill, in one place." },
    ],
  }),
  component: Me,
});

const SKILLS_CATALOG = ["Python", "SQL", "System Design", "Figma", "Rust", "Go", "AWS", "Kubernetes", "GraphQL"];

function Me() {
  const s = useAppState();
  const [addOpen, setAddOpen] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const beginTest = (skill: string) => setTesting(skill);
  const passTest = () => {
    if (!testing) return;
    setState({ verifiedSkills: Array.from(new Set([...s.verifiedSkills, testing])) });
    setTesting(null);
    setAddOpen(false);
  };

  return (
    <AppShell>
      {/* Cover */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft to-background p-6 sm:p-10">
        <div className="absolute inset-0 grid-dots opacity-50" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 sm:flex sm:flex-wrap">
          <div className="flex min-w-0 items-start gap-5">
            <div className="shrink-0">
              <img src={AVATARS[0]} className="h-24 w-24 rounded-full border-4 border-background bg-muted" alt="" />
              <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs">
                <Flame className="h-3 w-3 text-brand" /> {s.streak} day streak
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-4xl tracking-tight">{s.name || "Aarav Kulkarni"}</h1>
              <div className="mt-1 text-sm text-muted-foreground">Full‑stack engineer · building things that ship</div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {s.location || "Bengaluru, India"}</span>
                <a className="inline-flex items-center gap-1 hover:text-foreground" href="#"><Github className="h-3.5 w-3.5" /> github.com/you</a>
                <a className="inline-flex items-center gap-1 hover:text-foreground" href="#"><Linkedin className="h-3.5 w-3.5" /> linkedin.com/in/you</a>
                <a className="inline-flex items-center gap-1 hover:text-foreground" href="#"><LinkIcon className="h-3.5 w-3.5" /> portfolio.you</a>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline">Edit profile</Button>
            <Button>Share profile</Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Section title="About">
            <p className="text-sm leading-relaxed text-muted-foreground">
              CS senior at BITS Pilani. I like turning fuzzy problems into shipped products. Currently
              obsessed with dev‑tools, fast UIs, and building on the edge. Open to full‑time roles from
              May 2026 — remote or Bengaluru.
            </p>
          </Section>

          <Section title="Experience">
            <Timeline
              items={[
                { role: "SWE Intern", org: "Northwind AI", period: "May–Aug 2025", d: "Built a fraud‑detection pipeline; cut false positives by 34%." },
                { role: "Open Source", org: "TanStack Router", period: "2024 — present", d: "Docs + 6 merged PRs on the router core." },
                { role: "Founder", org: "Notes for Nine", period: "2023 – 2024", d: "Sold a study‑notes app to 3k paying students." },
              ]}
            />
          </Section>

          <Section title="Education">
            <Timeline
              items={[
                { role: "B.E. Computer Science", org: "BITS Pilani", period: "2022 – 2026", d: "GPA 8.9 · TA for Data Structures." },
              ]}
            />
          </Section>

          <Section title="Projects">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { t: "Ledger.dev", d: "Realtime double‑entry accounting for indie hackers.", tag: "React · Postgres" },
                { t: "Rooma", d: "AI room designer that respects your existing furniture.", tag: "Next.js · Diffusion" },
              ].map((p) => (
                <div key={p.t} className="rounded-xl border border-border bg-card p-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{p.tag}</div>
                  <div className="font-display text-lg">{p.t}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Verified skills */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand" />
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Verified skills</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {s.verifiedSkills.map((sk) => (
                <Badge key={sk} className="gap-1 bg-brand-soft text-foreground hover:bg-brand-soft">
                  <Check className="h-3 w-3 text-brand" /> {sk}
                </Badge>
              ))}
              {s.verifiedSkills.length === 0 && (
                <span className="text-xs text-muted-foreground">None yet. Add your first skill →</span>
              )}
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add skill
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Plan</div>
            <div className="font-display text-2xl">{s.plan === "pro" ? "Provn Pro" : "Free"}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {s.plan === "pro" ? "You have full access to every feature." : "Upgrade to unlock full challenges &amp; roadmap videos."}
            </p>
          </div>
        </aside>
      </div>

      {/* Add skill modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Add a verified skill</DialogTitle>
            <DialogDescription>Pick a skill, pass the short test, and it appears on your profile.</DialogDescription>
          </DialogHeader>
          {!testing ? (
            <>
              <Input placeholder="Search skills…" value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border">
                {SKILLS_CATALOG
                  .filter((sk) => !s.verifiedSkills.includes(sk) && sk.toLowerCase().includes(q.toLowerCase()))
                  .map((sk) => (
                    <button
                      key={sk}
                      onClick={() => beginTest(sk)}
                      className="flex w-full items-center justify-between border-b border-border p-3 text-left text-sm hover:bg-muted last:border-b-0"
                    >
                      <span>{sk}</span>
                      <span className="text-xs text-brand">Take test →</span>
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <SkillTest skill={testing} onPass={passTest} onCancel={() => setTesting(null)} />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 font-display text-xl">{title}</h2>
      {children}
    </div>
  );
}
function Timeline({ items }: { items: { role: string; org: string; period: string; d: string }[] }) {
  return (
    <ol className="relative space-y-6 border-l border-border pl-5">
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <div className="font-medium">{it.role}</div>
            <div className="text-sm text-muted-foreground">· {it.org}</div>
            <div className="ml-auto text-xs text-muted-foreground">{it.period}</div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{it.d}</p>
        </li>
      ))}
    </ol>
  );
}

function SkillTest({ skill, onPass, onCancel }: { skill: string; onPass: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const questions = [
    `Which of the following best describes core idioms in ${skill}?`,
    `Given a tricky ${skill} scenario, what is the correct trade‑off?`,
    `Pick the most idiomatic ${skill} solution.`,
  ];
  const opts = ["Approach A", "Approach B — idiomatic", "Approach C", "Approach D"];
  const [picked, setPicked] = useState<number | null>(null);

  const next = () => {
    if (step + 1 >= questions.length) { onPass(); return; }
    setStep(step + 1); setPicked(null);
  };
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-brand" /> {skill} · Question {step + 1}/{questions.length}
      </div>
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="text-sm font-medium">{questions[step]}</div>
        <div className="mt-3 space-y-2">
          {opts.map((o, i) => (
            <button
              key={i}
              onClick={() => setPicked(i)}
              className={`w-full rounded-lg border p-3 text-left text-sm transition ${picked === i ? "border-brand bg-brand-soft" : "border-border hover:bg-muted"}`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button disabled={picked === null} onClick={next}>
          {step + 1 === questions.length ? "Finish & verify" : "Next"}
        </Button>
      </div>
    </div>
  );
}
