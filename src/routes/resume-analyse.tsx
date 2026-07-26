import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileSearch, Sparkles, ArrowRight, Check, AlertTriangle, ShieldCheck, Briefcase } from "lucide-react";
import { setState } from "@/lib/store";

export const Route = createFileRoute("/resume-analyse")({
  head: () => ({
    meta: [
      { title: "AI Résumé Analysis · Provn" },
      { name: "description", content: "Match your résumé to a specific job description for an ATS score, gap analysis, and rewrites." },
      { property: "og:title", content: "AI Résumé Analysis · Provn" },
      { property: "og:description", content: "Score. Rewrite. Ship a better résumé in minutes." },
    ],
  }),
  component: Resume,
});

type Result = {
  score: number;
  strengths: string[];
  gaps: string[];
  rewrite: string[];
};

function Resume() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [jd, setJd] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const jdReady = jd.trim().length >= 40;
  const canRun = !!fileName && jdReady && !running;

  const analyse = () => {
    setRunning(true);
    setProgress(0);
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(t);
          setRunning(false);
          setResult({
            score: 78,
            strengths: [
              "Clear project impact statements with measurable outcomes",
              "Modern stack (React, TypeScript, Postgres) matches the JD",
              "Solid open‑source contributions section",
            ],
            gaps: [
              "JD emphasises system design — add 1 line on scale you've handled",
              "Missing quantified metrics on internship at Northwind",
              "Skill list is too long — recruiters skim the top 8",
            ],
            rewrite: [
              "Replace ‘Responsible for building X’ → ‘Shipped X, cutting p95 by 40%’",
              "Lead with the project closest to this JD, not education",
              "Add a one‑line link to your Provn verified profile",
            ],
          });
          setState({ verification: { ...JSON.parse(localStorage.getItem("provn.state.v1") || "{}").verification ?? {}, resume: true } });
          return 100;
        }
        return p + 8;
      });
    }, 120);
  };

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-tight">AI Résumé Analysis</h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Upload a PDF or DOCX <b>and</b> paste the job description. We score your fit against that specific role, not a generic template.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          {/* Step 1 - Resume */}
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${fileName ? "bg-brand text-brand-foreground" : "bg-muted text-foreground"}`}>1</span>
            Résumé
          </div>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background p-8 text-center transition hover:border-brand hover:bg-brand-soft/40">
            <Upload className="h-7 w-7 text-muted-foreground" />
            <div className="mt-3 text-sm font-medium">{fileName ?? "Drop your résumé here"}</div>
            <div className="text-xs text-muted-foreground">PDF or DOCX · up to 5 MB</div>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>

          {/* Step 2 - JD */}
          <div className="mt-6 mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${jdReady ? "bg-brand text-brand-foreground" : "bg-muted text-foreground"}`}>2</span>
            Job description <span className="ml-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">Required</span>
          </div>
          <Textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here — role, responsibilities, required skills, nice-to-haves…"
            className="min-h-[160px] resize-y"
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{jd.trim().length} characters</span>
            {!jdReady && <span>Min 40 characters to enable analysis</span>}
          </div>

          <Button
            className="mt-5 w-full"
            size="lg"
            disabled={!canRun}
            onClick={analyse}
          >
            {running ? "Analysing…" : (<><Sparkles className="mr-2 h-4 w-4" /> Analyse résumé vs JD</>)}
          </Button>
          {!fileName && <p className="mt-2 text-center text-[11px] text-muted-foreground">Upload a résumé to continue</p>}
          {fileName && !jdReady && <p className="mt-2 text-center text-[11px] text-muted-foreground">Paste the job description to enable analysis</p>}
          {running && <Progress value={progress} className="mt-4" />}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          {!result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <FileSearch className="h-8 w-8 text-muted-foreground" />
              <div className="mt-3 font-display text-xl">Your report will appear here</div>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Résumé + JD in. ATS score, matched strengths, gaps against the JD, and specific rewrite prompts out.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4">
                <ScoreRing score={result.score} />
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">JD match score</div>
                  <div className="font-display text-4xl">{result.score}/100</div>
                  <div className="text-sm text-muted-foreground">Good fit — a few tweaks away from great.</div>
                </div>
              </div>
              <Section title="What's working" icon={<Check className="h-4 w-4 text-brand" />}>
                <ul className="space-y-2 text-sm">
                  {result.strengths.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {t}</li>)}
                </ul>
              </Section>
              <Section title="Gaps vs this JD" icon={<AlertTriangle className="h-4 w-4 text-warning" />}>
                <ul className="space-y-2 text-sm">
                  {result.gaps.map((t) => <li key={t} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> {t}</li>)}
                </ul>
              </Section>
              <Section title="Suggested rewrites" icon={<Sparkles className="h-4 w-4 text-brand" />}>
                <ul className="space-y-2 text-sm">
                  {result.rewrite.map((t) => <li key={t} className="flex gap-2"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {t}</li>)}
                </ul>
              </Section>

              {/* Verify Skills CTA */}
              <div className="mt-8 rounded-xl border border-brand/40 bg-brand-soft/60 p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-brand" />
                  <div className="font-semibold">Next: Verify your skills</div>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  A great résumé opens the door — verified skills close the offer. Run the same technical test + AI mock interview we use for the Apply flow.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/apply">
                    <Button size="lg">
                      <ShieldCheck className="mr-2 h-4 w-4" /> Verify your skills
                    </Button>
                  </Link>
                  <Link to="/apply">
                    <Button size="lg" variant="outline">
                      <Briefcase className="mr-2 h-4 w-4" /> Go to Apply
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">{icon} {title}</div>
      {children}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 32, c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
      <circle cx="40" cy="40" r={r} strokeWidth="8" className="fill-none stroke-muted" />
      <circle cx="40" cy="40" r={r} strokeWidth="8" className="fill-none stroke-brand" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
    </svg>
  );
}
