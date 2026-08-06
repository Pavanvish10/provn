import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import {
  startCodingInterviewFn,
  runCodingInterviewSampleFn,
  submitCodingInterviewFn,
  type CodingExample,
} from "@/lib/coding-interview.server";

export type CodingInterviewSession =
  Database["public"]["Tables"]["coding_interview_sessions"]["Row"];
// The browser must never see `test_cases` — it holds the hidden test
// cases' expected outputs, which would let a candidate read the answers
// straight out of the network tab. Every client-side read below uses this
// explicit column list instead of `select("*")`.
export type CodingInterviewSessionSafe = Omit<CodingInterviewSession, "test_cases">;
export type { CodingExample };

const SAFE_COLUMNS =
  "id, profile_id, target_company, target_role, difficulty, title, description, constraints, examples, sample_test_cases, language, source_code, status, passed_count, total_count, runtime_ms, stdout, stderr, correctness_score, time_complexity_score, space_complexity_score, code_quality_score, edge_case_score, optimization_score, overall_score, mistakes, better_solution, optimization_suggestions, learning_resources, resume_id, career_roadmap_id, roadmap_progress_percent, ats_score, created_at, completed_at";

export function useCodingInterviewHistory(profileId: string | undefined) {
  return useQuery({
    queryKey: ["coding-interview-sessions", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("coding_interview_sessions")
        .select(SAFE_COLUMNS)
        .eq("profile_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as CodingInterviewSessionSafe[];
    },
    enabled: !!profileId,
  });
}

export function useCodingInterviewSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["coding-interview-session", sessionId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("coding_interview_sessions")
        .select(SAFE_COLUMNS)
        .eq("id", sessionId!)
        .single();
      if (error) throw error;
      return data as unknown as CodingInterviewSessionSafe;
    },
    enabled: !!sessionId,
  });
}

export function useStartCodingInterview(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      targetRole: string;
      targetCompany?: string;
      difficulty: "easy" | "medium" | "hard";
    }) => startCodingInterviewFn({ data: vars }),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["coding-interview-sessions", profileId] });
      }
    },
  });
}

export function useRunCodingInterviewSample() {
  return useMutation({
    mutationFn: async (vars: { sessionId: string; judge0Id: number; source: string }) =>
      runCodingInterviewSampleFn({ data: vars }),
  });
}

export function useSubmitCodingInterview(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      sessionId: string;
      judge0Id: number;
      language: string;
      source: string;
    }) => submitCodingInterviewFn({ data: vars }),
    onSuccess: (result, vars) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["coding-interview-sessions", profileId] });
        queryClient.invalidateQueries({ queryKey: ["coding-interview-session", vars.sessionId] });
      }
    },
  });
}
