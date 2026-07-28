import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Flame, CheckCircle2, Clock, Search, Loader2, Sparkles, Coins } from "lucide-react";
import { useMemo, useState } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useProfile } from "@/lib/profile-client";
import { useChallengeCategories, useChallengeStats } from "@/lib/challenges-client";
import {
  useTopicQuestionCounts,
  useTodaysSession,
  useStartDailySession,
} from "@/lib/daily-session-client";
import { Confetti } from "@/components/Confetti";

export const Route = createFileRoute("/challenges")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Daily Challenges · Provn" },
      {
        name: "description",
        content: "Pick your topics, solve 2 of 5 questions in each, and keep your streak alive.",
      },
      { property: "og:title", content: "Daily Challenges · Provn" },
      { property: "og:description", content: "Real code execution. Real streaks. No simulations." },
    ],
  }),
  component: Challenges,
});

function Challenges() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const { data: sessionData, isLoading: sessionLoading } = useTodaysSession(user?.id);

  if (sessionLoading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Daily challenges</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {sessionData
              ? "Solve any 2 questions from each selected topic to complete today's goal."
              : "Pick the topics you want to practice today."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
            <Flame className="h-4 w-4 text-brand" /> {profile?.streak ?? 0} day streak
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
            <Coins className="h-4 w-4 text-warning" /> {profile?.coins ?? 0}
          </div>
        </div>
      </div>

      {sessionData ? (
        <TodaysGoal
          sessionId={sessionData.session.id}
          topics={sessionData.topics}
          completed={sessionData.session.completed}
        />
      ) : (
        <TopicSelection profileId={user?.id} />
      )}
    </AppShell>
  );
}

function TopicSelection({ profileId }: { profileId: string | undefined }) {
  const { data: categories, isLoading } = useChallengeCategories();
  const { data: counts } = useTopicQuestionCounts();
  const startSession = useStartDailySession(profileId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = (categories ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const toggle = (id: string, available: number) => {
    if (available === 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const start = async () => {
    setError(null);
    if (selected.size === 0) return;
    try {
      await startSession.mutateAsync(Array.from(selected));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start today's challenge.");
    }
  };

  return (
    <div>
      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search topics…"
          className="h-11 pl-10"
        />
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading topics…</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((cat) => {
            const available = counts?.get(cat.id) ?? 0;
            const active = selected.has(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggle(cat.id, available)}
                disabled={available === 0}
                className={`relative rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-brand bg-brand-soft shadow-sm"
                    : available === 0
                      ? "cursor-not-allowed border-border bg-muted/30 opacity-50"
                      : "border-border bg-card hover:border-foreground/20 hover:bg-muted"
                }`}
              >
                <div className="font-medium">{cat.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {available === 0
                    ? "No questions yet"
                    : `${available} question${available === 1 ? "" : "s"}`}
                </div>
                {active && (
                  <span className="absolute right-2 top-2 rounded-full bg-brand p-0.5 text-brand-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full py-10 text-center text-sm text-muted-foreground">
              No topics match "{search}".
            </div>
          )}
        </div>
      )}

      <div className="sticky bottom-4 mt-8 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur">
        <div className="text-sm text-muted-foreground">
          {selected.size === 0
            ? "Select at least one topic"
            : `${selected.size} topic${selected.size === 1 ? "" : "s"} selected`}
        </div>
        <Button size="lg" disabled={selected.size === 0 || startSession.isPending} onClick={start}>
          {startSession.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-4 w-4" />
          )}
          Start Challenge
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function TodaysGoal({
  sessionId,
  topics,
  completed,
}: {
  sessionId: string;
  topics: import("@/lib/daily-session-client").SessionTopicWithQuestions[];
  completed: boolean;
}) {
  const allChallengeIds = useMemo(
    () => topics.flatMap((t) => t.questions.map((q) => q.challenge_id)),
    [topics],
  );
  const { data: stats } = useChallengeStats(allChallengeIds);
  const [showConfetti, setShowConfetti] = useState(completed);

  return (
    <div>
      {completed && showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {completed && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft/60 p-4">
          <span className="text-2xl">🔥</span>
          <div className="text-sm">
            <b>Daily Challenge Completed!</b> Streak extended, +50 coins awarded.
          </div>
        </div>
      )}

      <div className="space-y-8">
        {topics.map((topic) => (
          <section key={topic.id}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl">{topic.category_name}</h2>
                <p className="text-xs text-muted-foreground">
                  Today's Goal: solve any {topic.required_solved} of {topic.questions.length}{" "}
                  questions
                </p>
              </div>
              <div className="flex items-center gap-2">
                {topic.completed && <CheckCircle2 className="h-5 w-5 text-brand" />}
                <span className="text-sm text-muted-foreground">
                  {topic.solved_count}/{topic.required_solved}
                </span>
              </div>
            </div>
            <Progress
              value={Math.min(100, (topic.solved_count / topic.required_solved) * 100)}
              className="mb-4"
            />

            {topic.questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No questions available for this topic yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {topic.questions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    acceptanceRate={stats?.get(q.challenge_id) ?? null}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  acceptanceRate,
}: {
  question: import("@/lib/daily-session-client").SessionTopicWithQuestions["questions"][number];
  acceptanceRate: number | null;
}) {
  return (
    <Link
      to="/challenges/$slug"
      params={{ slug: question.slug }}
      className={`block rounded-2xl border p-5 transition hover:border-foreground/30 ${
        question.solved ? "border-brand bg-brand-soft/40" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium capitalize text-warning">
              {question.difficulty}
            </span>
            {acceptanceRate !== null && <span>{acceptanceRate}% acceptance</span>}
          </div>
          <h3 className="mt-1 font-display text-lg leading-tight">{question.title}</h3>
        </div>
        {question.solved && <CheckCircle2 className="h-5 w-5 shrink-0 text-brand" />}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(question.tags ?? []).slice(0, 4).map((t) => (
          <Badge key={t} variant="secondary">
            {t}
          </Badge>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {question.estimated_minutes} min
        </span>
        <span>+{question.xp_reward} XP</span>
      </div>
      {!question.solved && (
        <Button size="sm" className="mt-4 w-full">
          Start Challenge
        </Button>
      )}
    </Link>
  );
}
