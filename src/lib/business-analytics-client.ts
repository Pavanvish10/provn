import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type BusinessAnalytics = {
  totalJobs: number;
  openJobs: number;
  totalApplicants: number;
  followers: number;
  funnel: { stage: string; count: number }[];
  jobsByWorkMode: { mode: string; count: number }[];
  // Sprint 32: pipeline conversion (cumulative — "% of all applications
  // that ever reached this stage or beyond", not a snapshot of who's
  // currently sitting there) and average time-to-stage, both derived
  // from application_status_history so a candidate who's already moved
  // past a stage still counts as having reached it.
  conversion: { stage: string; reached: number; rate: number }[];
  avgDaysToStage: { stage: string; days: number | null; sampleSize: number }[];
};

const FUNNEL_STAGES = [
  "applied",
  "viewed",
  "shortlisted",
  "interview",
  "selected",
  "hired",
] as const;

const CONVERSION_STAGES = ["viewed", "shortlisted", "interview", "selected", "hired"] as const;
const TIME_TO_STAGE_STAGES = ["shortlisted", "interview", "hired"] as const;

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

      const { data: apps } =
        jobIds.length > 0
          ? await supabase.from("job_applications").select("id, applied_at").in("job_id", jobIds)
          : { data: [] as { id: string; applied_at: string }[] };
      const appIds = (apps ?? []).map((a) => a.id);
      const appliedAtById = new Map((apps ?? []).map((a) => [a.id, a.applied_at]));

      // Bounded fetch + JS reduce for distinct-per-stage counts and
      // time-to-stage — PostgREST's count doesn't support COUNT(DISTINCT),
      // so this mirrors the same "bounded fetch, reduce client-side"
      // pattern already established for admin-analytics-client.ts's
      // large aggregates. 5000 is generous for a single company's history.
      const { data: history } =
        appIds.length > 0
          ? await supabase
              .from("application_status_history")
              .select("application_id, to_status, created_at")
              .in("application_id", appIds)
              .in("to_status", CONVERSION_STAGES)
              .limit(5000)
          : { data: [] as { application_id: string; to_status: string; created_at: string }[] };

      const firstReachedAt = new Map<string, Map<string, string>>();
      for (const row of history ?? []) {
        let byStage = firstReachedAt.get(row.to_status);
        if (!byStage) {
          byStage = new Map();
          firstReachedAt.set(row.to_status, byStage);
        }
        const existing = byStage.get(row.application_id);
        if (!existing || row.created_at < existing) byStage.set(row.application_id, row.created_at);
      }

      const totalApplicationsForConversion = appIds.length;
      const conversion = CONVERSION_STAGES.map((stage) => {
        const reached = firstReachedAt.get(stage)?.size ?? 0;
        return {
          stage,
          reached,
          rate:
            totalApplicationsForConversion > 0
              ? Math.round((reached / totalApplicationsForConversion) * 1000) / 10
              : 0,
        };
      });

      const avgDaysToStage = TIME_TO_STAGE_STAGES.map((stage) => {
        const byStage = firstReachedAt.get(stage);
        if (!byStage || byStage.size === 0) return { stage, days: null, sampleSize: 0 };
        let totalMs = 0;
        let n = 0;
        for (const [appId, reachedAt] of byStage) {
          const appliedAt = appliedAtById.get(appId);
          if (!appliedAt) continue;
          totalMs += new Date(reachedAt).getTime() - new Date(appliedAt).getTime();
          n += 1;
        }
        return {
          stage,
          days: n > 0 ? Math.round((totalMs / n / (1000 * 60 * 60 * 24)) * 10) / 10 : null,
          sampleSize: n,
        };
      });

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
        conversion,
        avgDaysToStage,
      };
    },
    enabled: !!companyId,
  });
}
