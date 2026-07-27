import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Flame, CheckCircle2, Clock, Search } from "lucide-react";
import { useState } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useProfile } from "@/lib/profile-client";
import {
  useChallengeCategories,
  useChallenges,
  useTodaysChallenges,
} from "@/lib/challenges-client";

export const Route = createFileRoute("/challenges")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Daily Coding Challenges · Provn" },
      {
        name: "description",
        content:
          "Two adaptive challenges a day, plus a full library across every technical domain.",
      },
      { property: "og:title", content: "Daily Coding Challenges · Provn" },
      { property: "og:description", content: "Real code execution. Real streaks. No simulations." },
    ],
  }),
  component: Challenges,
});

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

function Challenges() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const { data: daily, isLoading: dailyLoading } = useTodaysChallenges(user?.id);
  const { data: categories } = useChallengeCategories();
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const { data: allChallenges, isLoading: listLoading } = useChallenges({
    category,
    difficulty,
    search,
  });

  const solvedToday = (daily?.challenges ?? []).filter((c) => c.completed).length;

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Daily challenges</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Two challenges, chosen for you every day based on your target role, skills, and history.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
          <Flame className="h-4 w-4 text-brand" /> {profile?.streak ?? 0} day streak · {solvedToday}
          /2 today
        </div>
      </div>

      {solvedToday >= 2 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand/30 bg-brand-soft/60 p-4">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand" />
          <div className="text-sm">
            <b>Streak extended.</b> You've solved both of today's challenges — browse the full
            library for more.
          </div>
        </div>
      )}

      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl">Today's challenges</h2>
        {dailyLoading ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Picking today's challenges…
          </div>
        ) : daily?.error ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {daily.error}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {(daily?.challenges ?? []).map((c) => (
              <ChallengeCard key={c.id} challenge={c} done={c.completed} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl">Browse all challenges</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search challenges…"
              className="w-56 pl-8"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setDifficulty(undefined)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${!difficulty ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            All difficulties
          </button>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${difficulty === d ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory(undefined)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${!category ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            All categories
          </button>
          {(categories ?? []).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${category === cat.id ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {listLoading ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (allChallenges ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No challenges match this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {(allChallenges ?? []).map((c) => (
              <ChallengeCard key={c.id} challenge={c} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function ChallengeCard({
  challenge,
  done,
}: {
  challenge: {
    id: string;
    slug: string;
    title: string;
    difficulty: string;
    tags: string[] | null;
    estimated_minutes: number;
    xp_reward: number;
    is_premium: boolean;
  };
  done?: boolean;
}) {
  return (
    <Link
      to="/challenges/$slug"
      params={{ slug: challenge.slug }}
      className={`block rounded-2xl border p-5 transition hover:border-foreground/30 ${done ? "border-brand bg-brand-soft/40" : "border-border bg-card"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium capitalize text-warning">
              {challenge.difficulty}
            </span>
            {challenge.is_premium && <Badge variant="secondary">Premium</Badge>}
          </div>
          <h3 className="mt-1 font-display text-xl leading-tight">{challenge.title}</h3>
        </div>
        {done && <CheckCircle2 className="h-6 w-6 shrink-0 text-brand" />}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(challenge.tags ?? []).slice(0, 4).map((t) => (
          <Badge key={t} variant="secondary">
            {t}
          </Badge>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {challenge.estimated_minutes} min
        </span>
        <span>+{challenge.xp_reward} XP</span>
      </div>
    </Link>
  );
}
