import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit.server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";
import type { Json } from "@/lib/supabase/types";

// Sprint 26: campus placement drives — a new actor type (colleges), not a
// duplicate of Sprint 25's company/job system (see the migration header
// comment for why drives/drive_applications are separate tables). Core
// mechanics (eligibility check, fit score, apply/withdraw/shortlist) are
// fully deterministic and never depend on Gemini, so they keep working
// with GEMINI_API_KEY unset — only the two qualitative "AI layer" extras
// (ranking insights, missing-skill suggestions) are optional and degrade
// gracefully via the same getGemini() pattern used throughout this app.

export type EligibilityReason = {
  criterion: string;
  met: boolean;
  blocking: boolean;
  detail: string;
};
export type DriveEligibility = {
  eligible: boolean;
  fitScore: number;
  reasons: EligibilityReason[];
};

type SupabaseServer = ReturnType<typeof getSupabaseServerClient>;

function mean(values: (number | null | undefined)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  if (!present.length) return null;
  return present.reduce((a, b) => a + b, 0) / present.length;
}

async function computeDriveEligibility(
  supabase: SupabaseServer,
  driveId: string,
  studentId: string,
): Promise<{ error: string } | { drive: Record<string, unknown>; eligibility: DriveEligibility }> {
  const { data: drive, error: driveError } = await supabase
    .from("placement_drives")
    .select(
      "id, role, status, min_cgpa, allowed_branches, allowed_graduation_years, min_year_of_study, application_deadline, max_applicants, college_id",
    )
    .eq("id", driveId)
    .maybeSingle();
  if (driveError) return { error: driveError.message };
  if (!drive) return { error: "This drive no longer exists." };

  const [{ data: profile }, { data: resume }, { data: codingSessions }, { data: voiceSessions }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("cgpa, branch, graduation_year, year_of_study")
        .eq("id", studentId)
        .maybeSingle(),
      supabase
        .from("resumes")
        .select("ats_score")
        .eq("profile_id", studentId)
        .eq("is_current", true)
        .maybeSingle(),
      supabase
        .from("coding_interview_sessions")
        .select("overall_score")
        .eq("profile_id", studentId)
        .eq("status", "evaluated")
        .order("completed_at", { ascending: false })
        .limit(1),
      supabase
        .from("voice_interview_sessions")
        .select("overall_score")
        .eq("profile_id", studentId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1),
    ]);

  const reasons: EligibilityReason[] = [];

  if (drive.min_cgpa != null) {
    const met = profile?.cgpa != null && profile.cgpa >= drive.min_cgpa;
    reasons.push({
      criterion: "CGPA",
      met,
      blocking: true,
      detail:
        profile?.cgpa != null
          ? `Your CGPA is ${profile.cgpa}; this drive requires ${drive.min_cgpa}+.`
          : `This drive requires a CGPA of ${drive.min_cgpa}+, but you haven't set your CGPA on your profile yet.`,
    });
  }

  if (drive.allowed_branches?.length) {
    const met = !!profile?.branch && drive.allowed_branches.includes(profile.branch);
    reasons.push({
      criterion: "Branch",
      met,
      blocking: true,
      detail: profile?.branch
        ? `Your branch (${profile.branch}) ${met ? "matches" : "isn't in"} the eligible branches: ${drive.allowed_branches.join(", ")}.`
        : `This drive is limited to: ${drive.allowed_branches.join(", ")}, but your branch isn't set on your profile yet.`,
    });
  }

  if (drive.allowed_graduation_years?.length) {
    const met =
      profile?.graduation_year != null &&
      drive.allowed_graduation_years.includes(profile.graduation_year);
    reasons.push({
      criterion: "Graduation year",
      met,
      blocking: true,
      detail: profile?.graduation_year
        ? `Your graduation year (${profile.graduation_year}) ${met ? "matches" : "isn't in"} the eligible years: ${drive.allowed_graduation_years.join(", ")}.`
        : `This drive is limited to graduation years ${drive.allowed_graduation_years.join(", ")}, but your graduation year isn't set yet.`,
    });
  }

  if (drive.min_year_of_study != null) {
    const met = profile?.year_of_study != null && profile.year_of_study >= drive.min_year_of_study;
    reasons.push({
      criterion: "Year of study",
      met,
      blocking: true,
      detail: profile?.year_of_study
        ? `You're in year ${profile.year_of_study}; this drive requires year ${drive.min_year_of_study}+.`
        : `This drive requires year of study ${drive.min_year_of_study}+, but yours isn't set yet.`,
    });
  }

  const codingScore = codingSessions?.[0]?.overall_score ?? null;
  const hrScore = voiceSessions?.[0]?.overall_score ?? null;
  const hasInterviewData = codingScore != null || hrScore != null;
  reasons.push({
    criterion: "Interview readiness",
    met: hasInterviewData,
    blocking: false,
    detail: hasInterviewData
      ? `You've completed practice interviews (coding ${codingScore ?? "n/a"}, HR ${hrScore ?? "n/a"}) — good preparation signal for recruiters.`
      : "You haven't completed a practice coding or HR interview yet — this isn't required to apply, but strengthens your profile.",
  });

  const blockingReasons = reasons.filter((r) => r.blocking);
  const eligible = blockingReasons.every((r) => r.met);

  const eligibilityComponent = blockingReasons.length
    ? (blockingReasons.filter((r) => r.met).length / blockingReasons.length) * 100
    : 100;
  const atsComponent = resume?.ats_score ?? 50;
  const interviewComponent = mean([codingScore, hrScore]) ?? 50;
  const fitScore = Math.round(
    0.5 * eligibilityComponent + 0.3 * atsComponent + 0.2 * interviewComponent,
  );

  return { drive, eligibility: { eligible, fitScore, reasons } };
}

