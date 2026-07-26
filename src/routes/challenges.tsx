import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { CHALLENGES } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, CheckCircle2, Clock, Play, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Daily Coding Challenges · Provn" },
      { name: "description", content: "Pick any 2 timed challenges a day across every technical domain to keep your streak alive." },
      { property: "og:title", content: "Daily Coding Challenges · Provn" },
      { property: "og:description", content: "Timed, moderate, cross-domain. Streaks that recruiters care about." },
    ],
  }),
  component: Challenges,
});

const DAILY_GOAL = 2;

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Challenges() {
  const s = useAppState();
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

  const solvedToday = Object.values(solved).filter(Boolean).length;
  const goalMet = solvedToday >= DAILY_GOAL;

  useEffect(() => {
    if (!activeId || remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [activeId, remaining]);

  const active = useMemo(() => CHALLENGES.find((c) => c.id === activeId) ?? null, [activeId]);

  const start = (id: string, minutes: number) => {
    setActiveId(id);
    setRemaining(minutes * 60);
  };
  const stop = () => { setActiveId(null); setRemaining(0); };
  const submit = (id: string) => {
    setSolved((v) => ({ ...v, [id]: true }));
    stop();
  };

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Daily challenges</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick <b>any 2</b> across any technical domain today to keep your streak alive.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
          <Flame className="h-4 w-4 text-brand" /> {s.streak} day streak · {solvedToday}/{DAILY_GOAL} today
        </div>
      </div>

      {goalMet && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand/30 bg-brand-soft/60 p-4">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand" />
          <div className="text-sm">
            <b>Streak extended.</b> You've solved {DAILY_GOAL} today — keep going for bonus problems.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CHALLENGES.map((c) => {
          const done = solved[c.id];
          const isActive = activeId === c.id;
          return (
            <div key={c.id} className={`rounded-2xl border p-5 transition ${done ? "border-brand bg-brand-soft/40" : isActive ? "border-foreground/40 bg-card" : "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                    <span>{c.domain}</span>
                    <span className="opacity-40">·</span>
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
                      {c.difficulty}
                    </span>
                  </div>
                  <h3 className="mt-1 font-display text-xl leading-tight">{c.title}</h3>
                </div>
                {done && <CheckCircle2 className="h-6 w-6 shrink-0 text-brand" />}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {c.minutes} min timer
              </div>

              {isActive && (
                <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                  <div className="text-xs text-muted-foreground">Time left</div>
                  <div className={`font-display text-2xl tabular-nums ${remaining <= 60 ? "text-warning" : ""}`}>
                    {fmt(remaining)}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {done ? (
                  <Button variant="outline" onClick={() => setSolved((v) => ({ ...v, [c.id]: false }))}>
                    Mark unsolved
                  </Button>
                ) : isActive ? (
                  <>
                    <Button onClick={() => submit(c.id)}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Submit solution
                    </Button>
                    <Button variant="ghost" onClick={stop}>
                      <Square className="mr-1.5 h-4 w-4" /> Stop
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => start(c.id, c.minutes)} disabled={!!active}>
                    <Play className="mr-1.5 h-4 w-4" /> Start · {c.minutes} min
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
