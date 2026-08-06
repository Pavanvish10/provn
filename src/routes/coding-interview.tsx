import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Sparkles,
  Loader2,
  Target,
  Building2,
  Play,
  Send,
  History,
  Code2,
  AlertTriangle,
  Gauge,
  Lightbulb,
  BookOpen,
  Wrench,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useProfile } from "@/lib/profile-client";
import { CompanySelector } from "@/components/interview/job/CompanySelector";
import { DifficultySelector } from "@/components/interview/job/DifficultySelector";
import type { DifficultyLevel } from "@/ai/QuestionDifficulty";
import { useSupportedLanguages } from "@/lib/challenges-client";
import {
  useCodingInterviewHistory,
  useCodingInterviewSession,
  useStartCodingInterview,
  useRunCodingInterviewSample,
  useSubmitCodingInterview,
  type CodingInterviewSessionSafe,
  type CodingExample,
} from "@/lib/coding-interview-client";

export const Route = createFileRoute("/coding-interview")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Coding Interview · Provn" },
      {
        name: "description",
        content:
          "A real, Judge0-graded AI coding interview — company/role-specific questions, six-dimension evaluation, and feedback.",
      },
    ],
  }),
  component: CodingInterviewPage,
});

const PREFERRED_LANGUAGES = ["javascript", "python", "typescript", "java", "cpp", "go"];

function CodingInterviewPage() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const { data: history } = useCodingInterviewHistory(user?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const selected = useMemo(() => {
    if (!history || history.length === 0) return null;
    if (selectedId) return history.find((r) => r.id === selectedId) ?? history[0];
    return history[0];
  }, [history, selectedId]);

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Coding interview.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            A real coding interview question grounded in your target company, role, and difficulty —
            graded for real against test cases and evaluated on correctness, complexity, code
            quality, and more.
          </p>
        </div>
        {history && history.length > 0 && (
          <Button variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Sparkles className="mr-2 h-4 w-4" />
            {showForm ? "Hide" : "Start new interview"}
          </Button>
        )}
      </div>

      {(showForm || !history || history.length === 0) && (
        <div className="mb-8">
          <InterviewSetup
            profileId={user?.id}
            defaultRole={profile?.target_role ?? ""}
            onStarted={(sessionId) => {
              setSelectedId(sessionId);
              setShowForm(false);
            }}
          />
        </div>
      )}

      {selected && !showForm && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          {selected.status === "in_progress" ? (
            <InterviewRoom
              session={selected}
              profileId={user?.id}
              onEvaluated={() => {
                /* the session query invalidation swaps this view to the report automatically */
              }}
            />
          ) : (
            <ReportDetail session={selected} />
          )}
          <HistoryList history={history ?? []} selectedId={selected.id} onSelect={setSelectedId} />
        </div>
      )}
    </AppShell>
  );
}

function InterviewSetup({
  profileId,
  defaultRole,
  onStarted,
}: {
  profileId: string | undefined;
  defaultRole: string;
  onStarted: (sessionId: string) => void;
}) {
  const start = useStartCodingInterview(profileId);
  const [targetRole, setTargetRole] = useState(defaultRole);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>("medium");
  const [error, setError] = useState<string | null>(null);

  // The profile (and its target_role) loads asynchronously after this
  // component's first render, so seed the field once it arrives instead
  // of only capturing it at mount — but never clobber what the user typed.
  useEffect(() => {
    if (defaultRole && !targetRole) setTargetRole(defaultRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultRole]);

  async function handleStart() {
    if (!targetRole.trim()) {
      setError("Enter a target role.");
      return;
    }
    if (!difficulty) {
      setError("Pick a difficulty.");
      return;
    }
    setError(null);
    const result = await start.mutateAsync({
      targetRole: targetRole.trim(),
      targetCompany: companyId ?? undefined,
      difficulty,
    });
    if (result.error) setError(result.error);
    else if (result.sessionId) onStarted(result.sessionId);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          Target role
        </div>
        <Input
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="e.g. Backend Developer"
          className="mt-3"
        />
      </div>

      <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          Target company <span className="font-normal text-muted-foreground">(optional)</span>
        </div>
        <div className="mt-3">
          <CompanySelector value={companyId} onChange={setCompanyId} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Gauge className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          Difficulty
        </div>
        <div className="mt-3">
          <DifficultySelector value={difficulty} recommended={null} onChange={setDifficulty} />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        size="lg"
        className="w-full"
        onClick={handleStart}
        disabled={start.isPending || !targetRole.trim() || !difficulty}
      >
        {start.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating your question…
          </>
        ) : (
          <>
            <Code2 className="mr-2 h-4 w-4" /> Start coding interview
          </>
        )}
      </Button>
    </div>
  );
}

