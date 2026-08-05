import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type Badge = Database["public"]["Tables"]["badge_definitions"]["Row"];
export type UserBadge = Database["public"]["Tables"]["user_badges"]["Row"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Every user gets the same challenge each day — the RPC assigns (and
 * memoizes) it server-side, so this is safe to call from every client. */
export function todaysDailyChallengeQueryKey() {
  return ["daily-challenge", todayStr()] as const;
}

export function useTodaysDailyChallenge() {
  return useQuery({
    queryKey: todaysDailyChallengeQueryKey(),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: challengeId, error: rpcError } = await supabase.rpc(
        "get_or_assign_daily_challenge",
      );
      if (rpcError) throw rpcError;
      if (!challengeId) return null;

      const { data: challenge, error } = await supabase
        .from("challenges")
        .select("*, category:challenge_categories(name, slug)")
        .eq("id", challengeId)
        .single();
      if (error) throw error;
      return challenge;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyDailyChallengeStatus(profileId: string | undefined) {
  return useQuery({
    queryKey: ["daily-challenge-status", profileId, todayStr()],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const [{ data: completion, error: completionError }, { data: skip, error: skipError }] =
        await Promise.all([
          supabase
            .from("daily_challenge_completions")
            .select("*")
            .eq("profile_id", profileId!)
            .eq("challenge_date", todayStr())
            .maybeSingle(),
          supabase
            .from("daily_challenge_skips")
            .select("*")
            .eq("profile_id", profileId!)
            .eq("challenge_date", todayStr())
            .maybeSingle(),
        ]);
      if (completionError) throw completionError;
      if (skipError) throw skipError;
      return { completed: !!completion, skipped: !!skip };
    },
    enabled: !!profileId,
  });
}

export function useSkipTodaysChallenge(
  profileId: string | undefined,
  challengeId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!profileId || !challengeId) throw new Error("Not ready yet.");
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("daily_challenge_skips")
        .upsert(
          { profile_id: profileId, challenge_date: todayStr(), challenge_id: challengeId },
          { onConflict: "profile_id,challenge_date" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-challenge-status", profileId] });
    },
  });
}

/** Completed-day set for a given month, source for the streak calendar. */
export function useDailyChallengeCalendar(
  profileId: string | undefined,
  year: number,
  monthIndex0: number,
) {
  return useQuery({
    queryKey: ["daily-challenge-calendar", profileId, year, monthIndex0],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const start = new Date(Date.UTC(year, monthIndex0, 1)).toISOString().slice(0, 10);
      const end = new Date(Date.UTC(year, monthIndex0 + 1, 0)).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("daily_challenge_completions")
        .select("challenge_date")
        .eq("profile_id", profileId!)
        .gte("challenge_date", start)
        .lte("challenge_date", end);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.challenge_date));
    },
    enabled: !!profileId,
  });
}

export function useMyDailyChallengeCompletionCount(profileId: string | undefined) {
  return useQuery({
    queryKey: ["daily-challenge-completion-count", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { count, error } = await supabase
        .from("daily_challenge_completions")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profileId,
  });
}

export function useBadgeDefinitions() {
  return useQuery({
    queryKey: ["badge-definitions"],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from("badge_definitions").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useMyBadges(profileId: string | undefined) {
  return useQuery({
    queryKey: ["my-badges", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("user_badges")
        .select("*")
        .eq("profile_id", profileId!)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useMarkBadgesSeen(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (badgeIds: string[]) => {
      if (!profileId || badgeIds.length === 0) return;
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("user_badges")
        .update({ seen: true })
        .in("id", badgeIds)
        .eq("profile_id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-badges", profileId] });
    },
  });
}

export type ChallengeAnalytics = {
  attempted: number;
  solved: number;
  skipped: number;
  avgTimeSeconds: number | null;
  difficultyDistribution: { easy: number; medium: number; hard: number };
  favoriteTopic: { name: string; solved: number } | null;
  weakTopic: { name: string; accuracy: number } | null;
};

export function useChallengeAnalytics(profileId: string | undefined) {
  return useQuery({
    queryKey: ["challenge-analytics", profileId],
    queryFn: async (): Promise<ChallengeAnalytics> => {
      const supabase = getSupabaseBrowserClient();
      const [
        { data: submissions, error: subError },
        { data: skips, error: skipError },
        { data: categories, error: catError },
      ] = await Promise.all([
        supabase
          .from("challenge_submissions")
          .select(
            "challenge_id, status, time_taken_seconds, challenge:challenges(category_id, difficulty)",
          )
          .eq("profile_id", profileId!),
        supabase.from("daily_challenge_skips").select("id").eq("profile_id", profileId!),
        supabase.from("challenge_categories").select("id, name"),
      ]);
      if (subError) throw subError;
      if (skipError) throw skipError;
      if (catError) throw catError;

      const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]));
      const attemptedIds = new Set<string>();
      const solvedIds = new Set<string>();
      const times: number[] = [];
      const diffCounts = { easy: 0, medium: 0, hard: 0 };
      const topicAttempts = new Map<string, number>();
      const topicSolved = new Map<string, number>();

      for (const s of submissions ?? []) {
        attemptedIds.add(s.challenge_id);
        const c = (
          s as unknown as { challenge: { category_id: string | null; difficulty: string } | null }
        ).challenge;
        const topic = c?.category_id ? categoryName.get(c.category_id) : undefined;
        if (topic) topicAttempts.set(topic, (topicAttempts.get(topic) ?? 0) + 1);

        if (s.status === "passed" && !solvedIds.has(s.challenge_id)) {
          solvedIds.add(s.challenge_id);
          if (c?.difficulty === "easy") diffCounts.easy += 1;
          else if (c?.difficulty === "medium") diffCounts.medium += 1;
          else if (c?.difficulty === "hard") diffCounts.hard += 1;
          if (topic) topicSolved.set(topic, (topicSolved.get(topic) ?? 0) + 1);
          if (s.time_taken_seconds != null) times.push(s.time_taken_seconds);
        }
      }

      let favoriteTopic: ChallengeAnalytics["favoriteTopic"] = null;
      for (const [name, solved] of topicSolved) {
        if (!favoriteTopic || solved > favoriteTopic.solved) favoriteTopic = { name, solved };
      }

      let weakTopic: ChallengeAnalytics["weakTopic"] = null;
      for (const [name, attempts] of topicAttempts) {
        if (attempts < 2) continue;
        const accuracy = (topicSolved.get(name) ?? 0) / attempts;
        if (!weakTopic || accuracy < weakTopic.accuracy) weakTopic = { name, accuracy };
      }

      return {
        attempted: attemptedIds.size,
        solved: solvedIds.size,
        skipped: (skips ?? []).length,
        avgTimeSeconds: times.length
          ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
          : null,
        difficultyDistribution: diffCounts,
        favoriteTopic,
        weakTopic,
      };
    },
    enabled: !!profileId,
  });
}
