import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type MockInterview = Database["public"]["Tables"]["mock_interviews"]["Row"];

// Resume-uploaded status is checked via `useCurrentResume` in resume-client.ts —
// reuse that instead of duplicating the query here.

export function useHasPassedChallenge(profileId: string | undefined) {
  return useQuery({
    queryKey: ["verify-coding-test", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("challenge_submissions")
        .select("id")
        .eq("profile_id", profileId!)
        .eq("status", "passed")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!profileId,
  });
}

export function useLatestMockInterview(profileId: string | undefined) {
  return useQuery({
    queryKey: ["verify-mock-interview", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      // Only the technical mock interview counts toward job-application
      // verification — a soft-skills practice session (see
      // /interview-practice) must not satisfy this gate.
      const { data, error } = await supabase
        .from("mock_interviews")
        .select("*")
        .eq("profile_id", profileId!)
        .eq("mode", "technical")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}
