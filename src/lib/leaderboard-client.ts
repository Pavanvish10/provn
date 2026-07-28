import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type LeaderboardTab =
  "global" | "alltime" | "college" | "role" | "friends" | "weekly" | "monthly";

export type LeaderboardBadge = { code: string; name: string; icon: string | null };

export type LeaderboardRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  college: string | null;
  target_role: string | null;
  xp: number;
  coins: number;
  streak: number;
  longest_streak: number;
  /** Distinct problems solved — lifetime, or within the tab's window for Weekly/Monthly. */
  solved: number;
  /** passed / total submissions * 100, or null if the user has zero submissions (never shown as 0%). */
  accuracy: number | null;
  /** XP earned inside the tab's window. Only populated for Weekly/Monthly; null elsewhere. */
  windowXp: number | null;
  /** Composite ranking value for this tab — see the score functions below for the formula. */
  score: number;
  badges: LeaderboardBadge[];
};

export type LeaderboardEmptyReason =
  | "no-college" // viewer hasn't set a college
  | "no-college-peers" // college is set, but no one else shares it yet
  | "no-role" // viewer hasn't set a target role
  | "no-role-peers" // role is set, but no one else shares it yet
  | "no-friends" // zero accepted friendships
  | "no-activity-window" // nobody has earned XP in this window yet
  | null;

export type LeaderboardResult = {
  /** Full ranked pool for this tab (capped — see POOL_CAP), already sorted best-first. Slice client-side to paginate. */
  rows: LeaderboardRow[];
  count: number;
  /** 1-based rank of the signed-in user in this tab, or null if they're not part of the ranked pool. */
  myRank: number | null;
  emptyReason: LeaderboardEmptyReason;
};

// Bounds how many profiles we pull full stats for per tab. Comfortably above
// any realistic cohort for this app today; if the user base grows well past
// this, ranking beyond the cap should move to a SQL view/RPC instead of the
// client-side aggregation used here. Flagged in the PR notes.
const POOL_CAP = 500;

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type LeaderboardCandidate = Pick<
  ProfileRow,
  | "id"
  | "full_name"
  | "username"
  | "avatar_url"
  | "college"
  | "target_role"
  | "xp"
  | "coins"
  | "streak"
  | "longest_streak"
>;

const PROFILE_COLUMNS =
  "id, full_name, username, avatar_url, college, target_role, xp, coins, streak, longest_streak";

function accuracyOf(passed: number, total: number): number | null {
  return total > 0 ? Math.round((passed / total) * 1000) / 10 : null;
}

// ---------------------------------------------------------------------
// Ranking formulas. XP is the platform's primary currency of progress, so
// every "lifetime" tab (Global, College, Role, Friends) is XP-dominant:
// solved-count, current streak, and accuracy each add only a modest nudge
// that mostly matters as a tie-break between users bunched at similar XP.
//
// All Time deliberately flips which term dominates — problems solved —
// so it answers a genuinely different question ("who has solved the most,
// ever") instead of being a relabeled copy of Global.
//
// Weekly/Monthly are dominant on XP *earned in that window* (not lifetime
// XP), with solved-in-window/streak/accuracy as the same modest nudge.
// ---------------------------------------------------------------------
function lifetimeScore(r: {
  xp: number;
  solved: number;
  streak: number;
  accuracy: number | null;
}): number {
  return r.xp + r.solved * 2 + r.streak * 4 + (r.accuracy ?? 0) * 0.5;
}

function allTimeScore(r: {
  xp: number;
  solved: number;
  streak: number;
  accuracy: number | null;
}): number {
  return r.solved * 25 + r.xp * 0.05 + r.streak * 4 + (r.accuracy ?? 0) * 0.5;
}

function windowScore(r: {
  windowXp: number;
  solved: number;
  streak: number;
  accuracy: number | null;
}): number {
  return r.windowXp + r.solved * 2 + r.streak * 4 + (r.accuracy ?? 0) * 0.5;
}

type SubmissionAgg = { passed: number; total: number; solvedSet: Set<string> };

