import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useState } from "react";
import {
  Flame,
  Coins,
  Trophy,
  Award,
  Sparkles,
  Star,
  Clock,
  CheckCircle2,
  SkipForward,
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Target,
  Building2,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Confetti } from "@/components/Confetti";
import { AchievementPopup } from "@/components/AchievementPopup";
import { DailyChallengeCalendar } from "@/components/DailyChallengeCalendar";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useProfile } from "@/lib/profile-client";
import { getLevelInfo } from "@/lib/gamification";
import { useLeaderboard } from "@/lib/leaderboard-client";
import {
  useChallengeCategories,
  useChallengeCompanyTags,
  useChallenges,
} from "@/lib/challenges-client";
import {
  useBadgeDefinitions,
  useMyBadges,
  useMyDailyChallengeCompletionCount,
  useMyDailyChallengeStatus,
  useMyDailyProgress,
  useSkipTodaysChallenge,
  useTodaysDailyChallenge,
  useChallengeAnalytics,
} from "@/lib/daily-challenge-client";

export const Route = createFileRoute("/challenges")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Daily Challenges · Provn" },
      {
        name: "description",
        content:
          "One challenge a day. Build your streak, earn XP and badges, climb the leaderboard.",
      },
      { property: "og:title", content: "Daily Challenges · Provn" },
      { property: "og:description", content: "Real practice. Real streaks. No simulations." },
    ],
  }),
  component: Challenges,
});

const DIFFICULTY_TONE: Record<string, string> = {
  easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  hard: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

const BADGE_ICONS = { Trophy, Flame, Sparkles, Award } as const;

function Challenges() {
  // /challenges/$slug (challenges.$slug.tsx) is registered as a child route
  // of /challenges (TanStack Router nests file-based routes that share a
  // path prefix), which means this component has to yield to it via
  // <Outlet /> when it's active — otherwise this dashboard renders
  // unconditionally on every /challenges/* URL, including the challenge
  // detail page, and "Solve Challenge" appears to do nothing. The detail
  // route renders its own <AppShell>, so no wrapper here.
  const matches = useMatches();
  const childActive = matches.some((m) => m.routeId === "/challenges/$slug");

  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);

  const level = getLevelInfo(profile?.xp ?? 0);
  const { data: leaderboard } = useLeaderboard(
    "global",
    user?.id,
    profile?.college,
    profile?.target_role,
  );
  const { data: completionCount } = useMyDailyChallengeCompletionCount(user?.id);
  const { data: myBadges } = useMyBadges(user?.id);
  const { data: dailyProgress } = useMyDailyProgress(user?.id);

  // Every hook above must still run on every render (Rules of Hooks) even
  // though this component yields to the child route below.
  if (childActive) return <Outlet />;

  return (
    <AppShell>
      <AchievementPopup profileId={user?.id} />

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Daily Challenges</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            One challenge, every day — the same one for everyone. Solve it to keep your streak
            alive.
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={<Flame className="h-4 w-4" />}
          label="🔥 Current Streak"
          value={`${dailyProgress?.currentStreak ?? 0}d`}
        />
        <StatTile
          icon={<Trophy className="h-4 w-4" />}
          label="🏆 Highest Streak"
          value={`${dailyProgress?.highestStreak ?? 0}d`}
        />
        <StatTile
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="✅ Today's Progress"
          value={`${Math.min(dailyProgress?.solvedToday ?? 0, 2)}/2`}
        />
        <StatTile icon={<Star className="h-4 w-4" />} label="Points" value={profile?.xp ?? 0} />
        <StatTile
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Completed"
          value={completionCount ?? 0}
        />
        <StatTile icon={<TrendingUp className="h-4 w-4" />} label="Level" value={level.level} />
        <StatTile
          icon={<Trophy className="h-4 w-4" />}
          label="Rank"
          value={leaderboard?.myRank ? `#${leaderboard.myRank}` : "—"}
        />
        <StatTile
          icon={<Award className="h-4 w-4" />}
          label="Badges"
          value={myBadges?.length ?? 0}
        />
      </div>

      <div className="mb-8 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Level {level.level}{" "}
            <span className="text-muted-foreground">
              · {level.currentLevelXp}/{level.xpForNextLevel} XP
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Coins className="h-3.5 w-3.5 text-warning" /> {profile?.coins ?? 0} coins
          </span>
        </div>
        <Progress value={level.progressPct} className="mt-2" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <TodaysChallengeCard profileId={user?.id} />
        <DailyChallengeCalendar profileId={user?.id} />
      </div>

      <BadgesRow profileId={user?.id} />

      <AnalyticsSection profileId={user?.id} />

      <BrowseChallenges />
    </AppShell>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1.5 font-display text-2xl">{value}</div>
    </div>
  );
}

