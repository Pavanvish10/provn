import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import {
  Flame,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Award,
  Sparkles,
  Medal,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useProfile } from "@/lib/profile-client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useLeaderboard,
  useWeeklyMonthlyStreaks,
  type LeaderboardRow,
  type LeaderboardTab,
} from "@/lib/leaderboard-client";

export const Route = createFileRoute("/leaderboard")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Leaderboard · Provn" },
      { name: "description", content: "Real XP and streaks — ranked across every Provn user." },
      { property: "og:title", content: "Leaderboard · Provn" },
      { property: "og:description", content: "XP compounds. See who's compounding hardest." },
    ],
  }),
  component: LB,
});

const PAGE_SIZE = 25;

const TABS: { id: LeaderboardTab; label: string }[] = [
  { id: "global", label: "Global" },
  { id: "college", label: "College" },
  { id: "friends", label: "Friends" },
  { id: "role", label: "Role" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "alltime", label: "All Time" },
];

const BADGE_ICONS: Record<string, LucideIcon> = { Trophy, Flame, Sparkles, Award };

function BadgeGlyph({ icon, title }: { icon: string | null; title: string }) {
  const Icon = (icon && BADGE_ICONS[icon]) || Medal;
  return (
    <span
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-brand"
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

function BadgeRow({ badges }: { badges: LeaderboardRow["badges"] }) {
  if (badges.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const visible = badges.slice(0, 4);
  const extra = badges.length - visible.length;
  return (
    <div className="flex items-center gap-1">
      {visible.map((b) => (
        <BadgeGlyph key={b.code} icon={b.icon} title={b.name} />
      ))}
      {extra > 0 && <span className="text-xs text-muted-foreground">+{extra} more</span>}
    </div>
  );
}

function formatAccuracy(accuracy: number | null) {
  return accuracy === null ? "—" : `${accuracy}%`;
}

function Avatar({
  url,
  name,
  size = 8,
}: {
  url: string | null;
  name: string | null;
  size?: number;
}) {
  const px = size === 14 ? "h-14 w-14" : size === 10 ? "h-10 w-10" : "h-8 w-8";
  if (url) return <img src={url} className={`${px} rounded-full bg-muted object-cover`} alt="" />;
  return (
    <div
      className={`flex ${px} items-center justify-center rounded-full bg-muted font-display text-sm`}
    >
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function emptyMessage(
  reason: NonNullable<import("@/lib/leaderboard-client").LeaderboardEmptyReason>,
) {
  switch (reason) {
    case "no-college":
      return "Add your college in your profile to see how you stack up against classmates.";
    case "no-college-peers":
      return "No one else from your college has joined Provn yet — invite your classmates.";
    case "no-role":
      return "Set a target role in your profile to compare with peers chasing the same job.";
    case "no-role-peers":
      return "No one else is targeting this role yet — check back soon.";
    case "no-friends":
      return "Not enough friends yet to rank — add some friends to compare progress.";
    case "no-activity-window":
      return "No one has earned XP in this window yet — be the first.";
  }
}

function LB() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("global");

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Leaderboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Solve challenges, verify skills, and climb — ranked by real XP.
          </p>
        </div>
        <Trophy className="h-8 w-8 text-brand" />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeaderboardTab)}>
        <TabsList className="mb-6 h-auto flex-wrap justify-start gap-1 bg-muted p-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-0">
            {activeTab === t.id && (
              <LeaderboardBody
                key={t.id}
                tab={t.id}
                userId={user?.id}
                college={profile?.college}
                targetRole={profile?.target_role}
                meProfile={profile ?? null}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </AppShell>
  );
}

function LeaderboardBody({
  tab,
  userId,
  college,
  targetRole,
  meProfile,
}: {
  tab: LeaderboardTab;
  userId: string | undefined;
  college: string | null | undefined;
  targetRole: string | null | undefined;
  meProfile: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    college: string | null;
    xp: number;
    coins: number;
    streak: number;
  } | null;
}) {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useLeaderboard(tab, userId, college, targetRole);

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const pageIds = pageRows.map((r) => r.id);
  const streaksQuery = useWeeklyMonthlyStreaks(
    tab === "weekly" || tab === "monthly" ? pageIds : [],
  );

  const myRank = data?.myRank ?? null;
  const isMeOnPage =
    myRank !== null && myRank > page * PAGE_SIZE && myRank <= page * PAGE_SIZE + PAGE_SIZE;
  const myRowInPool = myRank !== null && myRank <= rows.length ? rows[myRank - 1] : null;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (data?.emptyReason) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        {emptyMessage(data.emptyReason)}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        No one has earned XP yet — be the first.
      </div>
    );
  }

  const showPodium = tab === "global" && page === 0;
  const top3 = showPodium ? pageRows.slice(0, 3) : [];
  const rest = showPodium ? pageRows.slice(3) : pageRows;
  const restRankOffset = showPodium ? 4 : page * PAGE_SIZE + 1;

  return (
    <>
      {top3.length > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {top3.map((u, i) => (
            <div
              key={u.id}
              className={`relative overflow-hidden rounded-2xl border p-6 ${
                i === 0 ? "border-brand bg-brand-soft" : "border-border bg-card"
              } ${u.id === userId ? "ring-2 ring-brand" : ""}`}
            >
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                #{i + 1}
              </div>
              <Avatar url={u.avatar_url} name={u.full_name} size={14} />
              <div className="mt-3 font-display text-2xl">
                {u.full_name || u.username || "Anonymous"}
              </div>
              {u.college && <div className="text-xs text-muted-foreground">{u.college}</div>}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-brand">{u.xp} XP</span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Flame className="h-4 w-4 text-brand" /> {u.streak}d
                </span>
                <span className="text-muted-foreground">{u.solved} solved</span>
              </div>
              <div className="mt-2">
                <BadgeRow badges={u.badges} />
              </div>
            </div>
          ))}
        </div>
      )}

      {myRank !== null && !isMeOnPage && (myRowInPool || meProfile) && (
        <div className="mb-3 overflow-hidden rounded-2xl border border-brand bg-brand-soft">
          <RowLine
            rank={myRank}
            row={
              myRowInPool ?? {
                id: meProfile!.id,
                full_name: meProfile!.full_name,
                username: meProfile!.username,
                avatar_url: meProfile!.avatar_url,
                college: meProfile!.college,
                target_role: null,
                xp: meProfile!.xp,
                coins: meProfile!.coins,
                streak: meProfile!.streak,
                longest_streak: 0,
                solved: 0,
                accuracy: null,
                windowXp: null,
                score: 0,
                badges: [],
              }
            }
            isMe
            tab={tab}
            label="Your rank"
            streaks={streaksQuery.data}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[40px_1fr_80px_70px_70px_100px] gap-2 border-b border-border p-3 text-xs uppercase tracking-widest text-muted-foreground">
          <div>#</div>
          <div>User</div>
          <div className="text-right">
            {tab === "weekly" || tab === "monthly" ? "XP earned" : "XP"}
          </div>
          <div className="text-right">Coins</div>
          <div className="text-right">Streak</div>
          <div>Badges</div>
        </div>
        {rest.map((row, i) => (
          <RowLine
            key={row.id}
            rank={showPodium ? restRankOffset + i : restRankOffset + i}
            row={row}
            isMe={row.id === userId}
            tab={tab}
            streaks={streaksQuery.data}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Page {page + 1} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

function RowLine({
  rank,
  row,
  isMe,
  tab,
  label,
  streaks,
}: {
  rank: number;
  row: LeaderboardRow;
  isMe: boolean;
  tab: LeaderboardTab;
  label?: string;
  streaks?: Map<string, { weekly: number; monthly: number }>;
}) {
  const isWindow = tab === "weekly" || tab === "monthly";
  const primaryXp = isWindow ? `+${row.windowXp ?? 0}` : row.xp;
  const wm = streaks?.get(row.id);
  const wmLabel =
    isWindow && wm ? (tab === "weekly" ? `${wm.weekly}wk streak` : `${wm.monthly}mo streak`) : null;

  return (
    <div
      className={`grid grid-cols-[40px_1fr_80px_70px_70px_100px] items-center gap-2 border-b border-border p-3 last:border-b-0 hover:bg-muted ${
        isMe ? "bg-brand-soft/60" : ""
      }`}
    >
      <div className="text-sm text-muted-foreground">{label ? "" : `#${rank}`}</div>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar url={row.avatar_url} name={row.full_name} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm">{row.full_name || row.username || "Anonymous"}</span>
            {isMe && (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-brand-foreground">
                You
              </span>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {label ? `${label} #${rank}` : row.college || "—"}
            {" · "}
            {row.solved} solved · {formatAccuracy(row.accuracy)} acc
            {wmLabel ? ` · ${wmLabel}` : ""}
          </div>
        </div>
      </div>
      <div className="text-right text-sm font-medium">
        {primaryXp}
        {isWindow && (
          <div className="text-xs font-normal text-muted-foreground">{row.xp} lifetime</div>
        )}
      </div>
      <div className="text-right text-sm text-muted-foreground">{row.coins}</div>
      <div className="text-right text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Flame className="h-3.5 w-3.5 text-brand" /> {row.streak}
        </span>
      </div>
      <div>
        <BadgeRow badges={row.badges} />
      </div>
    </div>
  );
}