export const checkDriveEligibilityFn = createServerFn({ method: "POST" })
  .validator(z.object({ driveId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null; eligibility?: DriveEligibility }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const result = await computeDriveEligibility(supabase, data.driveId, auth.user.id);
    if ("error" in result) return { error: result.error };
    return { error: null, eligibility: result.eligibility };
  });

export const applyToDriveFn = createServerFn({ method: "POST" })
  .validator(z.object({ driveId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null; applicationId?: string }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const result = await computeDriveEligibility(supabase, data.driveId, auth.user.id);
    if ("error" in result) return { error: result.error };
    const { drive, eligibility } = result;

    if (drive.status !== "published") return { error: "This drive isn't open for applications." };
    if (drive.application_deadline && new Date(drive.application_deadline as string) < new Date()) {
      return { error: "The application deadline for this drive has passed." };
    }
    if (!eligibility.eligible) {
      return { error: "You don't meet the eligibility criteria for this drive yet." };
    }

    if (drive.max_applicants != null) {
      const { count } = await supabase
        .from("drive_applications")
        .select("id", { count: "exact", head: true })
        .eq("drive_id", data.driveId);
      if ((count ?? 0) >= (drive.max_applicants as number)) {
        return { error: "This drive has reached its maximum number of applicants." };
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("drive_applications")
      .insert({
        drive_id: data.driveId,
        student_id: auth.user.id,
        ai_fit_score: eligibility.fitScore,
        eligibility_snapshot: eligibility as unknown as Json,
      })
      .select("id")
      .single();
    if (insertError) {
      if (insertError.code === "23505") return { error: "You've already applied to this drive." };
      return { error: insertError.message };
    }

    return { error: null, applicationId: inserted.id };
  });

export const withdrawDriveApplicationFn = createServerFn({ method: "POST" })
  .validator(z.object({ applicationId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: application, error: fetchError } = await supabase
      .from("drive_applications")
      .select("id, drive_id, student_id, status")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (fetchError) return { error: fetchError.message };
    if (!application || application.student_id !== auth.user.id)
      return { error: "Application not found." };
    if (application.status === "withdrawn")
      return { error: "This application is already withdrawn." };

    const { data: drive } = await supabase
      .from("placement_drives")
      .select("application_deadline")
      .eq("id", application.drive_id)
      .maybeSingle();
    if (drive?.application_deadline && new Date(drive.application_deadline) < new Date()) {
      return { error: "The application deadline has passed — you can no longer withdraw." };
    }

    const { error: updateError } = await supabase
      .from("drive_applications")
      .update({ status: "withdrawn", withdrawn_at: new Date().toISOString() })
      .eq("id", data.applicationId);
    if (updateError) return { error: updateError.message };
    return { error: null };
  });

const SHORTLIST_STAGE_STATUS: Record<string, string> = {
  shortlisted: "shortlisted",
  interview: "interview_scheduled",
  selected: "selected",
};

export const shortlistApplicantFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      applicationId: z.string().uuid(),
      stage: z.enum(["shortlisted", "interview", "selected"]),
      notes: z.string().trim().max(2000).optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: application } = await supabase
      .from("drive_applications")
      .select("id, ai_fit_score")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (!application) return { error: "Application not found." };

    const { error: shortlistError } = await supabase.from("drive_shortlists").insert({
      application_id: data.applicationId,
      stage: data.stage,
      fit_score: application.ai_fit_score,
      notes: data.notes ?? null,
      shortlisted_by: auth.user.id,
    });
    if (shortlistError) return { error: shortlistError.message };

    const { error: statusError } = await supabase
      .from("drive_applications")
      .update({ status: SHORTLIST_STAGE_STATUS[data.stage], updated_at: new Date().toISOString() })
      .eq("id", data.applicationId);
    if (statusError) return { error: statusError.message };

    return { error: null };
  });

