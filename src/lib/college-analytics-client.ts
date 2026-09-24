import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Direct mirror of business-analytics-client.ts's useBusinessAnalytics,
// adapted for colleges/drives: placement_drives instead of jobs,
// drive_applications instead of job_applications. drive_applications has
// no companion status-history table (application_status_history doesn't
// exist on this side) — drive_shortlists (stage: shortlisted/interview/
// selected, one row per transition) is the real equivalent and is used
// the same way for conversion/time-to-stage.
export type CollegeAnalytics = {
  totalDrives: number;
  publishedDrives: number;
  totalApplicants: number;
  funnel: { stage: string; count: number }[];
  conversion: { stage: string; reached: number; rate: number }[];
  avgDaysToStage: { stage: string; days: number | null; sampleSize: number }[];
};

const FUNNEL_STAGES = [
  "applied",
  "shortlisted",
  "interview_scheduled",
  "selected",
  "rejected",
] as const;

const CONVERSION_STAGES = ["shortlisted", "interview", "selected"] as const;
const TIME_TO_STAGE_STAGES = ["shortlisted", "interview", "selected"] as const;

export function useCollegeAnalytics(collegeId: string | undefined) {
  return useQuery({
    queryKey: ["college-analytics", collegeId],
    queryFn: async (): Promise<CollegeAnalytics> => {
      const supabase = getSupabaseBrowserClient();
      const { data: drives } = await supabase
        .from("placement_drives")
        .select("id, status")
        .eq("college_id", collegeId!);
      const driveIds = (drives ?? []).map((d) => d.id);

      const { data: apps } =
        driveIds.length > 0
          ? await supabase
              .from("drive_applications")
              .select("id, applied_at")
              .in("drive_id", driveIds)
          : { data: [] as { id: string; applied_at: string }[] };
      const appIds = (apps ?? []).map((a) => a.id);
      const appliedAtById = new Map((apps ?? []).map((a) => [a.id, a.applied_at]));

      // Bounded fetch + JS reduce for distinct-per-stage counts and
      // time-to-stage — same "PostgREST has no COUNT(DISTINCT)" reasoning
      // as business-analytics-client.ts's identical pattern.
      const { data: shortlists } =
        appIds.length > 0
          ? await supabase
              .from("drive_shortlists")
              .select("application_id, stage, created_at")
              .in("application_id", appIds)
              .in("stage", CONVERSION_STAGES)
              .limit(5000)
          : { data: [] as { application_id: string; stage: string; created_at: string }[] };

      const firstReachedAt = new Map<string, Map<string, string>>();
      for (const row of shortlists ?? []) {
        let byStage = firstReachedAt.get(row.stage);
        if (!byStage) {
          byStage = new Map();
          firstReachedAt.set(row.stage, byStage);
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

      const [{ count: totalApplicants }, ...funnelCounts] = await Promise.all([
        driveIds.length > 0
          ? supabase
              .from("drive_applications")
              .select("id", { count: "exact", head: true })
              .in("drive_id", driveIds)
          : Promise.resolve({ count: 0 }),
        ...FUNNEL_STAGES.map((stage) =>
          driveIds.length > 0
            ? supabase
                .from("drive_applications")
                .select("id", { count: "exact", head: true })
                .in("drive_id", driveIds)
                .eq("status", stage)
            : Promise.resolve({ count: 0 }),
        ),
      ]);

      const funnel = FUNNEL_STAGES.map((stage, i) => ({
        stage,
        count: funnelCounts[i]?.count ?? 0,
      }));

      return {
        totalDrives: drives?.length ?? 0,
        publishedDrives: (drives ?? []).filter((d) => d.status === "published").length,
        totalApplicants: totalApplicants ?? 0,
        funnel,
        conversion,
        avgDaysToStage,
      };
    },
    enabled: !!collegeId,
  });
}
