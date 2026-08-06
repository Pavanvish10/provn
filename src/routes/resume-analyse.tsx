import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileSearch,
  Sparkles,
  ArrowRight,
  Check,
  AlertTriangle,
  ShieldCheck,
  Briefcase,
  Loader2,
  Route as RouteIcon,
  Gauge,
  FileEdit,
} from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useCurrentResume } from "@/lib/resume-client";
import { analyzeResumeAgainstJdFn, type JdMatchResult } from "@/lib/resume.server";

export const Route = createFileRoute("/resume-analyse")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "AI Résumé Analysis · Provn" },
      {
        name: "description",
        content:
          "Match your résumé to a specific job description for an ATS score, gap analysis, and rewrites.",
      },
      { property: "og:title", content: "AI Résumé Analysis · Provn" },
      { property: "og:description", content: "Score. Rewrite. Ship a better résumé in minutes." },
    ],
  }),
  component: Resume,
});

function Resume() {
  const { data: user } = useCurrentUser();
  const { data: resume, isLoading } = useCurrentResume(user?.id);
  const [jd, setJd] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JdMatchResult | null>(null);
  const [isCached, setIsCached] = useState(false);

  // A past run's report is saved on the résumé row — show it immediately
  // instead of making the candidate re-run the analysis on every visit.
  useEffect(() => {
    if (result || !resume?.jd_match) return;
    setResult(resume.jd_match as unknown as JdMatchResult);
    setIsCached(true);
  }, [resume, result]);

  const jdReady = jd.trim().length >= 40;
  const canRun = !!resume && jdReady && !running;

  const analyse = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setIsCached(false);
    try {
      const res = await analyzeResumeAgainstJdFn({ data: { jobDescription: jd } });
      if (res.error) setError(res.error);
      else setResult(res.result!);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-tight">AI Résumé Analysis</h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Paste a job description — we score your saved résumé against that specific role, not a
          generic template.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${resume ? "bg-brand text-brand-foreground" : "bg-muted text-foreground"}`}
            >
              1
            </span>
            Résumé
          </div>
          {isLoading ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : resume ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
              <FileSearch className="h-6 w-6 text-brand" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{resume.file_name}</div>
                <div className="text-xs text-muted-foreground">
                  {resume.ats_score !== null
                    ? `General ATS score: ${resume.ats_score}/100`
                    : "Not yet analyzed"}
                </div>
              </div>
            </div>
          ) : (
            <Link
              to="/profile"
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background p-8 text-center transition hover:border-brand hover:bg-brand-soft/40"
            >
              <Upload className="h-7 w-7 text-muted-foreground" />
              <div className="mt-3 text-sm font-medium">No résumé on file</div>
              <div className="text-xs text-muted-foreground">
                Upload one from your profile first
              </div>
            </Link>
          )}

          <div className="mt-6 mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${jdReady ? "bg-brand text-brand-foreground" : "bg-muted text-foreground"}`}
            >
              2
            </span>
            Job description{" "}
            <span className="ml-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
              Required
            </span>
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

          <Button className="mt-5 w-full" size="lg" disabled={!canRun} onClick={analyse}>
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Analyse résumé vs JD
              </>
            )}
          </Button>
          {!resume && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Upload a résumé to continue
            </p>
          )}
          {resume && !jdReady && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Paste the job description to enable analysis
            </p>
          )}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          {!result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <FileSearch className="h-8 w-8 text-muted-foreground" />
              <div className="mt-3 font-display text-xl">Your report will appear here</div>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Résumé + JD in. ATS score, missing skills, strengths, weaknesses, rewrite
                suggestions, and a prep roadmap out.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <ScoreRing score={result.atsScore} />
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">
                      JD match score
                    </div>
                    <div className="font-display text-4xl">{result.atsScore}/100</div>
                  </div>
                </div>
                {isCached && (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    From your last analysis
                  </span>
                )}
              </div>
              <Section title="What's working" icon={<Check className="h-4 w-4 text-brand" />}>
                <ul className="space-y-2 text-sm">
                  {result.strengths.map((t) => (
                    <li key={t} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {t}
                    </li>
                  ))}
                </ul>
              </Section>
              <Section
                title="Missing skills"
                icon={<AlertTriangle className="h-4 w-4 text-warning" />}
              >
                <div className="flex flex-wrap gap-1.5">
                  {result.missingSkills.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Section>
              <Section title="Weaknesses" icon={<AlertTriangle className="h-4 w-4 text-warning" />}>
                <ul className="space-y-2 text-sm">
                  {result.weaknesses.map((t) => (
                    <li key={t} className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> {t}
                    </li>
                  ))}
                </ul>
              </Section>
              <Section
                title="Suggested rewrites"
                icon={<Sparkles className="h-4 w-4 text-brand" />}
              >
                <ul className="space-y-2 text-sm">
                  {result.improvementSuggestions.map((t) => (
                    <li key={t} className="flex gap-2">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {t}
                    </li>
                  ))}
                </ul>
              </Section>
              <Section
                title="Recommended roadmap"
                icon={<RouteIcon className="h-4 w-4 text-brand" />}
              >
                <ol className="space-y-3">
                  {result.roadmap.map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                        {index + 1}
                      </span>
                      <div>
                        <div className="text-sm font-medium">{step.title}</div>
                        <div className="text-xs text-muted-foreground">{step.detail}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>

              <div className="mt-8 rounded-xl border border-brand/40 bg-brand-soft/60 p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-brand" />
                  <div className="font-semibold">Next: Verify your skills</div>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  A great résumé opens the door — verified skills close the offer. Run the same
                  technical test + AI mock interview we use for the Apply flow.
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
                  <Link to="/career-roadmap">
                    <Button size="lg" variant="outline">
                      <RouteIcon className="mr-2 h-4 w-4" /> Build your personalized roadmap
                    </Button>
                  </Link>
                  <Link to="/eligibility">
                    <Button size="lg" variant="outline">
                      <Gauge className="mr-2 h-4 w-4" /> Check company eligibility
                    </Button>
                  </Link>
                  <Link to="/resume-builder">
                    <Button size="lg" variant="outline">
                      <FileEdit className="mr-2 h-4 w-4" /> Build & optimize your resume
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

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 32,
    c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
      <circle cx="40" cy="40" r={r} strokeWidth="8" className="fill-none stroke-muted" />
      <circle
        cx="40"
        cy="40"
        r={r}
        strokeWidth="8"
        className="fill-none stroke-brand"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
      />
    </svg>
  );
}