function TodaysChallengeCard({ profileId }: { profileId: string | undefined }) {
  const { data: challenge, isLoading } = useTodaysDailyChallenge();
  const { data: status } = useMyDailyChallengeStatus(profileId);
  const skip = useSkipTodaysChallenge(profileId, challenge?.id);
  const [showConfetti, setShowConfetti] = useState(!!status?.completed);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground backdrop-blur-sm">
        No active challenges available yet. Check back soon.
      </div>
    );
  }

  const category = (challenge as unknown as { category: { name: string } | null }).category;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand-soft/60 to-card/60 p-6 backdrop-blur-sm">
      {status?.completed && showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-brand">
        <Sparkles className="h-3.5 w-3.5" /> Today's Challenge
      </div>

      <h2 className="mt-2 font-display text-2xl leading-tight">{challenge.title}</h2>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full px-2 py-0.5 font-medium capitalize ${DIFFICULTY_TONE[challenge.difficulty] ?? ""}`}
        >
          {challenge.difficulty}
        </span>
        {category && <UIBadge variant="secondary">{category.name}</UIBadge>}
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {challenge.estimated_minutes} min
        </span>
      </div>

      <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{challenge.description}</p>

      {status?.completed ? (
        <div className="mt-5 flex items-center gap-2">
          <UIBadge className="bg-brand text-brand-foreground hover:bg-brand">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Completed today
          </UIBadge>
          <Link to="/challenges/$slug" params={{ slug: challenge.slug }}>
            <Button size="sm" variant="outline">
              Review it
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link to="/challenges/$slug" params={{ slug: challenge.slug }}>
            <Button>
              <Sparkles className="mr-1.5 h-4 w-4" /> Solve Challenge
            </Button>
          </Link>
          {status?.skipped ? (
            <UIBadge variant="secondary">Skipped today</UIBadge>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => skip.mutate()}
              disabled={skip.isPending}
            >
              <SkipForward className="mr-1.5 h-3.5 w-3.5" /> Skip for today
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function BadgesRow({ profileId }: { profileId: string | undefined }) {
  const { data: definitions } = useBadgeDefinitions();
  const { data: myBadges } = useMyBadges(profileId);
  const earnedCodes = new Set((myBadges ?? []).map((b) => b.badge_code));

  if (!definitions || definitions.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-3 font-display text-xl">Badges</h2>
      <div className="flex flex-wrap gap-3">
        {definitions.map((def) => {
          const Icon = BADGE_ICONS[def.icon as keyof typeof BADGE_ICONS] ?? Award;
          const earned = earnedCodes.has(def.code);
          return (
            <div
              key={def.code}
              title={def.description ?? def.name}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs backdrop-blur-sm ${
                earned
                  ? "border-brand/40 bg-brand-soft/60 text-foreground"
                  : "border-border bg-card/40 text-muted-foreground opacity-60"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${earned ? "text-brand" : ""}`} />
              {def.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsSection({ profileId }: { profileId: string | undefined }) {
  const { data } = useChallengeAnalytics(profileId);
  if (!data) return null;

  const totalDiff =
    data.difficultyDistribution.easy +
    data.difficultyDistribution.medium +
    data.difficultyDistribution.hard;

  return (
    <div className="mb-8 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm">
      <h2 className="mb-4 font-display text-xl">Your analytics</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground">Attempted</div>
          <div className="font-display text-xl">{data.attempted}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Solved</div>
          <div className="font-display text-xl">{data.solved}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Skipped</div>
          <div className="font-display text-xl">{data.skipped}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Avg time</div>
          <div className="font-display text-xl">
            {data.avgTimeSeconds != null ? `${Math.round(data.avgTimeSeconds / 60)}m` : "—"}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-3 text-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-brand" /> Favorite topic
          </div>
          {data.favoriteTopic ? (
            <div>
              {data.favoriteTopic.name}{" "}
              <span className="text-muted-foreground">({data.favoriteTopic.solved} solved)</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Not enough data yet</span>
          )}
        </div>
        <div className="rounded-xl border border-border bg-background p-3 text-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingDown className="h-3.5 w-3.5 text-warning" /> Needs work
          </div>
          {data.weakTopic ? (
            <div>
              {data.weakTopic.name}{" "}
              <span className="text-muted-foreground">
                ({Math.round(data.weakTopic.accuracy * 100)}% accuracy)
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Not enough data yet</span>
          )}
        </div>
      </div>

      {totalDiff > 0 && (
        <div className="mt-5">
          <div className="mb-1.5 text-xs text-muted-foreground">Difficulty distribution</div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-emerald-500"
              style={{ width: `${(data.difficultyDistribution.easy / totalDiff) * 100}%` }}
            />
            <div
              className="bg-amber-500"
              style={{ width: `${(data.difficultyDistribution.medium / totalDiff) * 100}%` }}
            />
            <div
              className="bg-rose-500"
              style={{ width: `${(data.difficultyDistribution.hard / totalDiff) * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex gap-3 text-[11px] text-muted-foreground">
            <span>Easy {data.difficultyDistribution.easy}</span>
            <span>Medium {data.difficultyDistribution.medium}</span>
            <span>Hard {data.difficultyDistribution.hard}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function BrowseChallenges() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [company, setCompany] = useState("all");

  const { data: categories } = useChallengeCategories();
  const { data: companyTags } = useChallengeCompanyTags();
  const { data: challenges, isLoading } = useChallenges({
    search: search.trim() || undefined,
    category: category === "all" ? undefined : category,
    difficulty: difficulty === "all" ? undefined : difficulty,
    company: company === "all" ? undefined : company,
  });

  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return (
    <div>
      <h2 className="mb-3 font-display text-xl">Browse all challenges</h2>
      <div className="mb-5 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title…"
            className="h-10 pl-10"
          />
        </div>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All difficulties</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All topics</SelectItem>
            {(categories ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={company} onValueChange={setCompany}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {(companyTags ?? []).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading challenges…</div>
      ) : !challenges || challenges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No challenges match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((c) => (
            <Link
              key={c.id}
              to="/challenges/$slug"
              params={{ slug: c.slug }}
              className="rounded-2xl border border-border bg-card p-5 transition hover:border-foreground/30"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium capitalize ${DIFFICULTY_TONE[c.difficulty] ?? ""}`}
                >
                  {c.difficulty}
                </span>
                {c.category_id && (
                  <UIBadge variant="secondary">
                    {categoryName.get(c.category_id) ?? "Topic"}
                  </UIBadge>
                )}
              </div>
              <h3 className="mt-2 font-display text-lg leading-tight">{c.title}</h3>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {c.estimated_minutes} min
                </span>
                <span className="inline-flex items-center gap-1">
                  <Target className="h-3.5 w-3.5" /> +{c.xp_reward} XP
                </span>
              </div>
              {c.company_tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                  <Building2 className="h-3 w-3" /> {c.company_tags.slice(0, 3).join(", ")}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