function aggregateSubmissions(
  rows: { profile_id: string; challenge_id: string; status: string }[],
): Map<string, SubmissionAgg> {
  const agg = new Map<string, SubmissionAgg>();
  rows.forEach((row) => {
    const entry = agg.get(row.profile_id) ?? { passed: 0, total: 0, solvedSet: new Set<string>() };
    entry.total += 1;
    if (row.status === "passed") {
      entry.passed += 1;
      entry.solvedSet.add(row.challenge_id);
    }
    agg.set(row.profile_id, entry);
  });
  return agg;
}

async function fetchSubmissionAgg(
  ids: string[],
  createdAfter?: string,
): Promise<Map<string, SubmissionAgg>> {
  if (ids.length === 0) return new Map();
  const supabase = getSupabaseBrowserClient();
  let query = supabase
    .from("challenge_submissions")
    .select("profile_id, challenge_id, status")
    .in("profile_id", ids);
  if (createdAfter) query = query.gte("created_at", createdAfter);
  const { data, error } = await query;
  if (error) throw error;
  return aggregateSubmissions(
    (data ?? []) as { profile_id: string; challenge_id: string; status: string }[],
  );
}

type BadgeJoinRow = {
  profile_id: string;
  badge_code: string;
  badge_definitions: { name: string; icon: string | null } | null;
};

async function fetchBadges(ids: string[]): Promise<Map<string, LeaderboardBadge[]>> {
  const map = new Map<string, LeaderboardBadge[]>();
  if (ids.length === 0) return map;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_badges")
    .select("profile_id, badge_code, badge_definitions(name, icon)")
    .in("profile_id", ids)
    .order("earned_at", { ascending: true });
  if (error) throw error;
  ((data ?? []) as unknown as BadgeJoinRow[]).forEach((row) => {
    const list = map.get(row.profile_id) ?? [];
    list.push({
      code: row.badge_code,
      name: row.badge_definitions?.name ?? row.badge_code,
      icon: row.badge_definitions?.icon ?? null,
    });
    map.set(row.profile_id, list);
  });
  return map;
}

function assembleRows(
  profiles: LeaderboardCandidate[],
  submissionAgg: Map<string, SubmissionAgg>,
  badgeMap: Map<string, LeaderboardBadge[]>,
  scoreFn: (r: {
    xp: number;
    solved: number;
    streak: number;
    accuracy: number | null;
    windowXp: number;
  }) => number,
  windowXpMap?: Map<string, number>,
): LeaderboardRow[] {
  const rows: LeaderboardRow[] = profiles.map((p) => {
    const agg = submissionAgg.get(p.id);
    const solved = agg ? agg.solvedSet.size : 0;
    const accuracy = agg ? accuracyOf(agg.passed, agg.total) : null;
    const windowXp = windowXpMap?.get(p.id) ?? 0;
    const score = scoreFn({ xp: p.xp, solved, streak: p.streak, accuracy, windowXp });
    return {
      ...p,
      solved,
      accuracy,
      windowXp: windowXpMap ? windowXp : null,
      score,
      badges: badgeMap.get(p.id) ?? [],
    };
  });
  rows.sort(
    (a, b) =>
      b.score - a.score || b.xp - a.xp || (a.full_name ?? "").localeCompare(b.full_name ?? ""),
  );
  return rows;
}

function startOfWeekUTC(d: Date): Date {
  const day = d.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + diffToMonday);
  return monday;
}

function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

