// Student-facing interview data layer — separate from company-client.ts
// (which is the recruiter/HR side). Powers /my-interviews.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type InterviewSchedule = Database["public"]["Tables"]["interview_schedules"]["Row"];

export type MyInterview = InterviewSchedule & {
  application: {
    id: string;
    status: string;
    job: {
      id: string;
      title: string | null;
      location: string | null;
      employmentType: string | null;
      workMode: string | null;
      company: { id: string; companyName: string; logo: string | null } | null;
    } | null;
  } | null;
};

export function myInterviewsQueryKey(profileId: string | undefined) {
  return ["my-interviews", profileId] as const;
}

export function useMyInterviews(profileId: string | undefined) {
  return useQuery({
    queryKey: myInterviewsQueryKey(profileId),
    queryFn: async (): Promise<MyInterview[]> => {
      const supabase = getSupabaseBrowserClient();

      // interview_schedules has no applicant_id column of its own — find
      // this student's applications first, then their interviews.
      const { data: apps, error: appsError } = await supabase
        .from("job_applications")
        .select("id, status, job_id")
        .eq("applicant_id", profileId!);
      if (appsError) throw appsError;
      if (!apps || apps.length === 0) return [];

      const appIds = apps.map((a) => a.id);
      const jobIds = Array.from(new Set(apps.map((a) => a.job_id)));

      const [schedulesRes, jobsRes] = await Promise.all([
        supabase
          .from("interview_schedules")
          .select("*")
          .in("application_id", appIds)
          .order("scheduled_at", { ascending: true }),
        supabase
          .from("jobs")
          .select("id, title, location, employment_type, work_mode, company_id")
          .in("id", jobIds),
      ]);
      if (schedulesRes.error) throw schedulesRes.error;
      if (jobsRes.error) throw jobsRes.error;
      if (!schedulesRes.data || schedulesRes.data.length === 0) return [];

      const companyIds = Array.from(
        new Set((jobsRes.data ?? []).map((j) => j.company_id).filter((id): id is string => !!id)),
      );
      const companiesRes = companyIds.length
        ? await supabase.from("companies").select("id, company_name, logo").in("id", companyIds)
        : {
            data: [] as { id: string; company_name: string | null; logo: string | null }[],
            error: null,
          };
      if (companiesRes.error) throw companiesRes.error;

      const companyMap = new Map((companiesRes.data ?? []).map((c) => [c.id, c]));
      const jobMap = new Map((jobsRes.data ?? []).map((j) => [j.id, j]));
      const appMap = new Map(apps.map((a) => [a.id, a]));

      return schedulesRes.data.map((s) => {
        const app = appMap.get(s.application_id);
        const job = app ? jobMap.get(app.job_id) : undefined;
        const company = job?.company_id ? companyMap.get(job.company_id) : undefined;
        return {
          ...s,
          application: app
            ? {
                id: app.id,
                status: app.status,
                job: job
                  ? {
                      id: job.id,
                      title: job.title,
                      location: job.location,
                      employmentType: job.employment_type,
                      workMode: job.work_mode,
                      company: company
                        ? {
                            id: company.id,
                            companyName: company.company_name ?? "A company",
                            logo: company.logo,
                          }
                        : null,
                    }
                  : null,
              }
            : null,
        };
      });
    },
    enabled: !!profileId,
  });
}

// ---------------------------------------------------------------------
// Respond to an interview: Accept / Decline / Request another time.
// Backed by interview_schedules_applicant_update (migration
// 20260728000300), which lets the applicant update status/responded_at
// on their own row. Sprint 32 also fixed the trigger's UPDATE branch
// (on_interview_schedule_change) to notify the recruiter who scheduled
// it, not the applicant who just responded.
// ---------------------------------------------------------------------
export function useRespondToInterview(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      interviewId: string;
      status: "accepted" | "declined" | "reschedule_requested";
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("interview_schedules")
        .update({ status: input.status, responded_at: new Date().toISOString() })
        .eq("id", input.interviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myInterviewsQueryKey(profileId) });
    },
  });
}
