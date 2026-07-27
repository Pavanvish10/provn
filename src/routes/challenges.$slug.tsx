import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, Play, Send, X } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useChallenge,
  useSupportedLanguages,
  useRunSample,
  useSubmitChallenge,
  useMySubmissions,
} from "@/lib/challenges-client";

export const Route = createFileRoute("/challenges/$slug")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Challenge · Provn" }] }),
  component: ChallengeDetail,
});

const PREFERRED_LANGUAGES = ["javascript", "python", "typescript", "java", "cpp", "go"];

function ChallengeDetail() {
  const { slug } = Route.useParams();
  const { data: user } = useCurrentUser();
  const { data: challenge, isLoading } = useChallenge(slug);
  const { data: languages } = useSupportedLanguages();
  const { data: submissions } = useMySubmissions(challenge?.id, user?.id);
  const runSample = useRunSample();
  const submitChallenge = useSubmitChallenge(user?.id);

  const [language, setLanguage] = useState<string>("");
  const [source, setSource] = useState("");
  const [output, setOutput] = useState<{ ok: boolean; text: string } | null>(null);
  const [lastResult, setLastResult] = useState<{
    status: string;
    passed: number;
    total: number;
  } | null>(null);

  const sortedLanguages = (languages ?? []).slice().sort((a, b) => {
    const ai = PREFERRED_LANGUAGES.indexOf(a.language);
    const bi = PREFERRED_LANGUAGES.indexOf(b.language);
    if (ai === -1 && bi === -1) return a.language.localeCompare(b.language);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  useEffect(() => {
    if (!language && sortedLanguages.length > 0) {
      setLanguage(sortedLanguages[0].language);
    }
  }, [sortedLanguages, language]);

  useEffect(() => {
    if (!challenge) return;
    const starter = (challenge.starter_code as Record<string, string> | null)?.[language];
    setSource(starter ?? "");
  }, [challenge, language]);

  if (isLoading || !challenge) {
    return (
      <AppShell>
        <div className="py-20 text-center text-sm text-muted-foreground">Loading challenge…</div>
      </AppShell>
    );
  }

  const version = sortedLanguages.find((l) => l.language === language)?.version ?? "";

  const run = async () => {
    setOutput(null);
    const res = await runSample.mutateAsync({
      challengeId: challenge.id,
      language,
      version,
      source,
    });
    if (res.error) {
      setOutput({ ok: false, text: res.error });
      return;
    }
    setOutput({
      ok: (res.passed ?? 0) === (res.total ?? 0) && (res.total ?? 0) > 0,
      text: `Sample: ${res.passed ?? 0}/${res.total ?? 0} passed\n\nstdout:\n${res.stdout || "(empty)"}\n\nstderr:\n${res.stderr || "(empty)"}`,
    });
  };

  const submit = async () => {
    setOutput(null);
    setLastResult(null);
    const res = await submitChallenge.mutateAsync({
      challengeId: challenge.id,
      language,
      version,
      source,
    });
    if (res.error) {
      setOutput({ ok: false, text: res.error });
      return;
    }
    const sub = res.submission!;
    setLastResult({ status: sub.status, passed: sub.passed_count, total: sub.total_count });
    setOutput({
      ok: sub.status === "passed",
      text: `${sub.status.toUpperCase()} — ${sub.passed_count}/${sub.total_count} test cases passed\n\nstdout:\n${sub.stdout || "(empty)"}\n\nstderr:\n${sub.stderr || "(empty)"}`,
    });
  };

  return (
    <AppShell>
      <Link
        to="/challenges"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All challenges
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium capitalize text-warning">
              {challenge.difficulty}
            </span>
            <span>{challenge.estimated_minutes} min</span>
            <span>+{challenge.xp_reward} XP</span>
          </div>
          <h1 className="mt-2 font-display text-3xl tracking-tight">{challenge.title}</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(challenge.tags ?? []).map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>

          <div className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Problem
              </div>
              <p className="whitespace-pre-wrap">{challenge.description}</p>
            </div>
            {challenge.constraints && (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Constraints
                </div>
                <p className="whitespace-pre-wrap text-muted-foreground">{challenge.constraints}</p>
              </div>
            )}
            {challenge.input_format && (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Input
                </div>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {challenge.input_format}
                </p>
              </div>
            )}
            {challenge.output_format && (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Output
                </div>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {challenge.output_format}
                </p>
              </div>
            )}
          </div>

          {submissions && submissions.length > 0 && (
            <div className="mt-5 rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Your submissions
              </div>
              <div className="space-y-2">
                {submissions.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {s.status === "passed" ? (
                        <Check className="h-3.5 w-3.5 text-brand" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {s.language} · {s.passed_count}/{s.total_count}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
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
              <Button variant="outline" onClick={run} disabled={runSample.isPending || !language}>
                {runSample.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-1.5 h-4 w-4" />
                )}
                Run
              </Button>
              <Button onClick={submit} disabled={submitChallenge.isPending || !language}>
                {submitChallenge.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-4 w-4" />
                )}
                Submit
              </Button>
            </div>
          </div>

          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            className="h-96 w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-sm outline-none focus:border-foreground/30"
            placeholder="Write your solution here…"
          />

          {output && (
            <div
              className={`mt-4 whitespace-pre-wrap rounded-xl border p-4 font-mono text-xs ${
                output.ok ? "border-brand/40 bg-brand-soft/40" : "border-border bg-card"
              }`}
            >
              {output.text}
            </div>
          )}

          {lastResult?.status === "passed" && (
            <div className="mt-4 rounded-xl border border-brand/40 bg-brand-soft/60 p-4 text-sm">
              <b>Solved!</b> XP awarded and your streak was updated automatically.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
