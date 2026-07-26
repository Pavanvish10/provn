import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, FileText, Code2, Mic, Lock, Upload, Play, Sparkles, ShieldCheck, MapPin } from "lucide-react";
import { useAppState, setState } from "@/lib/store";
import { JOBS } from "@/lib/mock-data";
import { useState } from "react";

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Apply for a job · Provn" },
      { name: "description", content: "Verify your skills, then apply with proof — not just claims." },
      { property: "og:title", content: "Apply for a job · Provn" },
      { property: "og:description", content: "Three verifications unlock every listing." },
    ],
  }),
  component: Apply,
});

function Apply() {
  const s = useAppState();
  const v = s.verification;
  const stepsDone = [v.resume, v.codingTest, v.mockInterview].filter(Boolean).length;
  const unlocked = stepsDone === 3;

  const setV = (patch: Partial<typeof v>) =>
    setState({ verification: { ...v, ...patch } });

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-tight">Apply for a job.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Provn only lets you apply once your skills are verified. It takes about an hour — one time.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand" />
            <div className="font-medium">Skill verification</div>
            <Badge variant="secondary">{stepsDone}/3</Badge>
          </div>
          {unlocked ? (
            <Badge className="bg-brand text-brand-foreground hover:bg-brand">Unlocked</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Complete all 3 to unlock listings</span>
          )}
        </div>
        <Progress value={(stepsDone / 3) * 100} className="mt-4" />

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <VerifyStep
            done={v.resume}
            icon={<FileText className="h-5 w-5" />}
            title="1. Upload résumé"
            desc="Your résumé seeds every AI test. Takes 10 seconds."
            action={
              v.resume ? (
                <Badge variant="secondary"><Check className="mr-1 h-3 w-3" /> Uploaded</Badge>
              ) : (
                <Button size="sm" onClick={() => setV({ resume: true })}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
                </Button>
              )
            }
          />
          <VerifyStep
            done={v.codingTest}
            locked={!v.resume}
            icon={<Code2 className="h-5 w-5" />}
            title="2. AI Coding Test"
            desc="~1 hour · questions generated from your résumé."
            action={<CodingTestButton done={v.codingTest} locked={!v.resume} onDone={() => setV({ codingTest: true })} />}
          />
          <VerifyStep
            done={v.mockInterview}
            locked={!v.codingTest}
            icon={<Mic className="h-5 w-5" />}
            title="3. AI Mock Interview"
            desc="Soft‑skills simulation, ~25 min. Voice or text."
            action={<MockInterviewButton done={v.mockInterview} locked={!v.codingTest} onDone={() => setV({ mockInterview: true })} />}
          />
        </div>
      </div>

      {/* Jobs */}
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-2xl">Open roles</h2>
        {!unlocked && <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Locked until verified</span>}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {JOBS.map((j) => (
          <div key={j.id} className={`rounded-2xl border p-5 ${unlocked ? "border-border bg-card" : "border-border bg-card opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{j.company}</div>
                <h3 className="mt-1 font-display text-xl">{j.role}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {j.location} · {j.salary}
                </div>
              </div>
              <Button disabled={!unlocked} size="sm">{unlocked ? "Apply" : <><Lock className="mr-1 h-3.5 w-3.5" /> Locked</>}</Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {j.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function VerifyStep({
  done, locked, icon, title, desc, action,
}: {
  done: boolean; locked?: boolean; icon: React.ReactNode; title: string; desc: string; action: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-4 ${done ? "border-brand bg-brand-soft/50" : locked ? "border-border bg-background opacity-70" : "border-border bg-background"}`}>
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-md ${done ? "bg-brand text-brand-foreground" : "bg-muted text-foreground"}`}>
          {done ? <Check className="h-4 w-4" /> : icon}
        </div>
        <div className="font-medium">{title}</div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}

function CodingTestButton({ done, locked, onDone }: { done: boolean; locked: boolean; onDone: () => void }) {
  const [running, setRunning] = useState(false);
  const [p, setP] = useState(0);
  const start = () => {
    setRunning(true);
    const t = setInterval(() => {
      setP((v) => {
        if (v >= 100) { clearInterval(t); setRunning(false); onDone(); return 100; }
        return v + 12;
      });
    }, 250);
  };
  if (done) return <Badge variant="secondary"><Check className="mr-1 h-3 w-3" /> Passed · 82%</Badge>;
  if (running) return (
    <div className="space-y-2">
      <Progress value={p} />
      <div className="text-xs text-muted-foreground">Simulating test…</div>
    </div>
  );
  return <Button size="sm" disabled={locked} onClick={start}><Play className="mr-1.5 h-3.5 w-3.5" /> Start test</Button>;
}

function MockInterviewButton({ done, locked, onDone }: { done: boolean; locked: boolean; onDone: () => void }) {
  const [running, setRunning] = useState(false);
  const [p, setP] = useState(0);
  const start = () => {
    setRunning(true);
    const t = setInterval(() => {
      setP((v) => {
        if (v >= 100) { clearInterval(t); setRunning(false); onDone(); return 100; }
        return v + 10;
      });
    }, 250);
  };
  if (done) return <Badge variant="secondary"><Check className="mr-1 h-3 w-3" /> Passed · 8.4/10</Badge>;
  if (running) return (
    <div className="space-y-2">
      <Progress value={p} />
      <div className="text-xs text-muted-foreground">Interview in progress…</div>
    </div>
  );
  return <Button size="sm" disabled={locked} onClick={start}><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Begin interview</Button>;
}
