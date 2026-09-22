import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type BusinessAnalytics = {
  totalJobs: number;
  openJobs: number;
  totalApplicants: number;
  followers: number;
  funnel: { stage: string; count: number }[];
  jobsByWorkMode: { mode: string; count: number }[];
};

const FUNNEL_STAGES = [
  "applied",
  "viewed",
  "shortlisted",
  "interview",
  "selected",
  "hired",
] as const;

export function useBusinessAnalytics(companyId: string | undefined) {
  return useQuery({
    queryKey: ["business-analytics", companyId],
    queryFn: async (): Promise<BusinessAnalytics> => {
      const supabase = getSupabaseBrowserClient();
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, status, work_mode")
        .eq("company_id", companyId!);
      const jobIds = (jobs ?? []).map((j) => j.id);

      const [{ count: followers }, { count: totalApplicants }, ...funnelCounts] = await Promise.all(
        [
          supabase
            .from("company_follows")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId!),
          jobIds.length > 0
            ? supabase
                .from("job_applications")
                .select("id", { count: "exact", head: true })
                .in("job_id", jobIds)
            : Promise.resolve({ count: 0 }),
          ...FUNNEL_STAGES.map((stage) =>
            jobIds.length > 0
              ? supabase
                  .from("job_applications")
                  .select("id", { count: "exact", head: true })
                  .in("job_id", jobIds)
                  .eq("status", stage)
              : Promise.resolve({ count: 0 }),
          ),
        ],
      );

      const funnel = FUNNEL_STAGES.map((stage, i) => ({
        stage,
        count: funnelCounts[i]?.count ?? 0,
      }));

      const modeCounts = new Map<string, number>();
      for (const j of jobs ?? []) {
        const mode = j.work_mode ?? "unspecified";
        modeCounts.set(mode, (modeCounts.get(mode) ?? 0) + 1);
      }

      return {
        totalJobs: jobs?.length ?? 0,
        openJobs: (jobs ?? []).filter((j) => j.status === "open").length,
        totalApplicants: totalApplicants ?? 0,
        followers: followers ?? 0,
        funnel,
        jobsByWorkMode: Array.from(modeCounts.entries()).map(([mode, count]) => ({ mode, count })),
      };
    },
    enabled: !!companyId,
  });
}
