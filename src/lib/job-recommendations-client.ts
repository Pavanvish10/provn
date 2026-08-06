import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import {
  generateJobRecommendationsFn,
  type JobRecommendationEntry,
  type JobRecommendationNextSteps,
  type RecommendationCategory,
} from "@/lib/job-recommendations.server";

export type JobRecommendationRun = Database["public"]["Tables"]["job_recommendations"]["Row"];
export type { JobRecommendationEntry, JobRecommendationNextSteps, RecommendationCategory };

export function useRecommendationHistory(profileId: string | undefined) {
  return useQuery({
    queryKey: ["job-recommendations", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("job_recommendations")
        .select("*")
        .eq("profile_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useGenerateJobRecommendations(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      preferredLocation?: string;
      minSalary?: number;
      experienceLevel?: string;
      remoteOnly?: boolean;
      internshipOnly?: boolean;
      fullTimeOnly?: boolean;
      targetRole?: string;
    }) => generateJobRecommendationsFn({ data: vars }),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["job-recommendations", profileId] });
      }
    },
  });
}