export const rejectApplicantFn = createServerFn({ method: "POST" })
  .validator(z.object({ applicationId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { error } = await supabase
      .from("drive_applications")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", data.applicationId);
    if (error) {
      console.error("[college] reject applicant failed:", error.message);
      return { error: "Could not reject this applicant." };
    }
    return { error: null };
  });

function getGemini(): { client: GoogleGenAI } | { error: string } {
  // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable AI drive insights.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "AI insights aren't configured yet (missing GEMINI_API_KEY)." };
  return { client: new GoogleGenAI({ apiKey }) };
}

export const generateDriveRankingInsightsFn = createServerFn({ method: "POST" })
  .validator(z.object({ driveId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null; insight?: string }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };
    if (!(await checkRateLimit(`ai:drive-ranking:${auth.user.id}`, 15, 600))) {
      return { error: RATE_LIMIT_MESSAGE };
    }

    const geminiResult = getGemini();
    if ("error" in geminiResult) return { error: geminiResult.error };

    const { data: drive } = await supabase
      .from("placement_drives")
      .select("role, min_cgpa, allowed_branches")
      .eq("id", data.driveId)
      .maybeSingle();
    if (!drive) return { error: "Drive not found." };

    const { data: applications, error: appsError } = await supabase
      .from("drive_applications")
      .select("id, ai_fit_score, status, student_id")
      .eq("drive_id", data.driveId)
      .neq("status", "withdrawn")
      .order("ai_fit_score", { ascending: false })
      .limit(15);
    if (appsError) return { error: appsError.message };
    if (!applications || applications.length === 0) {
      return { error: "No applicants yet to generate ranking insights for." };
    }

    const studentIds = applications.map((a) => a.student_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, branch, cgpa, graduation_year")
      .in("id", studentIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const summary = applications
      .map((a) => {
        const p = profileMap.get(a.student_id);
        return `${p?.full_name ?? "Candidate"}: fit score ${a.ai_fit_score ?? "n/a"}, branch ${p?.branch ?? "n/a"}, CGPA ${p?.cgpa ?? "n/a"}, status ${a.status}`;
      })
      .join("\n");

    const prompt = `You are helping a college placement cell prioritize candidates for a "${drive.role}" campus drive${drive.min_cgpa ? ` (min CGPA ${drive.min_cgpa})` : ""}.

Candidates (already ranked by a deterministic fit score combining eligibility, resume ATS score, and interview performance):
${summary}

In 3-5 short bullet points, give the placement admin practical ranking/prioritization advice — who to prioritize and why, any patterns worth noting. Be concise and specific to the data above. Plain text bullets, no markdown headers.`;

    let text: string | undefined;
    try {
      const response = await withGeminiRetry(() =>
        geminiResult.client.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
        }),
      );
      text = response.text;
    } catch (err) {
      return { error: friendlyGeminiError(err, "college.rankingInsights") };
    }
    if (!text) return { error: "AI insights returned no result. Try again." };
    return { error: null, insight: text.trim() };
  });

export const generateMissingSkillSuggestionsFn = createServerFn({ method: "POST" })
  .validator(z.object({ applicationId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null; suggestions?: string[] }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };
    if (!(await checkRateLimit(`ai:missing-skills:${auth.user.id}`, 15, 600))) {
      return { error: RATE_LIMIT_MESSAGE };
    }

    const geminiResult = getGemini();
    if ("error" in geminiResult) return { error: geminiResult.error };

    const { data: application } = await supabase
      .from("drive_applications")
      .select("student_id, drive_id, status")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (!application) return { error: "Application not found." };
    if (application.status !== "rejected") {
      return { error: "Missing-skill suggestions are shown for rejected applications." };
    }

    const [{ data: drive }, { data: resume }] = await Promise.all([
      supabase.from("placement_drives").select("role").eq("id", application.drive_id).maybeSingle(),
      supabase
        .from("resumes")
        .select("analysis")
        .eq("profile_id", application.student_id)
        .eq("is_current", true)
        .maybeSingle(),
    ]);

    const analysis = resume?.analysis as { skills?: string[]; technologies?: string[] } | null;
    const candidateSkills = analysis
      ? [...(analysis.skills ?? []), ...(analysis.technologies ?? [])]
      : [];

    const prompt = `A student was not selected for a "${drive?.role ?? "campus drive"}" role. Their current resume skills: ${candidateSkills.length ? candidateSkills.join(", ") : "none listed"}.

Suggest 3-5 specific skills or areas they should develop to improve their chances for similar roles in future drives. Respond with ONLY a JSON array of short strings (no markdown fences, no prose), e.g. ["System design fundamentals", "Advanced SQL"].`;

    let text: string | undefined;
    try {
      const response = await withGeminiRetry(() =>
        geminiResult.client.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: { responseMimeType: "application/json" },
        }),
      );
      text = response.text;
    } catch (err) {
      return { error: friendlyGeminiError(err, "college.missingSkills") };
    }
    if (!text) return { error: "AI suggestions returned no result. Try again." };

    let suggestions: string[];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      suggestions = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { error: "Could not parse AI suggestions. Try again." };
    }
    return { error: null, suggestions: suggestions.slice(0, 5) };
  });
