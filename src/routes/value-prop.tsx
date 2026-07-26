import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, FileSearch, Briefcase, Map, Mic, Code2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Wordmark } from "@/components/Logo";

export const Route = createFileRoute("/value-prop")({
  head: () => ({
    meta: [
      { title: "Prove Your Skills, Not Just Résumé · Provn" },
      { name: "description", content: "See how Provn helps you learn, verify, prove, and get hired." },
      { property: "og:title", content: "Prove Your Skills, Not Just Résumé · Provn" },
      { property: "og:description", content: "The value of a verified career profile." },
    ],
  }),
  component: ValueProp,
});

const FEATURES = [
  { icon: FileSearch, title: "AI Résumé Analysis", copy: "Get a brutally honest ATS score and rewrite suggestions in under 30 seconds." },
  { icon: Briefcase, title: "Get Hired", copy: "Apply once verified — recruiters see proof of skill, not just claims." },
  { icon: Map, title: "AI Roadmap", copy: "A step‑by‑step plan tuned to your goal role, updated as you progress." },
  { icon: Mic, title: "Mock Interview", copy: "Voice‑driven simulations that grade communication, structure, and depth." },
  { icon: Code2, title: "Coding Challenges", copy: "Daily problems that build a public streak recruiters actually look at." },
  { icon: Sparkles, title: "Personalized Career Path", copy: "One journey — learn, verify, prove, apply — no tab‑hopping." },
];

function ValueProp() {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % FEATURES.length), 3600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/"><Wordmark /></Link>
        <DarkModeToggle />
      </div>
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-7xl grid-cols-1 gap-16 px-6 pb-16 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Step 1 of 4 · Welcome
          </span>
          <h1 className="mt-5 font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Prove Your Skills,<br />
            <span className="italic text-brand">Not Just Résumé.</span>
          </h1>
          <p className="mt-6 max-w-md text-base text-muted-foreground">
            Provn stitches learning, verification, projects, and hiring into one continuous
            journey — so what you can do speaks louder than what you claim.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="h-12 px-6" onClick={() => nav({ to: "/location" })}>
              Continue Your Journey <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="ghost" className="h-12" onClick={() => nav({ to: "/" })}>
              Back to sign in
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
            <div><span className="font-display text-2xl text-foreground">12k+</span> verified</div>
            <div className="h-6 w-px bg-border" />
            <div><span className="font-display text-2xl text-foreground">2.4k</span> hired</div>
            <div className="h-6 w-px bg-border" />
            <div><span className="font-display text-2xl text-foreground">98%</span> would refer</div>
          </div>
        </div>

        {/* Feature carousel */}
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-3xl bg-brand-soft blur-3xl opacity-60" />
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">What you unlock</div>
              <div className="flex gap-1.5">
                {FEATURES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setI(idx)}
                    className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-foreground" : "w-1.5 bg-border"}`}
                    aria-label={`Feature ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-xl border border-border bg-background p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                {(() => { const Icon = FEATURES[i].icon; return <Icon className="h-6 w-6" />; })()}
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-brand">Feature 0{i + 1}</div>
                <div className="mt-1 font-display text-2xl">{FEATURES[i].title}</div>
                <p className="mt-2 text-sm text-muted-foreground">{FEATURES[i].copy}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FEATURES.map((f, idx) => {
                const Icon = f.icon;
                const active = idx === i;
                return (
                  <button
                    key={f.title}
                    onClick={() => setI(idx)}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition ${
                      active ? "border-brand bg-brand-soft text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{f.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