async function fetchLeaderboard(
  tab: LeaderboardTab,
  userId: string,
  myCollege: string | null | undefined,
  myTargetRole: string | null | undefined,
): Promise<LeaderboardResult> {
  const supabase = getSupabaseBrowserClient();
  const empty = (reason: LeaderboardEmptyReason): LeaderboardResult => ({
    rows: [],
    count: 0,
    myRank: null,
    emptyReason: reason,
  });

  if (tab === "global") {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("account_type", "student")
      .order("xp", { ascending: false })
      .limit(POOL_CAP);
    if (error) throw error;
    const pool = (data ?? []) as LeaderboardCandidate[];
    const ids = pool.map((p) => p.id);
    const [agg, badges] = await Promise.all([fetchSubmissionAgg(ids), fetchBadges(ids)]);
    const rows = assembleRows(pool, agg, badges, lifetimeScore);
    const poolRank = rows.findIndex((r) => r.id === userId);
    if (poolRank !== -1) {
      return { rows, count: rows.length, myRank: poolRank + 1, emptyReason: null };
    }
    // Outside the top POOL_CAP by XP — fall back to an exact DB-level count
    // rather than reporting "unranked" for someone who clearly has a rank.
    const { data: meRow, error: meErr } = await supabase
      .from("profiles")
      .select("xp")
      .eq("id", userId)
      .maybeSingle();
    if (meErr) throw meErr;
    const { count: aheadCount, error: countErr } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("account_type", "student")
      .gt("xp", meRow?.xp ?? 0);
    if (countErr) throw countErr;
    return { rows, count: rows.length, myRank: (aheadCount ?? 0) + 1, emptyReason: null };
  }

  if (tab === "alltime") {
    const { data, error } = await supabase
      .from("challenge_submissions")
      .select("profile_id, challenge_id, status");
    if (error) throw error;
    const agg = aggregateSubmissions(
      (data ?? []) as { profile_id: string; challenge_id: string; status: string }[],
    );
    if (agg.size === 0) return empty(null);
    const sortedIds = Array.from(agg.entries())
      .sort((a, b) => b[1].solvedSet.size - a[1].solvedSet.size)
      .map(([id]) => id)
      .slice(0, POOL_CAP);
    const { data: profileData, error: profileErr } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .in("id", sortedIds);
    if (profileErr) throw profileErr;
    const byId = new Map((profileData ?? []).map((p) => [p.id, p as LeaderboardCandidate]));
    const orderedPool = sortedIds
      .map((id) => byId.get(id))
      .filter((p): p is LeaderboardCandidate => !!p);
    const badges = await fetchBadges(sortedIds);
    const rows = assembleRows(orderedPool, agg, badges, allTimeScore);
    const myRank = rows.findIndex((r) => r.id === userId);
    if (myRank === -1) {
      const mine = agg.get(userId);
      if (!mine) return { rows, count: rows.length, myRank: null, emptyReason: null };
      const ahead = Array.from(agg.values()).filter(
        (v) => v.solvedSet.size > mine.solvedSet.size,
      ).length;
      return { rows, count: rows.length, myRank: ahead + 1, emptyReason: null };
    }
    return { rows, count: rows.length, myRank: myRank + 1, emptyReason: null };
  }

  if (tab === "college") {
    if (!myCollege) return empty("no-college");
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("account_type", "student")
      .eq("college", myCollege)
      .limit(POOL_CAP);
    if (error) throw error;
    const pool = (data ?? []) as LeaderboardCandidate[];
    if (pool.filter((p) => p.id !== userId).length === 0) return empty("no-college-peers");
    const ids = pool.map((p) => p.id);
    const [agg, badges] = await Promise.all([fetchSubmissionAgg(ids), fetchBadges(ids)]);
    const rows = assembleRows(pool, agg, badges, lifetimeScore);
    const myRank = rows.findIndex((r) => r.id === userId);
    return {
      rows,
      count: rows.length,
      myRank: myRank === -1 ? null : myRank + 1,
      emptyReason: null,
    };
  }

  if (tab === "role") {
    if (!myTargetRole) return empty("no-role");
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("account_type", "student")
      .eq("target_role", myTargetRole)
      .limit(POOL_CAP);
    if (error) throw error;
    const pool = (data ?? []) as LeaderboardCandidate[];
    if (pool.filter((p) => p.id !== userId).length === 0) return empty("no-role-peers");
    const ids = pool.map((p) => p.id);
    const [agg, badges] = await Promise.all([fetchSubmissionAgg(ids), fetchBadges(ids)]);
    const rows = assembleRows(pool, agg, badges, lifetimeScore);
    const myRank = rows.findIndex((r) => r.id === userId);
    return {
      rows,
      count: rows.length,
      myRank: myRank === -1 ? null : myRank + 1,
      emptyReason: null,
    };
  }

  if (tab === "friends") {
    const { data: rels, error: relError } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (relError) throw relError;
    const friendIds = new Set<string>();
    (rels ?? []).forEach((r) =>
      friendIds.add(r.requester_id === userId ? r.addressee_id : r.requester_id),
    );
    if (friendIds.size === 0) return empty("no-friends");
    const ids = [userId, ...Array.from(friendIds)];
    const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", ids);
    if (error) throw error;
    const pool = (data ?? []) as LeaderboardCandidate[];
    const [agg, badges] = await Promise.all([fetchSubmissionAgg(ids), fetchBadges(ids)]);
    const rows = assembleRows(pool, agg, badges, lifetimeScore);
    const myRank = rows.findIndex((r) => r.id === userId);
    return {
      rows,
      count: rows.length,
      myRank: myRank === -1 ? null : myRank + 1,
      emptyReason: null,
    };
  }

  // weekly / monthly
  const windowStart = tab === "weekly" ? startOfWeekUTC(new Date()) : startOfMonthUTC(new Date());
  const windowStartDate = windowStart.toISOString().slice(0, 10);
  const windowStartIso = windowStart.toISOString();

  const { data: activity, error: activityErr } = await supabase
    .from("daily_activity")
    .select("profile_id, xp_earned")
    .gte("activity_date", windowStartDate);
  if (activityErr) throw activityErr;
  const windowXpMap = new Map<string, number>();
  (activity ?? []).forEach((r) => {
    windowXpMap.set(r.profile_id, (windowXpMap.get(r.profile_id) ?? 0) + r.xp_earned);
  });
  if (windowXpMap.size === 0) return empty("no-activity-window");

  const sortedIds = Array.from(windowXpMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, POOL_CAP);
  const { data: profileData, error: profileErr } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .in("id", sortedIds);
  if (profileErr) throw profileErr;
  const byId = new Map((profileData ?? []).map((p) => [p.id, p as LeaderboardCandidate]));
  const orderedPool = sortedIds
    .map((id) => byId.get(id))
    .filter((p): p is LeaderboardCandidate => !!p);
  const [agg, badges] = await Promise.all([
    fetchSubmissionAgg(sortedIds, windowStartIso),
    fetchBadges(sortedIds),
  ]);
  const rows = assembleRows(orderedPool, agg, badges, windowScore, windowXpMap);
  const myRank = rows.findIndex((r) => r.id === userId);
  if (myRank === -1) {
    const mineXp = windowXpMap.get(userId);
    if (mineXp === undefined) return { rows, count: rows.length, myRank: null, emptyReason: null };
    const ahead = Array.from(windowXpMap.values()).filter((v) => v > mineXp).length;
    return { rows, count: rows.length, myRank: ahead + 1, emptyReason: null };
  }
  return { rows, count: rows.length, myRank: myRank + 1, emptyReason: null };
}

