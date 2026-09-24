import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import {
  checkDriveEligibilityFn,
  applyToDriveFn,
  withdrawDriveApplicationFn,
  shortlistApplicantFn,
  rejectApplicantFn,
  generateDriveRankingInsightsFn,
  generateMissingSkillSuggestionsFn,
  type DriveEligibility,
} from "@/lib/college.server";

export type College = Database["public"]["Tables"]["colleges"]["Row"];
export type CollegeAdmin = Database["public"]["Tables"]["college_admins"]["Row"];
export type PlacementDrive = Database["public"]["Tables"]["placement_drives"]["Row"];
export type DriveApplication = Database["public"]["Tables"]["drive_applications"]["Row"];
export type DriveShortlist = Database["public"]["Tables"]["drive_shortlists"]["Row"];
export type DriveNotification = Database["public"]["Tables"]["drive_notifications"]["Row"];
export type { DriveEligibility };

// ---------------------------------------------------------------------
// College membership gate — mirrors useMyCompany/useCreateCompany from
// Sprint 25's company-client.ts exactly (direct browser-client writes,
// no server function needed since none of this touches Gemini).
// ---------------------------------------------------------------------

export type MyCollegeMembership = CollegeAdmin & { college: College };

export function myCollegeQueryKey(userId: string | undefined) {
  return ["my-college", userId] as const;
}

export function useMyCollege(userId: string | undefined) {
  return useQuery({
    queryKey: myCollegeQueryKey(userId),
    queryFn: async (): Promise<MyCollegeMembership | null> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("college_admins")
        .select("*, college:colleges(*)")
        .eq("profile_id", userId!)
        .not("joined_at", "is", null)
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data || !data.college) return null;
      return data as MyCollegeMembership;
    },
    enabled: !!userId,
  });
}

export function useCreateCollege(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; location?: string; website?: string }) => {
      if (!userId) throw new Error("Not signed in.");
      const supabase = getSupabaseBrowserClient();

      const { data: college, error } = await supabase
        .from("colleges")
        .insert({
          name: input.name.trim(),
          location: input.location?.trim() || null,
          website: input.website?.trim() || null,
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: memberError } = await supabase.from("college_admins").insert({
        college_id: college.id,
        profile_id: userId,
        role: "owner",
        joined_at: new Date().toISOString(),
      });
      if (memberError) throw memberError;

      // Best-effort — mirrors useCreateCompany's account_type flip.
      await supabase.from("profiles").update({ account_type: "college" }).eq("id", userId);

      return college;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myCollegeQueryKey(userId) });
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    },
  });
}

// ---------------------------------------------------------------------
// Drives — admin CRUD
// ---------------------------------------------------------------------

export function collegeDrivesQueryKey(collegeId: string | undefined) {
  return ["college-drives", collegeId] as const;
}

export function useCollegeDrives(collegeId: string | undefined) {
  return useQuery({
    queryKey: collegeDrivesQueryKey(collegeId),
    queryFn: async (): Promise<PlacementDrive[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("placement_drives")
        .select("*")
        .eq("college_id", collegeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!collegeId,
  });
}

export type DriveFormInput = {
  role: string;
  companyId?: string | null;
  companyNameOverride?: string;
  location?: string;
  employmentType?: string;
  packageMin?: number | null;
  packageMax?: number | null;
  currency?: string;
  minCgpa?: number | null;
  allowedBranches?: string[];
  allowedGraduationYears?: number[];
  minYearOfStudy?: number | null;
  eligibilityNotes?: string;
  applicationDeadline?: string | null;
  testDate?: string | null;
  interviewDate?: string | null;
  maxApplicants?: number | null;
  status?: string;
};

export function useCreateDrive(collegeId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DriveFormInput) => {
      if (!collegeId || !userId) throw new Error("No college.");
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("placement_drives").insert({
        college_id: collegeId,
        created_by: userId,
        role: input.role.trim(),
        company_id: input.companyId || null,
        company_name_override: input.companyNameOverride?.trim() || null,
        location: input.location?.trim() || null,
        employment_type: input.employmentType || null,
        package_min: input.packageMin ?? null,
        package_max: input.packageMax ?? null,
        currency: input.currency || "INR",
        min_cgpa: input.minCgpa ?? null,
        allowed_branches: input.allowedBranches ?? [],
        allowed_graduation_years: input.allowedGraduationYears ?? [],
        min_year_of_study: input.minYearOfStudy ?? null,
        eligibility_notes: input.eligibilityNotes?.trim() || null,
        application_deadline: input.applicationDeadline || null,
        test_date: input.testDate || null,
        interview_date: input.interviewDate || null,
        max_applicants: input.maxApplicants ?? null,
        status: input.status || "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collegeDrivesQueryKey(collegeId) }),
  });
}

export function useUpdateDrive(collegeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const supabase = getSupabaseBrowserClient();
      const update: Database["public"]["Tables"]["placement_drives"]["Update"] = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === "closed") update.closed_at = new Date().toISOString();
      const { error } = await supabase.from("placement_drives").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collegeDrivesQueryKey(collegeId) });
      queryClient.invalidateQueries({ queryKey: ["published-drives"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't update this drive."),
  });
}

export function useDrive(driveId: string | undefined) {
  return useQuery({
    queryKey: ["drive", driveId],
    queryFn: async (): Promise<(PlacementDrive & { college: College | null }) | null> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("placement_drives")
        .select("*, college:colleges(*)")
        .eq("id", driveId!)
        .maybeSingle();
      if (error) throw error;
      return data as (PlacementDrive & { college: College | null }) | null;
    },
    enabled: !!driveId,
  });
}

