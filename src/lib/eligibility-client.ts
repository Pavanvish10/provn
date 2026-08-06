import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { generateEligibilityReportFn } from "@/lib/eligibility.server";

export type EligibilityReport = Database["public"]["Tables"]["eligibility_reports"]["Row"];

export type EligibilityScoreRationale = {
  atsScore: string;
  companyEligibility: string;
  roleMatch: string;
  skillMatch: string;
  interviewReadiness: string;
};

export type EligibilityRecommendations = {
  nextSkills: string[];
  projectsToBuild: string[];
  certifications: string[];
  codingTopics: string[];
  interviewPracticePriorities: string[];
};

export function useEligibilityHistory(profileId: string | undefined) {
  return useQuery({
    queryKey: ["eligibility-reports", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("eligibility_reports")
        .select("*")
        .eq("profile_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useGenerateEligibilityReport(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      targetRole: string;
      targetCompany?: string;
      jobDescriptionText?: string;
    }) => generateEligibilityReportFn({ data: vars }),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["eligibility-reports", profileId] });
      }
    },
  });
}