export function useLeaderboard(
  tab: LeaderboardTab,
  userId: string | undefined,
  myCollege: string | null | undefined,
  myTargetRole: string | null | undefined,
) {
  return useQuery({
    queryKey: ["leaderboard", tab, userId, myCollege, myTargetRole],
    queryFn: () => fetchLeaderboard(tab, userId!, myCollege, myTargetRole),
    enabled: !!userId,
    // Simpler than wiring a broad realtime subscription for a composite,
    // multi-query ranking like this — profiles is in supabase_realtime, but a
    // 30s poll keeps the board visibly fresh without extra channel plumbing.
    refetchInterval: 30_000,
  });
}

/**
 * Weekly/Monthly consecutive-window streak, from compute_weekly_monthly_streak.
 * Informational only (shown as a small chip on Weekly/Monthly rows) — it is
 * intentionally NOT part of the ranking formula so that sorting the whole
 * pool never requires one RPC call per user; only the current page's ids are
 * looked up here.
 */
export function useWeeklyMonthlyStreaks(ids: string[]) {
  const key = ids.slice().sort().join(",");
  return useQuery({
    queryKey: ["leaderboard", "wm-streaks", key],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const results = await Promise.all(
        ids.map(async (id) => {
          const { data, error } = await supabase.rpc("compute_weekly_monthly_streak", {
            p_profile_id: id,
          });
          if (error) throw error;
          const row = data?.[0];
          return [
            id,
            { weekly: row?.weekly_streak ?? 0, monthly: row?.monthly_streak ?? 0 },
          ] as const;
        }),
      );
      return new Map(results);
    },
    enabled: ids.length > 0,
  });
}
