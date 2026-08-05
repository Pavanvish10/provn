import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { getSupportedLanguagesFn, runSampleFn, submitChallengeFn } from "@/lib/judge0.server";
import { dailyProgressQueryKey } from "@/lib/daily-challenge-client";

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

export function useChallenges(params: {
  category?: string;
  difficulty?: string;
  search?: string;
  company?: string;
  /** Matches challenges whose starter_code has an entry for this language key. */
  language?: string;
}) {
  return useQuery({
    queryKey: ["challenges", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase.from("challenges").select("*").eq("is_active", true);
      if (params.category) query = query.eq("category_id", params.category);
      if (params.difficulty) query = query.eq("difficulty", params.difficulty);
      if (params.search) query = query.ilike("title", `%${params.search}%`);
      if (params.company) query = query.contains("company_tags", [params.company]);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      if (!params.language) return data;
      return (data ?? []).filter((c) =>
        Object.prototype.hasOwnProperty.call(
          (c.starter_code as Record<string, unknown>) ?? {},
          params.language!,
        ),
      );
    },
  });
}

/** Distinct company tags across all active challenges, for the search filter dropdown. */
export function useChallengeCompanyTags() {
  return useQuery({
    queryKey: ["challenge-company-tags"],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("challenges")
        .select("company_tags")
        .eq("is_active", true);
      if (error) throw error;
      const set = new Set<string>();
      for (const row of data ?? []) {
        for (const tag of row.company_tags ?? []) set.add(tag);
      }
      return Array.from(set).sort();
    },
    staleTime: 10 * 60 * 1000,
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

export function useSupportedLanguages() {
  return useQuery({
    queryKey: ["judge0-languages"],
    queryFn: () => getSupportedLanguagesFn(),
    staleTime: 60 * 60 * 1000,
  });
}

export function useRunSample() {
  return useMutation({
    mutationFn: (vars: { challengeId: string; judge0Id: number; source: string }) =>
      runSampleFn({ data: vars }),
  });
}

export function useSubmitChallenge(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      challengeId: string;
      judge0Id: number;
      language: string;
      source: string;
      timeTakenSeconds?: number;
      hintUsed?: boolean;
      localDate: string;
    }) => submitChallengeFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["daily-session"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: dailyProgressQueryKey(profileId) });
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

export function useChallengeStats(challengeIds: string[]) {
  return useQuery({
    queryKey: ["challenge-stats", challengeIds.slice().sort()],
    queryFn: async () => {
      if (challengeIds.length === 0) return new Map<string, number | null>();
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("challenge_stats")
        .select("challenge_id, acceptance_rate")
        .in("challenge_id", challengeIds);
      if (error) throw error;
      return new Map(
        (data ?? []).map((r) => [r.challenge_id as string, r.acceptance_rate as number | null]),
      );
    },
    enabled: challengeIds.length > 0,
  });
}
