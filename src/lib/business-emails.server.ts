// Server-function wrappers around email.server.ts for the three HR-side
// email notifications this feature adds. Nothing in the schema/DB triggers
// sends email today (they only write in-app notifications), so these are
// net-new. Each is best-effort from the caller's point of view: it never
// throws — it returns { error } and the caller logs/ignores failures rather
// than surfacing a scary error or rolling back the underlying DB action.
//
// Each handler re-derives the recipient's email/name and the job/company
// details server-side (rather than trusting client-supplied strings) and
// checks the caller is actually a recruiter/admin/owner on the relevant
// company before sending — mirrors the has_company_role check the RLS
// policies already enforce on the underlying writes.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  sendApplicationStatusEmail,
  sendInterviewScheduledEmail,
  sendJobInvitationEmail,
} from "@/lib/email.server";

type EmailFnResult = { error: string | null; sent?: boolean };

async function isCompanyRecruiter(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  companyId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("profile_id", userId)
    .not("joined_at", "is", null)
    .maybeSingle();
  return !!data && (data.role === "owner" || data.role === "admin" || data.role === "recruiter");
}

// ---------------------------------------------------------------------
// Application status change (shortlisted / rejected / selected / hired)
// ---------------------------------------------------------------------

export const sendApplicationStatusEmailFn = createServerFn({ method: "POST" })
  .validator(z.object({ applicationId: z.string().uuid(), status: z.string() }))
  .handler(async ({ data }): Promise<EmailFnResult> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: application, error: appError } = await supabase
      .from("job_applications")
      .select("applicant_id, job_id")
      .eq("id", data.applicationId)
      .single();
    if (appError || !application) return { error: "Application not found." };

    const { data: job } = await supabase
      .from("jobs")
      .select("title, company_id")
      .eq("id", application.job_id)
      .single();
    if (!job?.company_id) return { error: "Job not found." };

    if (!(await isCompanyRecruiter(supabase, job.company_id, auth.user.id))) {
      return { error: "Not authorized." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", application.applicant_id)
      .single();
    if (!profile?.email) return { error: "Candidate has no email on file." };

    // Sprint 29 reference integration for notification preferences' email
    // toggle — same "one reference call site, not universal coverage yet"
    // scope choice as Sprint 27's AI-credits integration. No preference
    // row yet defaults to sending (sensible default, matches
    // create_notification()'s own default).
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email_notifications")
      .eq("profile_id", application.applicant_id)
      .maybeSingle();
    if (prefs?.email_notifications === false) {
      return { error: null, sent: false };
    }

    const result = await sendApplicationStatusEmail({
      to: profile.email,
      candidateName: profile.full_name ?? "there",
      jobTitle: job.title ?? "the role",
      status: data.status,
    });
    return { error: result.sent ? null : (result.error ?? "Email not sent."), sent: result.sent };
  });

// ---------------------------------------------------------------------
// Interview scheduled
// ---------------------------------------------------------------------

export const sendInterviewScheduledEmailFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      applicationId: z.string().uuid(),
      scheduledAt: z.string(),
      mode: z.string(),
      interviewerName: z.string().optional(),
      meetingLink: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<EmailFnResult> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: application, error: appError } = await supabase
      .from("job_applications")
      .select("applicant_id, job_id")
      .eq("id", data.applicationId)
      .single();
    if (appError || !application) return { error: "Application not found." };

    const { data: job } = await supabase
      .from("jobs")
      .select("title, company_id")
      .eq("id", application.job_id)
      .single();
    if (!job?.company_id) return { error: "Job not found." };

    if (!(await isCompanyRecruiter(supabase, job.company_id, auth.user.id))) {
      return { error: "Not authorized." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", application.applicant_id)
      .single();
    if (!profile?.email) return { error: "Candidate has no email on file." };

    const result = await sendInterviewScheduledEmail({
      to: profile.email,
      candidateName: profile.full_name ?? "there",
      jobTitle: job.title ?? "the role",
      scheduledAt: data.scheduledAt,
      mode: data.mode,
      meetingLink: data.meetingLink ?? null,
      interviewerName: data.interviewerName ?? null,
    });
    return { error: result.sent ? null : (result.error ?? "Email not sent."), sent: result.sent };
  });

// ---------------------------------------------------------------------
// Job invitation ("Best Matches" -> Invite to Apply)
// ---------------------------------------------------------------------

export const sendJobInvitationEmailFn = createServerFn({ method: "POST" })
  .validator(z.object({ jobId: z.string().uuid(), profileId: z.string().uuid() }))
  .handler(async ({ data }): Promise<EmailFnResult> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("title, company_id")
      .eq("id", data.jobId)
      .single();
    if (jobError || !job?.company_id) return { error: "Job not found." };

    if (!(await isCompanyRecruiter(supabase, job.company_id, auth.user.id))) {
      return { error: "Not authorized." };
    }

    const { data: company } = await supabase
      .from("companies")
      .select("company_name")
      .eq("id", job.company_id)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.profileId)
      .single();
    if (!profile?.email) return { error: "Candidate has no email on file." };

    const result = await sendJobInvitationEmail({
      to: profile.email,
      candidateName: profile.full_name ?? "there",
      jobTitle: job.title ?? "the role",
      companyName: company?.company_name ?? "A company on Provn",
    });
    return { error: result.sent ? null : (result.error ?? "Email not sent."), sent: result.sent };
  });
