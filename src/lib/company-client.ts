import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { rankCandidates, scoreCandidate, type Candidate } from "@/lib/matching";
import {
  sendApplicationStatusEmailFn,
  sendInterviewScheduledEmailFn,
  sendJobInvitationEmailFn,
} from "@/lib/business-emails.server";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyMember = Database["public"]["Tables"]["company_members"]["Row"];
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type JobApplication = Database["public"]["Tables"]["job_applications"]["Row"];
export type InterviewSchedule = Database["public"]["Tables"]["interview_schedules"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type SkillRow = Database["public"]["Tables"]["skills"]["Row"];
export type ResumeRow = Database["public"]["Tables"]["resumes"]["Row"];

export type CompanyRole = "owner" | "admin" | "recruiter";

// ---------------------------------------------------------------------
// Company gate: does the current user belong to a company yet?
// ---------------------------------------------------------------------

export type MyCompanyMembership = CompanyMember & { company: Company };

export function myCompanyQueryKey(userId: string | undefined) {
  return ["my-company", userId] as const;
}

export function useMyCompany(userId: string | undefined) {
  return useQuery({
    queryKey: myCompanyQueryKey(userId),
    queryFn: async (): Promise<MyCompanyMembership | null> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("company_members")
        .select("*, company:companies(*)")
        .eq("profile_id", userId!)
        .not("joined_at", "is", null)
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data || !data.company) return null;
      return data as MyCompanyMembership;
    },
    enabled: !!userId,
  });
}

export type CreateCompanyInput = {
  companyName: string;
  description?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  location?: string;
  logoFile?: File | null;
};

