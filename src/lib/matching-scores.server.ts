// Server-side computation of AI match scores for a job application.
// Called right after a student applies (see useApplyToJob in jobs-client.ts)
// so job_applications.ats_score / skills_score / job_match_percentage are
// real, persisted numbers rather than the always-null columns the schema
// ships with.
//
// Scoring formula (kept simple & transparent, not a black box):
//   ats_score            = the applicant's current resume's ats_score (already
//                           computed by Gemini on upload — see resume.server.ts),
//                           or null if they have no resume yet.
//   skills_score          = 0-100 overlap between the applicant's VERIFIED
//                           skills and the job's `tags`, using matching.ts's
//                           existing synonym-expansion engine (same one used
//                           by the recruiter search/sourcing pages) — a direct
//                           verified match counts full credit, a synonym/
//                           related-term match counts partial (0.7) credit.
//   job_match_percentage  = weighted average of the two: 60% skills_score +
//                           40% ats_score. If only one of the two is
//                           available, that one is used alone (100% weight)
//                           rather than penalizing the applicant for a
//                           missing signal.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import { scoreCandidate, type Candidate } from "@/lib/matching";

export type ApplicationScores = {
  atsScore: number | null;
  skillsScore: number | null;
  jobMatchPercentage: number | null;
};

const SKILLS_WEIGHT = 0.6;
const ATS_WEIGHT = 0.4;

export const computeApplicationScoresFn = createServerFn({ method: "POST" })
  .validator(z.object({ applicationId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null; scores?: ApplicationScores }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: application, error: appError } = await supabase
      .from("job_applications")
      .select("id, job_id, applicant_id")
      .eq("id", data.applicationId)
      .single();
    if (appError || !application) return { error: "Application not found." };
    // Scoring runs right after the applicant's own insert; only they (or an
    // admin) may trigger it for their own application.
    if (application.applicant_id !== auth.user.id) return { error: "Not authorized." };

    const [jobRes, resumeRes, skillsRes] = await Promise.all([
      supabase.from("jobs").select("tags").eq("id", application.job_id).single(),
      supabase
        .from("resumes")
        .select("ats_score")
        .eq("profile_id", application.applicant_id)
        .eq("is_current", true)
        .maybeSingle(),
      supabase
        .from("skills")
        .select("skill_name")
        .eq("profile_id", application.applicant_id)
        .eq("verified", true),
    ]);

    const atsScore = resumeRes.data?.ats_score ?? null;
    const requiredSkills = jobRes.data?.tags ?? [];

    let skillsScore: number | null = null;
    if (requiredSkills.length > 0) {
      const candidate: Candidate = {
        id: application.applicant_id,
        name: "",
        avatar: "",
        headline: "",
        location: "",
        years: 0,
        verifiedSkills: (skillsRes.data ?? []).map((s) => s.skill_name ?? "").filter(Boolean),
        streak: 0,
      };
      const { score } = scoreCandidate(candidate, requiredSkills);
      skillsScore = Math.round(score * 100);
    }

    let jobMatchPercentage: number | null = null;
    if (skillsScore !== null && atsScore !== null) {
      jobMatchPercentage = Math.round(skillsScore * SKILLS_WEIGHT + atsScore * ATS_WEIGHT);
    } else if (skillsScore !== null) {
      jobMatchPercentage = skillsScore;
    } else if (atsScore !== null) {
      jobMatchPercentage = atsScore;
    }

    // Written via the admin client, not the caller's own session: the
    // authorization check above (applicant_id === auth.user.id) already
    // ran under RLS, so this is safe — and it's what lets a Sprint 31 DB
    // guard (guard_job_application_update) block a direct client update
    // of these columns while still allowing this real computation through.
    const admin = getSupabaseAdminClient();
    const { error: updateError } = await admin
      .from("job_applications")
      .update({
        ats_score: atsScore,
        skills_score: skillsScore,
        job_match_percentage: jobMatchPercentage,
      })
      .eq("id", application.id);
    if (updateError) return { error: updateError.message };

    return { error: null, scores: { atsScore, skillsScore, jobMatchPercentage } };
  });
