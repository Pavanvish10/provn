import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { computeApplicationScoresFn } from "@/lib/matching-scores.server";

export type Job = Database["public"]["Tables"]["jobs"]["Row"] & {
  companies: { company_name: string | null } | null;
};
export type JobApplication = Database["public"]["Tables"]["job_applications"]["Row"];

export function useOpenJobs() {
  return useQuery({
    queryKey: ["jobs", "open"],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("jobs")
        .select("*, companies(company_name)")
        .eq("status", "open")
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Job[];
    },
  });
}

/** A company's open jobs — used on the public company profile page (/c/$companyId). */
export function useCompanyOpenJobs(companyId: string | undefined) {
  return useQuery({
    queryKey: ["jobs", "open", "company", companyId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("jobs")
        .select("*, companies(company_name)")
        .eq("company_id", companyId!)
        .eq("status", "open")
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Job[];
    },
    enabled: !!companyId,
  });
}

export function useMyApplications(profileId: string | undefined) {
  return useQuery({
    queryKey: ["job-applications", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      // Sprint 25: joins job title/company so the student's application
      // tracking page can show a real role name instead of a raw job_id.
      const { data, error } = await supabase
        .from("job_applications")
        .select("*, jobs(title, companies(company_name))")
        .eq("applicant_id", profileId!);
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useApplyToJob(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const supabase = getSupabaseBrowserClient();
      const { data: application, error } = await supabase
        .from("job_applications")
        .insert({ job_id: jobId, applicant_id: profileId! })
        .select("id")
        .single();
      if (error) throw error;

      // Best-effort: compute & persist ats_score / skills_score /
      // job_match_percentage right away so recruiters see real numbers
      // immediately. The application already exists even if this fails —
      // never roll back the insert over a scoring hiccup.
      try {
        await computeApplicationScoresFn({ data: { applicationId: application.id } });
      } catch (err) {
        console.warn("[jobs] Could not compute application match scores:", err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications", profileId] });
    },
  });
}

// ---------------------------------------------------------------------
// A single job (with company name) — used by feed job cards and anywhere
// that needs fresh details for a job referenced elsewhere (e.g. a post's
// metadata.job_id).
// ---------------------------------------------------------------------
export function jobQueryKey(jobId: string | undefined) {
  return ["job", jobId] as const;
}

export function useJobById(jobId: string | undefined) {
  return useQuery({
    queryKey: jobQueryKey(jobId),
    queryFn: async (): Promise<Job | null> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("jobs")
        .select("*, companies(company_name)")
        .eq("id", jobId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Job | null;
    },
    enabled: !!jobId,
  });
}

// ---------------------------------------------------------------------
// Job saves (student bookmarks) — job_saves is fully owner-scoped by RLS.
// ---------------------------------------------------------------------
export function jobSavesQueryKey(profileId: string | undefined) {
  return ["job-saves", profileId] as const;
}

/** Set of job ids the current student has saved — combine with useOpenJobs client-side. */
export function useSavedJobIds(profileId: string | undefined) {
  return useQuery({
    queryKey: jobSavesQueryKey(profileId),
    queryFn: async (): Promise<Set<string>> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("job_saves")
        .select("job_id")
        .eq("profile_id", profileId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.job_id));
    },
    enabled: !!profileId,
  });
}

export function jobSaveStatusQueryKey(jobId: string | undefined, profileId: string | undefined) {
  return ["job-save", jobId, profileId] as const;
}

export function useIsJobSaved(jobId: string | undefined, profileId: string | undefined) {
  return useQuery({
    queryKey: jobSaveStatusQueryKey(jobId, profileId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("job_saves")
        .select("id")
        .eq("job_id", jobId!)
        .eq("profile_id", profileId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!jobId && !!profileId,
  });
}

export function useSaveJob(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      if (!profileId) throw new Error("Not signed in.");
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("job_saves")
        .insert({ job_id: jobId, profile_id: profileId });
      if (error) throw error;
    },
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({ queryKey: jobSavesQueryKey(profileId) });
      queryClient.invalidateQueries({ queryKey: jobSaveStatusQueryKey(jobId, profileId) });
      queryClient.invalidateQueries({ queryKey: ["saved-jobs", profileId] });
    },
  });
}

export function useUnsaveJob(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      if (!profileId) throw new Error("Not signed in.");
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("job_saves")
        .delete()
        .eq("job_id", jobId)
        .eq("profile_id", profileId);
      if (error) throw error;
    },
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({ queryKey: jobSavesQueryKey(profileId) });
      queryClient.invalidateQueries({ queryKey: jobSaveStatusQueryKey(jobId, profileId) });
      queryClient.invalidateQueries({ queryKey: ["saved-jobs", profileId] });
    },
  });
}

export function useSavedJobs(profileId: string | undefined) {
  return useQuery({
    queryKey: ["saved-jobs", profileId],
    queryFn: async (): Promise<Job[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("job_saves")
        .select("job_id, created_at, jobs(*, companies(company_name))")
        .eq("profile_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((r) => r.jobs)
        .filter((j): j is NonNullable<typeof j> => !!j) as unknown as Job[];
    },
    enabled: !!profileId,
  });
}