export function useCreateCompany(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCompanyInput) => {
      if (!userId) throw new Error("Not signed in.");
      const supabase = getSupabaseBrowserClient();

      const { data: company, error } = await supabase
        .from("companies")
        .insert({
          company_name: input.companyName.trim(),
          description: input.description?.trim() || null,
          website: input.website?.trim() || null,
          industry: input.industry?.trim() || null,
          company_size: input.companySize?.trim() || null,
          location: input.location?.trim() || null,
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: memberError } = await supabase.from("company_members").insert({
        company_id: company.id,
        profile_id: userId,
        role: "owner",
        joined_at: new Date().toISOString(),
      });
      if (memberError) throw memberError;

      // Logo upload requires the company_members row above to exist first —
      // the storage RLS policy checks has_company_role(companyId, [owner, admin]).
      if (input.logoFile) {
        const ext = input.logoFile.name.split(".").pop() ?? "png";
        const path = `${company.id}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("company-logos")
          .upload(path, input.logoFile, { upsert: true, cacheControl: "3600" });
        if (uploadError) throw uploadError;
        const logoUrl = supabase.storage.from("company-logos").getPublicUrl(path).data.publicUrl;
        await supabase.from("companies").update({ logo: logoUrl }).eq("id", company.id);
      }

      // Best-effort convenience flag for the admin panel; access control itself
      // runs off company_members, not this field.
      await supabase.from("profiles").update({ role: "company_admin" }).eq("id", userId);

      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myCompanyQueryKey(userId) });
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    },
  });
}

export type UpdateCompanyInput = Partial<{
  companyName: string;
  description: string;
  website: string;
  industry: string;
  companySize: string;
  location: string;
  linkedinUrl: string;
  logoFile: File | null;
  coverImageFile: File | null;
}>;

export function useUpdateCompany(companyId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: UpdateCompanyInput) => {
      if (!companyId) throw new Error("No company.");
      const supabase = getSupabaseBrowserClient();

      let logoUrl: string | undefined;
      if (patch.logoFile) {
        const ext = patch.logoFile.name.split(".").pop() ?? "png";
        const path = `${companyId}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("company-logos")
          .upload(path, patch.logoFile, { upsert: true, cacheControl: "3600" });
        if (uploadError) throw uploadError;
        logoUrl = supabase.storage.from("company-logos").getPublicUrl(path).data.publicUrl;
      }

      let coverUrl: string | undefined;
      if (patch.coverImageFile) {
        const ext = patch.coverImageFile.name.split(".").pop() ?? "png";
        const path = `${companyId}/cover.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("company-logos")
          .upload(path, patch.coverImageFile, { upsert: true, cacheControl: "3600" });
        if (uploadError) throw uploadError;
        coverUrl = supabase.storage.from("company-logos").getPublicUrl(path).data.publicUrl;
      }

      const update: Database["public"]["Tables"]["companies"]["Update"] = {};
      if (patch.companyName !== undefined) update.company_name = patch.companyName.trim();
      if (patch.description !== undefined) update.description = patch.description.trim() || null;
      if (patch.website !== undefined) update.website = patch.website.trim() || null;
      if (patch.industry !== undefined) update.industry = patch.industry.trim() || null;
      if (patch.companySize !== undefined) update.company_size = patch.companySize.trim() || null;
      if (patch.location !== undefined) update.location = patch.location.trim() || null;
      if (patch.linkedinUrl !== undefined) update.linkedin_url = patch.linkedinUrl.trim() || null;
      if (logoUrl) update.logo = logoUrl;
      if (coverUrl) update.cover_image = coverUrl;

      const { error } = await supabase.from("companies").update(update).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myCompanyQueryKey(userId) });
    },
  });
}

// ---------------------------------------------------------------------
// Team / HR members
// ---------------------------------------------------------------------

export type CompanyMemberWithProfile = CompanyMember & {
  profile: Pick<ProfileRow, "id" | "full_name" | "email" | "avatar_url" | "username"> | null;
};

export function companyMembersQueryKey(companyId: string | undefined) {
  return ["company-members", companyId] as const;
}

export function useCompanyMembers(companyId: string | undefined) {
  return useQuery({
    queryKey: companyMembersQueryKey(companyId),
    queryFn: async (): Promise<CompanyMemberWithProfile[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("company_members")
        .select("*, profile:profiles(id, full_name, email, avatar_url, username)")
        .eq("company_id", companyId!)
        .order("invited_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CompanyMemberWithProfile[];
    },
    enabled: !!companyId,
  });
}

export async function findProfileByEmail(email: string) {
  const supabase = getSupabaseBrowserClient();
  const safe = email.trim().replace(/[%,]/g, "");
  if (!safe) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, username")
    .ilike("email", safe)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useAddCompanyMember(companyId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      profileId: string;
      role: Extract<CompanyRole, "admin" | "recruiter">;
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("company_members").insert({
        company_id: companyId!,
        profile_id: input.profileId,
        role: input.role,
        joined_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyMembersQueryKey(companyId) }),
  });
}

export function useRemoveCompanyMember(companyId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("company_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyMembersQueryKey(companyId) }),
  });
}

// ---------------------------------------------------------------------
// Company follows (students)
// ---------------------------------------------------------------------

export function companyFollowQueryKey(
  companyId: string | undefined,
  profileId: string | undefined,
) {
  return ["company-follow", companyId, profileId] as const;
}

export function useCompanyFollowStatus(
  companyId: string | undefined,
  profileId: string | undefined,
) {
  return useQuery({
    queryKey: companyFollowQueryKey(companyId, profileId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("company_follows")
        .select("id")
        .eq("company_id", companyId!)
        .eq("profile_id", profileId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!companyId && !!profileId,
  });
}

export function useCompanyFollowerCount(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-follower-count", companyId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { count, error } = await supabase
        .from("company_follows")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!companyId,
  });
}

export function useToggleCompanyFollow(
  companyId: string | undefined,
  profileId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (follow: boolean) => {
      const supabase = getSupabaseBrowserClient();
      if (follow) {
        const { error } = await supabase
          .from("company_follows")
          .insert({ company_id: companyId!, profile_id: profileId! });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_follows")
          .delete()
          .eq("company_id", companyId!)
          .eq("profile_id", profileId!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyFollowQueryKey(companyId, profileId) });
      queryClient.invalidateQueries({ queryKey: ["company-follower-count", companyId] });
    },
  });
}

export function usePublicCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ["public-company", companyId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

// ---------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------

export function companyJobsQueryKey(companyId: string | undefined) {
  return ["company-jobs", companyId] as const;
}

export function useCompanyJobs(companyId: string | undefined) {
  return useQuery({
    queryKey: companyJobsQueryKey(companyId),
    queryFn: async (): Promise<Job[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("company_id", companyId!)
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}

export type JobFormInput = {
  title: string;
  description: string;
  employmentType: string;
  location: string;
  department?: string;
  workMode?: string | null;
  experienceLevel?: string;
  responsibilities?: string;
  requirements?: string;
  benefits?: string;
  applicationDeadline?: string | null;
  openingsCount?: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  tags: string[];
  status: string;
};

// ---------------------------------------------------------------------
// Feed distribution: when a job goes live (status -> 'open'), post it to
// the social feed once and remember the post id on the job row so a
// later edit never creates a duplicate post.
// ---------------------------------------------------------------------
async function publishJobToFeed(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  job: Pick<Job, "id" | "title" | "company_id" | "feed_post_id">,
  userId: string,
) {
  if (job.feed_post_id || !job.company_id) return;

  const { data: company } = await supabase
    .from("companies")
    .select("company_name, logo")
    .eq("id", job.company_id)
    .maybeSingle();

  const companyName = company?.company_name ?? "A company";

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      author_id: userId,
      content: `${companyName} is hiring: ${job.title ?? "a new role"}`,
      kind: "job",
      metadata: {
        job_id: job.id,
        company_id: job.company_id,
        company_name: companyName,
        company_logo: company?.logo ?? null,
      },
    })
    .select("id")
    .single();
  if (postError) throw postError;

  const { error: linkError } = await supabase
    .from("jobs")
    .update({ feed_post_id: post.id })
    .eq("id", job.id);
  if (linkError) throw linkError;
}

export function useCreateJob(companyId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: JobFormInput) => {
      if (!companyId || !userId) throw new Error("No company.");
      const supabase = getSupabaseBrowserClient();
      const { data: job, error } = await supabase
        .from("jobs")
        .insert({
          company_id: companyId,
          created_by: userId,
          title: input.title.trim(),
          description: input.description.trim() || null,
          employment_type: input.employmentType || null,
          location: input.location.trim() || null,
          department: input.department?.trim() || null,
          work_mode: input.workMode || null,
          experience_level: input.experienceLevel?.trim() || null,
          responsibilities: input.responsibilities?.trim() || null,
          requirements: input.requirements?.trim() || null,
          benefits: input.benefits?.trim() || null,
          application_deadline: input.applicationDeadline || null,
          openings_count: input.openingsCount ?? 1,
          salary_min: input.salaryMin,
          salary_max: input.salaryMax,
          currency: input.currency || "INR",
          tags: input.tags,
          status: input.status,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.status === "open") {
        await publishJobToFeed(supabase, job, userId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyJobsQueryKey(companyId) }),
  });
}

export function useUpdateJob(companyId: string | undefined, userId?: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<JobFormInput> }) => {
      const supabase = getSupabaseBrowserClient();
      const update: Database["public"]["Tables"]["jobs"]["Update"] = {};
      if (patch.title !== undefined) update.title = patch.title.trim();
      if (patch.description !== undefined) update.description = patch.description.trim() || null;
      if (patch.employmentType !== undefined) update.employment_type = patch.employmentType || null;
      if (patch.location !== undefined) update.location = patch.location.trim() || null;
      if (patch.department !== undefined) update.department = patch.department?.trim() || null;
      if (patch.workMode !== undefined) update.work_mode = patch.workMode || null;
      if (patch.experienceLevel !== undefined)
        update.experience_level = patch.experienceLevel?.trim() || null;
      if (patch.responsibilities !== undefined)
        update.responsibilities = patch.responsibilities?.trim() || null;
      if (patch.requirements !== undefined)
        update.requirements = patch.requirements?.trim() || null;
      if (patch.benefits !== undefined) update.benefits = patch.benefits?.trim() || null;
      if (patch.applicationDeadline !== undefined)
        update.application_deadline = patch.applicationDeadline || null;
      if (patch.openingsCount !== undefined) update.openings_count = patch.openingsCount ?? 1;
      if (patch.salaryMin !== undefined) update.salary_min = patch.salaryMin;
      if (patch.salaryMax !== undefined) update.salary_max = patch.salaryMax;
      if (patch.currency !== undefined) update.currency = patch.currency;
      if (patch.tags !== undefined) update.tags = patch.tags;
      if (patch.status !== undefined) {
        update.status = patch.status;
        if (patch.status === "closed") update.closed_at = new Date().toISOString();
      }
      const { data: job, error } = await supabase
        .from("jobs")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      if (patch.status === "open" && userId) {
        await publishJobToFeed(supabase, job, userId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyJobsQueryKey(companyId) }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't update this job."),
  });
}

export function useDeleteJob(companyId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyJobsQueryKey(companyId) }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't delete this job."),
  });
}

// ---------------------------------------------------------------------
// Applicants for a job
//
// NOTE on signal visibility: `resumes_recruiter_view` genuinely grants
// recruiters SELECT on an applicant's resume/ATS score once they've applied
// to one of the company's jobs. However `challenge_submissions` and
// `mock_interviews` currently only have owner/admin SELECT policies (see
// 20260727000100_challenges_roadmaps.sql) — there is no recruiter-visibility
// policy mirroring resumes_recruiter_view for those two tables. We still
// query them (harmless, and it'll start working automatically if that RLS
// gap is closed later), but for any non-admin recruiter they will currently
// come back empty. The UI surfaces this explicitly rather than implying
// "candidate has 0 passed challenges".
// ---------------------------------------------------------------------

export type ApplicantRow = JobApplication & {
  applicant: Pick<
    ProfileRow,
    | "id"
    | "full_name"
    | "username"
    | "avatar_url"
    | "location"
    | "target_role"
    | "github_url"
    | "portfolio_url"
    | "linkedin_url"
    | "bio"
    | "email"
  > | null;
  skills: SkillRow[];
  resume: ResumeRow | null;
  passedChallenges: number;
  bestInterviewScore: number | null;
};

export function jobApplicationsQueryKey(jobId: string | undefined) {
  return ["job-applications", jobId] as const;
}

export function useJobApplications(jobId: string | undefined) {
  return useQuery({
    queryKey: jobApplicationsQueryKey(jobId),
    queryFn: async (): Promise<ApplicantRow[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data: apps, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", jobId!)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      if (!apps || apps.length === 0) return [];

      const applicantIds = Array.from(new Set(apps.map((a) => a.applicant_id)));

      const [profilesRes, skillsRes, resumesRes, submissionsRes, interviewsRes] = await Promise.all(
        [
          supabase
            .from("profiles")
            .select(
              "id, full_name, username, avatar_url, location, target_role, github_url, portfolio_url, linkedin_url, bio, email",
            )
            .in("id", applicantIds),
          supabase.from("skills").select("*").in("profile_id", applicantIds),
          supabase
            .from("resumes")
            .select("*")
            .in("profile_id", applicantIds)
            .eq("is_current", true),
          supabase
            .from("challenge_submissions")
            .select("profile_id, status")
            .in("profile_id", applicantIds)
            .eq("status", "passed"),
          supabase
            .from("mock_interviews")
            .select("profile_id, score")
            .in("profile_id", applicantIds),
        ],
      );
      if (profilesRes.error) throw profilesRes.error;
      if (skillsRes.error) throw skillsRes.error;
      if (resumesRes.error) throw resumesRes.error;
      // challenge_submissions / mock_interviews errors are swallowed rather than
      // thrown: RLS may legitimately return zero rows for these (see note above),
      // and we don't want a schema gap to break the whole applicants view.

      const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));

      const skillsByProfile = new Map<string, SkillRow[]>();
      for (const s of skillsRes.data ?? []) {
        const list = skillsByProfile.get(s.profile_id!) ?? [];
        list.push(s);
        skillsByProfile.set(s.profile_id!, list);
      }

      const resumeMap = new Map(
        (resumesRes.data ?? []).map((r) => [r.profile_id!, r as ResumeRow]),
      );

      const passedCounts = new Map<string, number>();
      for (const s of submissionsRes.data ?? []) {
        passedCounts.set(s.profile_id, (passedCounts.get(s.profile_id) ?? 0) + 1);
      }

      const bestScores = new Map<string, number>();
      for (const iv of interviewsRes.data ?? []) {
        if (iv.score == null) continue;
        const cur = bestScores.get(iv.profile_id) ?? -1;
        if (iv.score > cur) bestScores.set(iv.profile_id, iv.score);
      }

      return apps.map((a) => ({
        ...a,
        applicant: profileMap.get(a.applicant_id) ?? null,
        skills: skillsByProfile.get(a.applicant_id) ?? [],
        resume: resumeMap.get(a.applicant_id) ?? null,
        passedChallenges: passedCounts.get(a.applicant_id) ?? 0,
        bestInterviewScore: bestScores.get(a.applicant_id) ?? null,
      }));
    },
    enabled: !!jobId,
  });
}

const STATUS_EMAIL_TRIGGERS = new Set(["shortlisted", "rejected", "selected", "hired"]);

/**
 * `companyId` is optional and additive — when provided (the Kanban board
 * passes it since a card there may belong to any of the company's jobs),
 * the all-jobs applicants cache is also invalidated. Existing callers that
 * only pass `jobId` (the legacy /business/hiring view) keep working
 * unchanged.
 */
export function useUpdateApplicationStatus(
  jobId: string | undefined,
  companyId?: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("job_applications")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Best-effort email — the DB trigger already writes the in-app
      // notification; this is the only place that also emails the
      // candidate. Never let a failed/unconfigured email block the status
      // change itself.
      if (STATUS_EMAIL_TRIGGERS.has(status)) {
        try {
          await sendApplicationStatusEmailFn({ data: { applicationId: id, status } });
        } catch (err) {
          console.warn("[company-client] application status email failed:", err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobApplicationsQueryKey(jobId) });
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: ["company-applications", companyId] });
      }
    },
  });
}

// ---------------------------------------------------------------------
// Applicants Kanban (business.applicants.tsx) — works across a single job
// or every job the company has posted. Unlike useJobApplications above
// (kept as-is for the legacy /business/hiring view), this fetches job
// title alongside so the board can group without a second round-trip, and
// includes each applicant's public `projects` (top 3) for the simplified
// card the Kanban spec calls for. Sorted by the persisted
// `job_match_percentage` (computed at apply time — see
// matching-scores.server.ts) descending, so no client-side rescoring is
// needed here.
// ---------------------------------------------------------------------

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export type KanbanApplicant = {
  id: string; // job_applications.id
  jobId: string;
  jobTitle: string;
  jobTags: string[];
  status: string;
  appliedAt: string;
  atsScore: number | null;
  skillsScore: number | null;
  jobMatchPercentage: number | null;
  applicant: Pick<
    ProfileRow,
    | "id"
    | "full_name"
    | "username"
    | "avatar_url"
    | "college"
    | "target_role"
    | "github_url"
    | "portfolio_url"
    | "location"
    | "graduation_year"
  > | null;
  verifiedSkills: string[];
  topProjects: ProjectRow[];
  resumeStoragePath: string | null;
  // Sprint 25 additions — sourced from the recruiter-visibility RLS
  // policies added alongside this candidate-tools migration (career_roadmaps,
  // coding_interview_sessions, voice_interview_sessions), scoped to
  // candidates who applied to this company's jobs.
  interviewCompleted: boolean;
  bestCodingScore: number | null;
  bestHrScore: number | null;
  roadmapActive: boolean;
  matchedSkills: string[];
  partialSkills: string[];
  missingSkills: string[];
};

export function companyApplicationsQueryKey(
  companyId: string | undefined,
  jobId: string | undefined,
) {
  return ["company-applications", companyId, jobId ?? "all"] as const;
}

export function useCompanyApplications(companyId: string | undefined, jobId?: string) {
  return useQuery({
    queryKey: companyApplicationsQueryKey(companyId, jobId),
    queryFn: async (): Promise<KanbanApplicant[]> => {
      const supabase = getSupabaseBrowserClient();

      const jobInfoMap = new Map<string, { title: string; tags: string[] }>();
      let jobIds: string[];
      if (jobId) {
        const { data: job, error } = await supabase
          .from("jobs")
          .select("id, title, tags")
          .eq("id", jobId)
          .single();
        if (error) throw error;
        jobIds = [job.id];
        jobInfoMap.set(job.id, { title: job.title ?? "Untitled role", tags: job.tags ?? [] });
      } else {
        const { data: jobs, error } = await supabase
          .from("jobs")
          .select("id, title, tags")
          .eq("company_id", companyId!);
        if (error) throw error;
        jobIds = (jobs ?? []).map((j) => j.id);
        for (const j of jobs ?? [])
          jobInfoMap.set(j.id, { title: j.title ?? "Untitled role", tags: j.tags ?? [] });
      }
      if (jobIds.length === 0) return [];

      const { data: apps, error: appsError } = await supabase
        .from("job_applications")
        .select("*")
        .in("job_id", jobIds);
      if (appsError) throw appsError;
      if (!apps || apps.length === 0) return [];

      const applicantIds = Array.from(new Set(apps.map((a) => a.applicant_id)));

      const [profilesRes, skillsRes, resumesRes, projectsRes, codingRes, voiceRes, roadmapsRes] =
        await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, full_name, username, avatar_url, college, target_role, github_url, portfolio_url, location, graduation_year",
            )
            .in("id", applicantIds),
          supabase
            .from("skills")
            .select("profile_id, skill_name")
            .in("profile_id", applicantIds)
            .eq("verified", true),
          supabase
            .from("resumes")
            .select("profile_id, storage_path")
            .in("profile_id", applicantIds)
            .eq("is_current", true),
          supabase
            .from("projects")
            .select("*")
            .in("profile_id", applicantIds)
            .order("created_at", { ascending: false }),
          // Recruiter-visibility RLS (candidate-tools migration) scopes these
          // three to applicants of this company's jobs only — no broader grant.
          supabase
            .from("coding_interview_sessions")
            .select("profile_id, overall_score")
            .in("profile_id", applicantIds)
            .eq("status", "evaluated"),
          supabase
            .from("voice_interview_sessions")
            .select("profile_id, overall_score")
            .in("profile_id", applicantIds)
            .eq("status", "completed"),
          supabase
            .from("career_roadmaps")
            .select("profile_id, status")
            .in("profile_id", applicantIds)
            .eq("status", "active"),
        ]);
      if (profilesRes.error) throw profilesRes.error;
      if (skillsRes.error) throw skillsRes.error;
      if (resumesRes.error) throw resumesRes.error;
      if (projectsRes.error) throw projectsRes.error;
      // coding/voice/roadmap errors are swallowed, not thrown — same
      // reasoning as challenge_submissions/mock_interviews above: a
      // signal being unavailable shouldn't break the whole board.

      const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));

      const skillsByProfile = new Map<string, string[]>();
      for (const s of skillsRes.data ?? []) {
        const list = skillsByProfile.get(s.profile_id!) ?? [];
        if (s.skill_name) list.push(s.skill_name);
        skillsByProfile.set(s.profile_id!, list);
      }

      const resumeMap = new Map(
        (resumesRes.data ?? []).map((r) => [r.profile_id!, r.storage_path]),
      );

      const projectsByProfile = new Map<string, ProjectRow[]>();
      for (const p of projectsRes.data ?? []) {
        const list = projectsByProfile.get(p.profile_id) ?? [];
        list.push(p);
        projectsByProfile.set(p.profile_id, list);
      }

      const bestCodingByProfile = new Map<string, number>();
      for (const s of codingRes.data ?? []) {
        if (s.overall_score == null) continue;
        const cur = bestCodingByProfile.get(s.profile_id) ?? -1;
        if (s.overall_score > cur) bestCodingByProfile.set(s.profile_id, s.overall_score);
      }
      const bestHrByProfile = new Map<string, number>();
      for (const s of voiceRes.data ?? []) {
        if (s.overall_score == null) continue;
        const cur = bestHrByProfile.get(s.profile_id) ?? -1;
        if (s.overall_score > cur) bestHrByProfile.set(s.profile_id, s.overall_score);
      }
      const activeRoadmapProfiles = new Set((roadmapsRes.data ?? []).map((r) => r.profile_id));

      return apps
        .map((a) => {
          const info = jobInfoMap.get(a.job_id);
          const jobTags = info?.tags ?? [];
          const verifiedSkills = skillsByProfile.get(a.applicant_id) ?? [];
          const { matched, partial } = scoreCandidate(
            {
              id: a.applicant_id,
              name: "",
              avatar: "",
              headline: "",
              location: "",
              years: 0,
              verifiedSkills,
              streak: 0,
            },
            jobTags,
          );
          const missing = jobTags.filter((t) => !matched.includes(t) && !partial.includes(t));
          const bestCoding = bestCodingByProfile.get(a.applicant_id) ?? null;
          const bestHr = bestHrByProfile.get(a.applicant_id) ?? null;
          return {
            id: a.id,
            jobId: a.job_id,
            jobTitle: info?.title ?? "Untitled role",
            jobTags,
            status: a.status,
            appliedAt: a.applied_at,
            atsScore: a.ats_score,
            skillsScore: a.skills_score,
            jobMatchPercentage: a.job_match_percentage,
            applicant: profileMap.get(a.applicant_id) ?? null,
            verifiedSkills,
            topProjects: (projectsByProfile.get(a.applicant_id) ?? []).slice(0, 3),
            resumeStoragePath: resumeMap.get(a.applicant_id) ?? null,
            interviewCompleted: bestCoding != null || bestHr != null,
            bestCodingScore: bestCoding,
            bestHrScore: bestHr,
            roadmapActive: activeRoadmapProfiles.has(a.applicant_id),
            matchedSkills: matched,
            partialSkills: partial,
            missingSkills: missing,
          };
        })
        .sort((x, y) => (y.jobMatchPercentage ?? -1) - (x.jobMatchPercentage ?? -1));
    },
    enabled: !!companyId,
  });
}

// ---------------------------------------------------------------------
// Recruiter notes on a candidate's application
// ---------------------------------------------------------------------

export type ApplicationNote = Database["public"]["Tables"]["application_notes"]["Row"] & {
  author: Pick<ProfileRow, "id" | "full_name" | "avatar_url"> | null;
};

export function applicationNotesQueryKey(applicationId: string | undefined) {
  return ["application-notes", applicationId] as const;
}

export function useApplicationNotes(applicationId: string | undefined) {
  return useQuery({
    queryKey: applicationNotesQueryKey(applicationId),
    queryFn: async (): Promise<ApplicationNote[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("application_notes")
        .select("*, author:profiles(id, full_name, avatar_url)")
        .eq("application_id", applicationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ApplicationNote[];
    },
    enabled: !!applicationId,
  });
}

export function useAddApplicationNote(applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ authorId, body }: { authorId: string; body: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("application_notes")
        .insert({ application_id: applicationId!, author_id: authorId, body: body.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationNotesQueryKey(applicationId) });
    },
  });
}

// ---------------------------------------------------------------------
// Application status history (audit trail) — populated by a DB trigger,
// read-only from the client.
// ---------------------------------------------------------------------

export type ApplicationStatusHistoryEntry =
  Database["public"]["Tables"]["application_status_history"]["Row"] & {
    changedByProfile: Pick<ProfileRow, "id" | "full_name"> | null;
  };

export function useApplicationStatusHistory(applicationId: string | undefined) {
  return useQuery({
    queryKey: ["application-status-history", applicationId],
    queryFn: async (): Promise<ApplicationStatusHistoryEntry[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("application_status_history")
        .select("*, changedByProfile:profiles(id, full_name)")
        .eq("application_id", applicationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ApplicationStatusHistoryEntry[];
    },
    enabled: !!applicationId,
  });
}

// ---------------------------------------------------------------------
// Recruiter bookmark of a candidate — independent of pipeline status.
// ---------------------------------------------------------------------

export function candidateBookmarksQueryKey(companyId: string | undefined) {
  return ["candidate-bookmarks", companyId] as const;
}

export function useCandidateBookmarks(companyId: string | undefined) {
  return useQuery({
    queryKey: candidateBookmarksQueryKey(companyId),
    queryFn: async (): Promise<Set<string>> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("candidate_bookmarks")
        .select("profile_id")
        .eq("company_id", companyId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.profile_id));
    },
    enabled: !!companyId,
  });
}

export function useToggleCandidateBookmark(
  companyId: string | undefined,
  userId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, bookmarked }: { profileId: string; bookmarked: boolean }) => {
      const supabase = getSupabaseBrowserClient();
      if (bookmarked) {
        const { error } = await supabase
          .from("candidate_bookmarks")
          .delete()
          .eq("company_id", companyId!)
          .eq("profile_id", profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("candidate_bookmarks")
          .insert({ company_id: companyId!, profile_id: profileId, created_by: userId ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateBookmarksQueryKey(companyId) });
    },
  });
}

// ---------------------------------------------------------------------
// Job invitations ("Best Matches" -> Invite to Apply)
// ---------------------------------------------------------------------

export type BestMatchCandidate = {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  targetRole: string | null;
  location: string | null;
  college: string | null;
  verifiedSkills: string[];
  score: number; // 0..1, verified-skill overlap against the job's tags
};

export function bestMatchesQueryKey(jobId: string | undefined) {
  return ["job-best-matches", jobId] as const;
}

/** Students who haven't already applied or been invited, ranked by verified-skill overlap with the job's tags. */
export function useBestMatches(jobId: string | undefined, jobTags: string[]) {
  return useQuery({
    queryKey: bestMatchesQueryKey(jobId),
    queryFn: async (): Promise<BestMatchCandidate[]> => {
      const supabase = getSupabaseBrowserClient();

      const [appliedRes, invitedRes] = await Promise.all([
        supabase.from("job_applications").select("applicant_id").eq("job_id", jobId!),
        supabase.from("job_invitations").select("profile_id").eq("job_id", jobId!),
      ]);
      if (appliedRes.error) throw appliedRes.error;
      if (invitedRes.error) throw invitedRes.error;
      const excluded = new Set<string>([
        ...(appliedRes.data ?? []).map((r) => r.applicant_id),
        ...(invitedRes.data ?? []).map((r) => r.profile_id),
      ]);

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, target_role, location, college")
        .eq("account_type", "student")
        .limit(500);
      if (profileError) throw profileError;

      const candidates = (profiles ?? []).filter((p) => !excluded.has(p.id));
      if (candidates.length === 0) return [];

      const ids = candidates.map((p) => p.id);
      const { data: skills, error: skillError } = await supabase
        .from("skills")
        .select("profile_id, skill_name")
        .in("profile_id", ids)
        .eq("verified", true);
      if (skillError) throw skillError;

      const skillsByProfile = new Map<string, string[]>();
      for (const s of skills ?? []) {
        const list = skillsByProfile.get(s.profile_id!) ?? [];
        if (s.skill_name) list.push(s.skill_name);
        skillsByProfile.set(s.profile_id!, list);
      }

      const matchCandidates: Candidate[] = candidates.map((p) => ({
        id: p.id,
        name: p.full_name ?? p.username ?? "Unnamed",
        avatar: p.avatar_url ?? "",
        headline: p.target_role ?? "",
        location: p.location ?? "",
        years: 0,
        verifiedSkills: skillsByProfile.get(p.id) ?? [],
        streak: 0,
      }));

      const ranked =
        jobTags.length > 0
          ? rankCandidates(matchCandidates, jobTags)
          : matchCandidates.map((c) => ({
              ...c,
              score: 0,
              matched: [],
              partial: [],
              tier: 0 as const,
            }));

      const profileMap = new Map(candidates.map((p) => [p.id, p]));

      return ranked
        .filter((r) => r.score > 0)
        .map((r) => {
          const p = profileMap.get(r.id)!;
          return {
            id: p.id,
            fullName: p.full_name,
            username: p.username,
            avatarUrl: p.avatar_url,
            targetRole: p.target_role,
            location: p.location,
            college: p.college,
            verifiedSkills: skillsByProfile.get(p.id) ?? [],
            score: r.score,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);
    },
    enabled: !!jobId,
  });
}

export function useInviteToApply(jobId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("job_invitations").insert({
        job_id: jobId!,
        profile_id: profileId,
        invited_by: userId ?? null,
      });
      if (error) throw error;
      // DB trigger (on_job_invitation) already writes the in-app
      // notification — this is the only place that also emails.
      try {
        await sendJobInvitationEmailFn({ data: { jobId: jobId!, profileId } });
      } catch (err) {
        console.warn("[company-client] job invitation email failed:", err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bestMatchesQueryKey(jobId) });
    },
  });
}

// ---------------------------------------------------------------------
// Interview scheduling
// ---------------------------------------------------------------------

export function interviewSchedulesQueryKey(applicationId: string | undefined) {
  return ["interview-schedules", applicationId] as const;
}

export function useInterviewSchedules(applicationId: string | undefined) {
  return useQuery({
    queryKey: interviewSchedulesQueryKey(applicationId),
    queryFn: async (): Promise<InterviewSchedule[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("interview_schedules")
        .select("*")
        .eq("application_id", applicationId!)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!applicationId,
  });
}

/**
 * `companyId` is optional and additive (see useUpdateApplicationStatus above)
 * so the all-jobs Kanban board's applicants cache also gets invalidated.
 */
export function useScheduleInterview(
  jobId: string | undefined,
  userId: string | undefined,
  companyId?: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      applicationId: string;
      scheduledAt: string;
      mode: string;
      interviewerName?: string;
      meetingLink?: string;
      notes?: string;
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("interview_schedules").insert({
        application_id: input.applicationId,
        scheduled_at: input.scheduledAt,
        mode: input.mode,
        interviewer_name: input.interviewerName?.trim() || null,
        meeting_link: input.meetingLink?.trim() || null,
        notes: input.notes?.trim() || null,
        created_by: userId ?? null,
      });
      if (error) throw error;
      await supabase
        .from("job_applications")
        .update({ status: "interview", updated_at: new Date().toISOString() })
        .eq("id", input.applicationId);

      // Best-effort email — the DB trigger already writes the in-app
      // notification to the applicant; this is the only place that emails.
      try {
        await sendInterviewScheduledEmailFn({
          data: {
            applicationId: input.applicationId,
            scheduledAt: input.scheduledAt,
            mode: input.mode,
            interviewerName: input.interviewerName,
            meetingLink: input.meetingLink,
          },
        });
      } catch (err) {
        console.warn("[company-client] interview scheduled email failed:", err);
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: jobApplicationsQueryKey(jobId) });
      queryClient.invalidateQueries({ queryKey: interviewSchedulesQueryKey(vars.applicationId) });
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: ["company-applications", companyId] });
      }
    },
  });
}

// ---------------------------------------------------------------------
// Candidate detail drawer — on-demand resume ATS report (the Kanban
// board itself only carries storage_path, not the full ATS breakdown).
// Covered by the existing resumes_recruiter_view RLS policy.
// ---------------------------------------------------------------------

export function useCandidateResumeDetail(profileId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["candidate-resume-detail", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("resumes")
        .select("ats_score, analysis, storage_path")
        .eq("profile_id", profileId!)
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!profileId,
  });
}
