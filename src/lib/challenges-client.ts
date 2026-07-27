import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ensureTodaysChallengesFn } from "@/lib/daily-challenges.server";
import { getSupportedLanguagesFn, runSampleFn, submitChallengeFn } from "@/lib/piston.server";

export type Challenge = Database["public"]["Tables"]["challenges"]["Row"];
export type ChallengeCategory = Database["public"]["Tables"]["challenge_categories"]["Row"];
export type Submission = Database["public"]["Tables"]["challenge_submissions"]["Row"];

export function useChallengeCategories() {
  return useQuery({
    queryKey: ["challenge-categories"],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from("challenge_categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useChallenges(params: { category?: string; difficulty?: string; search?: string }) {
  return useQuery({
    queryKey: ["challenges", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase.from("challenges").select("*").eq("is_active", true);
      if (params.category) query = query.eq("category_id", params.category);
      if (params.difficulty) query = query.eq("difficulty", params.difficulty);
      if (params.search) query = query.ilike("title", `%${params.search}%`);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useChallenge(slug: string | undefined) {
  return useQuery({
    queryKey: ["challenge", slug],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

export function useTodaysChallenges(profileId: string | undefined) {
  return useQuery({
    queryKey: ["daily-challenges", profileId],
    queryFn: async () => {
      const result = await ensureTodaysChallengesFn();
      if (result.error || result.challengeIds.length === 0)
        return { challenges: [], error: result.error };
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .in("id", result.challengeIds);
      if (error) throw error;

      const today = new Date().toISOString().slice(0, 10);
      const { data: assignments } = await supabase
        .from("daily_challenge_assignments")
        .select("challenge_id, completed")
        .eq("profile_id", profileId!)
        .eq("assigned_date", today);
      const completedMap = new Map((assignments ?? []).map((a) => [a.challenge_id, a.completed]));

      return {
        challenges: (data ?? []).map((c) => ({ ...c, completed: completedMap.get(c.id) ?? false })),
        error: null,
      };
    },
    enabled: !!profileId,
  });
}

export function useSupportedLanguages() {
  return useQuery({
    queryKey: ["piston-languages"],
    queryFn: () => getSupportedLanguagesFn(),
    staleTime: 60 * 60 * 1000,
  });
}

export function useRunSample() {
  return useMutation({
    mutationFn: (vars: {
      challengeId: string;
      language: string;
      version: string;
      source: string;
    }) => runSampleFn({ data: vars }),
  });
}

export function useSubmitChallenge(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      challengeId: string;
      language: string;
      version: string;
      source: string;
    }) => submitChallengeFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["daily-challenges", profileId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useMySubmissions(challengeId: string | undefined, profileId: string | undefined) {
  return useQuery({
    queryKey: ["submissions", challengeId, profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("challenge_submissions")
        .select("*")
        .eq("challenge_id", challengeId!)
        .eq("profile_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!challengeId && !!profileId,
  });
}

export function useLeaderboard(page: number) {
  const pageSize = 25;
  return useQuery({
    queryKey: ["leaderboard", page],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, xp, streak", { count: "exact" })
        .order("xp", { ascending: false })
        .order("streak", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
}