function InterviewRoom({
  session,
  profileId,
}: {
  session: CodingInterviewSessionSafe;
  profileId: string | undefined;
  onEvaluated: () => void;
}) {
  const { data: languages, isError: languagesError } = useSupportedLanguages();
  const runSample = useRunCodingInterviewSample();
  const submit = useSubmitCodingInterview(profileId);

  const [language, setLanguage] = useState("");
  const [source, setSource] = useState("");
  const [output, setOutput] = useState<{ ok: boolean; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const sortedLanguages = (languages ?? []).slice().sort((a, b) => {
    const ai = PREFERRED_LANGUAGES.indexOf(a.language);
    const bi = PREFERRED_LANGUAGES.indexOf(b.language);
    if (ai === -1 && bi === -1) return a.language.localeCompare(b.language);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  useEffect(() => {
    if (!language && sortedLanguages.length > 0) setLanguage(sortedLanguages[0].language);
  }, [sortedLanguages, language]);

  useEffect(() => {
    const interval = setInterval(
      () => setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000)),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  const examples = (session.examples as unknown as CodingExample[]) ?? [];
  const currentLang = sortedLanguages.find((l) => l.language === language);
  const judge0Id = currentLang?.judge0Id;

  async function handleRun() {
    if (!judge0Id) return;
    setError(null);
    setOutput(null);
    const res = await runSample.mutateAsync({ sessionId: session.id, judge0Id, source });
    if (res.error) {
      setOutput({ ok: false, text: res.error });
      return;
    }
    setOutput({
      ok: (res.passed ?? 0) === (res.total ?? 0) && (res.total ?? 0) > 0,
      text: `Sample: ${res.passed ?? 0}/${res.total ?? 0} passed\n\nstdout:\n${res.stdout || "(empty)"}\n\nstderr:\n${res.stderr || "(empty)"}`,
    });
  }

  async function handleSubmit() {
    if (!judge0Id) return;
    setError(null);
    const result = await submit.mutateAsync({ sessionId: session.id, judge0Id, language, source });
    if (result.error) setError(result.error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {session.difficulty}
            </Badge>
            {session.target_company && <Badge variant="outline">{session.target_company}</Badge>}
            <Badge variant="outline">{session.target_role}</Badge>
          </div>
          <h2 className="mt-2 font-display text-2xl tracking-tight">{session.title}</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, "0")}{" "}
          elapsed
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{session.description}</p>
        {session.constraints && (
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Constraints
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {session.constraints}
            </p>
          </div>
        )}
        {examples.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Examples
            </div>
            {examples.map((ex, i) => (
              <div key={i} className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
                <div>
                  <span className="font-medium">Input:</span> {ex.input}
                </div>
                <div>
                  <span className="font-medium">Output:</span> {ex.output}
                </div>
                {ex.explanation && (
                  <div className="mt-1 text-xs text-muted-foreground">{ex.explanation}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {languagesError && (
          <p className="mb-3 flex items-center gap-1.5 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> Code execution is not configured yet (missing
            JUDGE0_API_KEY).
          </p>
        )}
        <div className="flex items-center justify-between">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {sortedLanguages.map((l) => (
                <SelectItem key={l.language} value={l.language}>
                  {l.language}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRun}
              disabled={runSample.isPending || !judge0Id || !source.trim()}
            >
              {runSample.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run sample
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submit.isPending || !judge0Id || !source.trim()}
            >
              {submit.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit
            </Button>
          </div>
        </div>

        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Write your solution here — read from stdin, write to stdout."
          spellCheck={false}
          className="mt-4 h-72 w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> {error}
          </p>
        )}

        {output && (
          <pre
            className={`mt-3 max-h-56 overflow-auto rounded-xl border p-3 text-xs ${
              output.ok
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                : "border-border bg-muted/40"
            }`}
          >
            {output.text}
          </pre>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} className="mt-1.5" />
    </div>
  );
}

function ReportDetail({ session }: { session: CodingInterviewSessionSafe }) {
  const passRate =
    session.total_count && session.total_count > 0
      ? Math.round(((session.passed_count ?? 0) / session.total_count) * 100)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {session.difficulty}
          </Badge>
          {session.target_company && <Badge variant="outline">{session.target_company}</Badge>}
          <Badge variant="outline">{session.target_role}</Badge>
        </div>
        <h2 className="mt-2 font-display text-2xl tracking-tight">{session.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {session.completed_at
            ? new Date(session.completed_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : ""}{" "}
          · {session.passed_count ?? 0}/{session.total_count ?? 0} test cases passed
          {passRate != null ? ` (${passRate}%)` : ""}
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <ScoreBar label="Overall score" value={session.overall_score} />
        <ScoreBar label="Correctness" value={session.correctness_score} />
        <ScoreBar label="Time complexity" value={session.time_complexity_score} />
        <ScoreBar label="Space complexity" value={session.space_complexity_score} />
        <ScoreBar label="Code quality" value={session.code_quality_score} />
        <ScoreBar label="Edge cases" value={session.edge_case_score} />
        <ScoreBar label="Optimization" value={session.optimization_score} />
      </div>

      {session.mistakes.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-brand" /> Mistakes
          </div>
          <ul className="mt-3 space-y-1.5">
            {session.mistakes.map((m) => (
              <li key={m} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {session.better_solution && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Wrench className="h-4 w-4 text-brand" /> Better solution
          </div>
          <pre className="mt-3 max-h-96 overflow-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs">
            {session.better_solution}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="h-4 w-4 text-brand" /> Optimization suggestions
          </div>
          <ul className="mt-3 space-y-1.5">
            {session.optimization_suggestions.length === 0 ? (
              <li className="text-xs text-muted-foreground">None.</li>
            ) : (
              session.optimization_suggestions.map((s) => (
                <li key={s} className="flex gap-2 text-sm">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                  {s}
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-brand" /> Learning resources
          </div>
          <ul className="mt-3 space-y-1.5">
            {session.learning_resources.length === 0 ? (
              <li className="text-xs text-muted-foreground">None.</li>
            ) : (
              session.learning_resources.map((r) => (
                <li key={r} className="flex gap-2 text-sm">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                  {r}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function HistoryList({
  history,
  selectedId,
  onSelect,
}: {
  history: CodingInterviewSessionSafe[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="h-fit rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <History className="h-4 w-4 text-brand" /> History
      </div>
      <ul className="mt-3 space-y-2">
        {history.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              className={`w-full rounded-xl border p-3 text-left text-xs transition ${
                s.id === selectedId
                  ? "border-brand/60 bg-brand-soft/40"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="font-medium text-foreground">{s.title}</div>
              <div className="mt-0.5 text-muted-foreground">
                {s.target_role}
                {s.target_company ? ` @ ${s.target_company}` : ""}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
                <span className="capitalize">{s.difficulty}</span>
                <span>
                  {s.status === "in_progress" ? "In progress" : `Score ${s.overall_score ?? 0}%`}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
