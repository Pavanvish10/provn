import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, BookOpen, Check, Code2, FileSearch, Mic, ShieldCheck, Sparkles, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Wordmark } from "@/components/Logo";
import { setState } from "@/lib/store";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "How Provn works · Choose your plan" },
      { name: "description", content: "Learn → verify → prove → get hired. Pick Free or Pro to begin." },
      { property: "og:title", content: "How Provn works · Choose your plan" },
      { property: "og:description", content: "See the four‑step journey and pick your starting plan." },
    ],
  }),
  component: PlanPage,
});

const STEPS = [
  { t: "Learn", d: "Roadmap + lessons", icon: BookOpen },
  { t: "Verify", d: "Skill tests", icon: ShieldCheck },
  { t: "Prove", d: "Projects + streak", icon: Sparkles },
  { t: "Get hired", d: "Apply with proof", icon: Code2 },
];

function PlanPage() {
  const nav = useNavigate();
  const [showPro, setShowPro] = useState(false);

  const chooseFree = () => { setState({ plan: "free" }); nav({ to: "/home" }); };
  const chooseProConfirm = () => { setState({ plan: "pro" }); nav({ to: "/home" }); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/"><Wordmark /></Link>
        <DarkModeToggle />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Step 4 of 4 · Plan
        </span>
        <h1 className="mt-5 font-display text-5xl leading-tight tracking-tight sm:text-6xl">
          Here’s how Provn works.
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted-foreground">
          Four steps. One connected journey. Pick a plan and you’re in.
        </p>

        {/* Steps */}
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.t} className="relative rounded-xl border border-border bg-card p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">0{i + 1}</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><s.icon className="h-4 w-4" /></div>
                <div className="font-display text-xl">{s.t}</div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>

        {/* Plans */}
        {!showPro ? (
          <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <PlanCard
              tag="Free"
              price="₹0"
              price_sub="forever"
              title="Continue Free"
              copy="Great for exploring. Enough to prove one skill and get started."
              feats={[
                { on: true, t: "Daily coding challenges" },
                { on: true, t: "2 AI mock interviews" },
                { on: true, t: "2 coding tests" },
                { on: true, t: "2 ATS / résumé analyses" },
                { on: true, t: "AI roadmap (no video lectures)" },
                { on: false, t: "Unlimited mock interviews &amp; tests" },
              ]}
              cta={<Button size="lg" variant="outline" className="w-full" onClick={chooseFree}>Continue Free</Button>}
            />
            <PlanCard
              tag="Pro · Recommended"
              price="₹299"
              price_sub="/ month"
              title="Choose Subscription"
              copy="Everything you need to actually prove your skills and land the role."
              accent
              feats={[
                { on: true, t: "Daily coding challenges" },
                { on: true, t: "Unlimited AI mock interviews" },
                { on: true, t: "Unlimited coding tests" },
                { on: true, t: "ATS rating &amp; résumé AI analysis" },
                { on: true, t: "Full AI roadmap with video lectures" },
              ]}
              cta={
                <Button size="lg" className="w-full" onClick={() => setShowPro(true)}>
                  Go Pro — ₹299 <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-14 overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-1 lg:grid-cols-5">
              <div className="lg:col-span-3 border-b border-border bg-card p-8 lg:border-b-0 lg:border-r">
                <div className="text-xs uppercase tracking-widest text-brand">You’re upgrading to Pro</div>
                <h2 className="mt-2 font-display text-4xl tracking-tight">Everything, unlocked.</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  You can cancel anytime. Access continues until the end of the billing cycle.
                </p>
                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { icon: Mic, t: "Unlimited AI mock interviews" },
                    { icon: Code2, t: "Unlimited coding tests" },
                    { icon: FileSearch, t: "ATS rating &amp; résumé AI analysis" },
                    { icon: Video, t: "Full AI roadmap with video lectures" },
                    { icon: Sparkles, t: "Daily coding challenges" },
                    { icon: ShieldCheck, t: "Verified badges shown to recruiters" },
                  ].map((b) => (
                    <div key={b.t} className="flex items-start gap-3 rounded-lg border border-border p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand"><b.icon className="h-4 w-4" /></div>
                      <span className="text-sm" dangerouslySetInnerHTML={{ __html: b.t }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2 bg-background p-8">
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Provn Pro</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-5xl">₹299</span>
                    <span className="text-sm text-muted-foreground">/ month</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Billed monthly. Cancel anytime.</div>
                  <Button size="lg" className="mt-6 w-full" onClick={chooseProConfirm}>
                    Confirm &amp; enter Provn
                  </Button>
                  <Button variant="ghost" className="mt-2 w-full" onClick={() => setShowPro(false)}>
                    Back to plans
                  </Button>
                  <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                    Mock purchase — no real payment is processed in this demo build.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  tag, price, price_sub, title, copy, feats, cta, accent,
}: {
  tag: string; price: string; price_sub: string; title: string; copy: string;
  feats: { on: boolean; t: string }[]; cta: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`relative rounded-2xl border p-7 ${accent ? "border-brand bg-brand-soft/60" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${accent ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"}`}>{tag}</span>
        <div className="text-right">
          <div className="font-display text-3xl">{price}</div>
          <div className="text-xs text-muted-foreground">{price_sub}</div>
        </div>
      </div>
      <h3 className="mt-6 font-display text-3xl tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
      <ul className="mt-6 space-y-2 text-sm">
        {feats.map((f) => (
          <li key={f.t} className="flex items-start gap-2">
            {f.on ? (
              <Check className="mt-0.5 h-4 w-4 text-brand shrink-0" />
            ) : (
              <X className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className={f.on ? "" : "text-muted-foreground line-through"} dangerouslySetInnerHTML={{ __html: f.t }} />
          </li>
        ))}
      </ul>
      <div className="mt-8">{cta}</div>
    </div>
  );
}