// ---------------------------------------------------------------------
// Student-facing: browse published drives
// ---------------------------------------------------------------------

export function usePublishedDrives() {
  return useQuery({
    queryKey: ["published-drives"],
    queryFn: async (): Promise<(PlacementDrive & { college: College | null })[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("placement_drives")
        .select("*, college:colleges(*)")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (PlacementDrive & { college: College | null })[];
    },
  });
}

// ---------------------------------------------------------------------
// Applicants — admin view of a drive's applications, with student
// profile joined for the table/CSV export.
// ---------------------------------------------------------------------

export type DriveApplicantRow = DriveApplication & {
  student: {
    id: string;
    full_name: string | null;
    email: string | null;
    college: string | null;
    branch: string | null;
    graduation_year: number | null;
    cgpa: number | null;
  } | null;
};

export function driveApplicantsQueryKey(driveId: string | undefined) {
  return ["drive-applicants", driveId] as const;
}

export function useDriveApplicants(driveId: string | undefined) {
  return useQuery({
    queryKey: driveApplicantsQueryKey(driveId),
    queryFn: async (): Promise<DriveApplicantRow[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data: apps, error } = await supabase
        .from("drive_applications")
        .select("*")
        .eq("drive_id", driveId!)
        .order("ai_fit_score", { ascending: false });
      if (error) throw error;
      if (!apps || apps.length === 0) return [];

      const studentIds = Array.from(new Set(apps.map((a) => a.student_id)));
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, college, branch, graduation_year, cgpa")
        .in("id", studentIds);
      if (profilesError) throw profilesError;
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return apps.map((a) => ({ ...a, student: profileMap.get(a.student_id) ?? null }));
    },
    enabled: !!driveId,
  });
}

// ---------------------------------------------------------------------
// Student-facing: my applications + status timeline (via drive_notifications)
// ---------------------------------------------------------------------

export type MyDriveApplicationRow = DriveApplication & {
  drive: (PlacementDrive & { college: College | null }) | null;
};

export function myDriveApplicationsQueryKey(userId: string | undefined) {
  return ["my-drive-applications", userId] as const;
}

export function useMyDriveApplications(userId: string | undefined) {
  return useQuery({
    queryKey: myDriveApplicationsQueryKey(userId),
    queryFn: async (): Promise<MyDriveApplicationRow[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("drive_applications")
        .select("*, drive:placement_drives(*, college:colleges(*))")
        .eq("student_id", userId!)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MyDriveApplicationRow[];
    },
    enabled: !!userId,
  });
}

export function useApplicationTimeline(applicationId: string | undefined) {
  return useQuery({
    queryKey: ["drive-application-timeline", applicationId],
    queryFn: async (): Promise<DriveNotification[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("drive_notifications")
        .select("*")
        .eq("application_id", applicationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!applicationId,
  });
}

// ---------------------------------------------------------------------
// Server-function wrappers: eligibility, apply, withdraw, shortlist,
// reject, AI ranking insights, AI missing-skill suggestions.
// ---------------------------------------------------------------------

export function useDriveEligibility(driveId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["drive-eligibility", driveId, userId],
    queryFn: async (): Promise<DriveEligibility> => {
      const result = await checkDriveEligibilityFn({ data: { driveId: driveId! } });
      if (result.error || !result.eligibility)
        throw new Error(result.error ?? "Could not check eligibility.");
      return result.eligibility;
    },
    enabled: !!driveId && !!userId,
  });
}

export function useApplyToDrive(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (driveId: string) => applyToDriveFn({ data: { driveId } }),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: myDriveApplicationsQueryKey(userId) });
      }
    },
  });
}

export function useWithdrawDriveApplication(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) =>
      withdrawDriveApplicationFn({ data: { applicationId } }),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: myDriveApplicationsQueryKey(userId) });
      }
    },
  });
}

export function useShortlistApplicant(driveId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      applicationId: string;
      stage: "shortlisted" | "interview" | "selected";
      notes?: string;
    }) => shortlistApplicantFn({ data: vars }),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: driveApplicantsQueryKey(driveId) });
      }
    },
  });
}

export function useRejectApplicant(driveId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => rejectApplicantFn({ data: { applicationId } }),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: driveApplicantsQueryKey(driveId) });
      }
    },
  });
}

export function useDriveRankingInsights() {
  return useMutation({
    mutationFn: async (driveId: string) => generateDriveRankingInsightsFn({ data: { driveId } }),
  });
}

export function useMissingSkillSuggestions() {
  return useMutation({
    mutationFn: async (applicationId: string) =>
      generateMissingSkillSuggestionsFn({ data: { applicationId } }),
  });
}

// ---------------------------------------------------------------------
// CSV export — no prior art in this codebase (confirmed), so a small
// self-contained Blob-based builder rather than a new dependency.
// ---------------------------------------------------------------------

export function exportApplicantsToCsv(applicants: DriveApplicantRow[], driveRole: string) {
  const headers = [
    "Name",
    "Email",
    "College",
    "Branch",
    "Graduation Year",
    "CGPA",
    "Fit Score",
    "Status",
    "Applied At",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = applicants.map((a) =>
    [
      a.student?.full_name ?? "",
      a.student?.email ?? "",
      a.student?.college ?? "",
      a.student?.branch ?? "",
      a.student?.graduation_year?.toString() ?? "",
      a.student?.cgpa?.toString() ?? "",
      a.ai_fit_score?.toString() ?? "",
      a.status,
      new Date(a.applied_at).toLocaleDateString(),
    ]
      .map((v) => escape(String(v)))
      .join(","),
  );
  const csv = [headers.map(escape).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${driveRole.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-applicants.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
