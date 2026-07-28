import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlarmClock,
  ArrowLeft,
  Check,
  ChevronDown,
  Lightbulb,
  Loader2,
  Play,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { explainSubmissionFn } from "@/lib/challenge-ai.server";
import {
  useChallengeDiscussions,
  useAddDiscussionComment,
  useDeleteDiscussionComment,
} from "@/lib/challenge-discussions-client";

export const Route = createFileRoute("/challenges/$slug")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Challenge · Provn" }] }),
  component: ChallengeDetail,
});

const PREFERRED_LANGUAGES = ["javascript", "python", "typescript", "java", "cpp", "go"];
const TIMER_SECONDS = 10 * 60;

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
  const [remaining, setRemaining] = useState(TIMER_SECONDS);
  const [timeUp, setTimeUp] = useState(false);
  const startedAtRef = useRef<number>(Date.now());
  const autoSubmittedRef = useRef(false);

  // Hints: progressive reveal + whether any hint was shown this attempt.
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);

  // Editorial: collapsed by default.
  const [editorialOpen, setEditorialOpen] = useState(false);

  // AI explanation for the most recent submission.
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const explainMutation = useMutation({
    mutationFn: (submissionId: string) => explainSubmissionFn({ data: { submissionId } }),
  });

  // Discussion thread.
  const { data: discussions } = useChallengeDiscussions(challenge?.id);
  const addComment = useAddDiscussionComment(challenge?.id);
  const deleteComment = useDeleteDiscussionComment(challenge?.id);
  const [commentDraft, setCommentDraft] = useState("");

  const alreadySolved = (submissions ?? []).some((s) => s.status === "passed");

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

  const storageKey = challenge ? `provn.challenge-draft.${challenge.id}.${language}` : null;

  useEffect(() => {
    if (!challenge) return;
    const saved = storageKey ? localStorage.getItem(storageKey) : null;
    if (saved !== null) {
      setSource(saved);
    } else {
      const starter = (challenge.starter_code as Record<string, string> | null)?.[language];
      setSource(starter ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge, language]);

  // Auto-save progress as the user types.
  useEffect(() => {
    if (!storageKey) return;
    const t = setTimeout(() => localStorage.setItem(storageKey, source), 400);
    return () => clearTimeout(t);
  }, [storageKey, source]);

  // 10-minute timer: starts the moment this page mounts (i.e. the instant the
  // user clicked "Start Challenge"), cannot be paused, auto-submits at zero.
  useEffect(() => {
    if (alreadySolved) return;
    startedAtRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const left = Math.max(0, TIMER_SECONDS - elapsed);
      setRemaining(left);
      if (left <= 0) {
        setTimeUp(true);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [challenge?.id, alreadySolved]);

  useEffect(() => {
    if (timeUp && !autoSubmittedRef.current && !alreadySolved) {
      autoSubmittedRef.current = true;
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  if (isLoading || !challenge) {
    return (
      <AppShell>
        <div className="py-20 text-center text-sm text-muted-foreground">Loading challenge…</div>
      </AppShell>
    );
  }

  const currentLang = sortedLanguages.find((l) => l.language === language);
  const judge0Id = currentLang?.judge0Id;
  const hints = Array.isArray(challenge.hints) ? (challenge.hints as unknown as string[]) : [];

  const run = async () => {
    if (!judge0Id) return;
    setOutput(null);
    const res = await runSample.mutateAsync({ challengeId: challenge.id, judge0Id, source });
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
    if (!judge0Id) return;
    setOutput(null);
    setLastResult(null);
    setLastSubmissionId(null);
    setAiExplanation(null);
    setAiError(null);
    const timeTakenSeconds = Math.min(
      TIMER_SECONDS,
      Math.floor((Date.now() - startedAtRef.current) / 1000),
    );
    const res = await submitChallenge.mutateAsync({
      challengeId: challenge.id,
      judge0Id,
      language,
      source,
      timeTakenSeconds,
      hintUsed,
    });
    if (res.error) {
      setOutput({ ok: false, text: res.error });
      return;
    }
    const sub = res.submission!;
    setLastResult({ status: sub.status, passed: sub.passed_count, total: sub.total_count });
    setLastSubmissionId(sub.id);
    setOutput({
      ok: sub.status === "passed",
      text: `${sub.status.toUpperCase()} — ${sub.passed_count}/${sub.total_count} test cases passed\n\nstdout:\n${sub.stdout || "(empty)"}\n\nstderr:\n${sub.stderr || "(empty)"}`,
    });
    if (storageKey) localStorage.removeItem(storageKey);
  };

  const explainWithAi = async () => {
    if (!lastSubmissionId) return;
    setAiExplanation(null);
    setAiError(null);
    try {
      const res = await explainMutation.mutateAsync(lastSubmissionId);
      if (res.error) setAiError(res.error);
      else setAiExplanation(res.explanation ?? null);
    } catch {
      setAiError("Could not get an AI explanation right now. Try again.");
    }
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

          {/* Hints: progressive reveal */}
          <div className="mt-5 rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5" /> Hints
            </div>
            {hints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hints for this problem.</p>
            ) : (
              <div className="space-y-3">
                {hints.slice(0, hintsRevealed).map((hint, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-background p-3 text-sm"
                  >
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">
                      Hint {i + 1} of {hints.length}
                    </div>
                    <p className="whitespace-pre-wrap">{hint}</p>
                  </div>
                ))}
                {hintsRevealed < hints.length && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHintsRevealed((n) => n + 1);
                      setHintUsed(true);
                    }}
                  >
                    <Lightbulb className="mr-1.5 h-4 w-4" />
                    Show hint ({hintsRevealed + 1} of {hints.length})
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Editorial: only unlocked after this problem has been solved */}
          <Collapsible
            open={editorialOpen}
            onOpenChange={setEditorialOpen}
            className="mt-5 rounded-2xl border border-border bg-card p-5"
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Editorial
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${editorialOpen ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 text-sm leading-relaxed">
              {!alreadySolved ? (
                <p className="text-muted-foreground">
                  Solve this challenge to unlock the editorial.
                </p>
              ) : (
                <p className="whitespace-pre-wrap">
                  {challenge.editorial ?? "Editorial coming soon."}
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Discussion */}
          <div className="mt-5 rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Discussion
            </div>
            <div className="space-y-3">
              {(discussions ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No discussion yet — be the first to ask a question.
                </p>
              )}
              {(discussions ?? []).map((c) => (
                <div key={c.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={c.author?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(c.author?.full_name ?? c.author?.username ?? "?")
                            .slice(0, 1)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {c.author?.full_name ?? c.author?.username ?? "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(c.created_at).toLocaleString()}</span>
                      {(c.author_id === user?.id || user?.role === "admin") && (
                        <button
                          type="button"
                          onClick={() => deleteComment.mutate(c.id)}
                          disabled={deleteComment.isPending}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete comment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
            </div>

            {user && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Ask a question or share a note…"
                  className="min-h-20"
                />
                <Button
                  size="sm"
                  disabled={!commentDraft.trim() || addComment.isPending}
                  onClick={async () => {
                    await addComment.mutateAsync({ content: commentDraft, authorId: user.id });
                    setCommentDraft("");
                  }}
                >
                  Post
                </Button>
              </div>
            )}
          </div>
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

            {!alreadySolved && (
              <div
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium tabular-nums ${
                  remaining <= 60
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-border bg-card"
                }`}
              >
                <AlarmClock className="h-4 w-4" /> {fmtTime(remaining)}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={run}
                disabled={runSample.isPending || !judge0Id || timeUp}
              >
                {runSample.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-1.5 h-4 w-4" />
                )}
                Run
              </Button>
              <Button onClick={submit} disabled={submitChallenge.isPending || !judge0Id || timeUp}>
                {submitChallenge.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-4 w-4" />
                )}
                Submit
              </Button>
            </div>
          </div>

          {timeUp && !lastResult && (
            <div className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Time's up — your code was submitted automatically.
            </div>
          )}

          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            disabled={timeUp}
            className="h-96 w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-sm outline-none focus:border-foreground/30 disabled:opacity-60"
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

          {lastResult && lastSubmissionId && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={explainWithAi}
                disabled={explainMutation.isPending}
              >
                {explainMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                Explain with AI
              </Button>
              {aiError && <p className="mt-2 text-sm text-destructive">{aiError}</p>}
              {aiExplanation && (
                <div className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-sm leading-relaxed">
                  {aiExplanation}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
