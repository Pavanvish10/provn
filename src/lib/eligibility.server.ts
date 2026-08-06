import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";
import type { ResumeAnalysis } from "@/lib/resume.server";
import { getCompanyProfile } from "@/ai/resume/CompanyProfile";
import { JobDescriptionAnalyzer } from "@/ai/resume/JobDescriptionAnalyzer";
import { SkillMatcher } from "@/services/job/SkillMatcher";

// Sprint 16: a repeatable, historical "run it anytime" eligibility check
// against a target company/role/JD — distinct from career_roadmaps
// (Sprint 15's single active multi-month plan). Pulls in the resume
// analysis (Sprint 13), latest interview report (Sprint 14), and the
// active roadmap's completion % (Sprint 15) as inputs, then asks Gemini
// to explain each score and recommend next steps. Every run is a new
// row, so the candidate can watch their eligibility trend over time.

type ScoreRationale = {
  atsScore: string;
  companyEligibility: string;
  roleMatch: string;
  skillMatch: string;
  interviewReadiness: string;
};

type Recommendations = {
  nextSkills: string[];
  projectsToBuild: string[];
  certifications: string[];
  codingTopics: string[];
  interviewPracticePriorities: string[];
};

type GeneratedEligibility = {
  missingSkills: string[];
  missingProjects: string[];
  missingCertifications: string[];
  scoreRationale: ScoreRationale;
  recommendations: Recommendations;
};

const READINESS_ADJUSTMENT: Record<"easy" | "medium" | "hard", number> = {
  easy: 10,
  medium: 0,
  hard: -10,
};

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function meanOf(values: (number | null)[]): number {
  const present = values.filter((v): v is number => v != null);
  if (!present.length) return 50;
  return present.reduce((a, b) => a + b, 0) / present.length;
}

function getGemini(): { client: GoogleGenAI } | { error: string } {
  // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable the AI eligibility engine.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return { error: "AI eligibility analysis is not configured yet (missing GEMINI_API_KEY)." };
  return { client: new GoogleGenAI({ apiKey }) };
}

const ELIGIBILITY_PROMPT = (params: {
  targetRole: string;
  targetCompany: string | null;
  contextBlock: string;
}) => `You are an ATS and hiring-panel simulator evaluating a candidate's eligibility for the role of "${params.targetRole}"${params.targetCompany ? ` at ${params.targetCompany}` : ""}.

${params.contextBlock}

Respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "missingSkills": string[] (skills this role/company expects that the candidate doesn't clearly have — 3-6 items),
  "missingProjects": string[] (types of projects the candidate should have on their resume to prove readiness for this role but currently doesn't — 2-4 items, concrete not generic),
  "missingCertifications": string[] (certifications that would meaningfully strengthen this candidate's case for this role/company — 0-4 items, only real, recognized certifications, empty array if none would meaningfully help),
  "scoreRationale": {
    "atsScore": string (1-2 sentences: why the resume's general ATS score is what it is),
    "companyEligibility": string (1-2 sentences: why this company-specific eligibility score is what it is, referencing the company's actual culture/bar below),
    "roleMatch": string (1-2 sentences: why the role match score is what it is),
    "skillMatch": string (1-2 sentences: why the skill match percentage is what it is — say plainly if no JD was provided to compare against),
    "interviewReadiness": string (1-2 sentences: why the estimated interview readiness is what it is, referencing actual interview performance and roadmap progress if available)
  },
  "recommendations": {
    "nextSkills": string[] (3-5 skills to learn next, priority order),
    "projectsToBuild": string[] (2-4 concrete project ideas that would close the gaps above),
    "certifications": string[] (0-3 certifications worth pursuing, empty if none needed),
    "codingTopics": string[] (3-5 coding/DSA or role-specific technical topics to drill),
    "interviewPracticePriorities": string[] (2-4 specific things to focus on in the next mock interview)
  }
}

Be honest and specific, grounded strictly in the real context below — never invent experience or credentials the candidate doesn't have.`;

function buildContextBlock(params: {
  targetCompany: string | null;
  jobDescriptionText: string | null;
  candidateSkills: string[];
  resumeAnalysis: ResumeAnalysis | null;
  atsScore: number;
  jdSkills: { required: string[]; preferred: string[] } | null;
  latestSession: {
    role: string;
    company: string | null;
    overall_score: number | null;
    strengths: string[] | null;
    weaknesses: string[] | null;
    missing_skills: string[] | null;
  } | null;
  roadmapProgressPercent: number | null;
  scores: {
    ats: number;
    companyEligibility: number;
    roleMatch: number;
    skillMatch: number | null;
    interviewReadiness: number;
  };
}): string {
  const parts: string[] = [];

  const companyProfile = params.targetCompany ? getCompanyProfile(params.targetCompany) : null;
  if (companyProfile) {
    parts.push(
      `TARGET COMPANY: ${companyProfile.name} — ${companyProfile.interviewStyle} Bar: ${companyProfile.difficulty}. Focus areas: ${companyProfile.preferredTopics.join(", ")}.`,
    );
  }

  if (params.jobDescriptionText?.trim()) {
    parts.push(`JOB DESCRIPTION:\n${params.jobDescriptionText.trim().slice(0, 4000)}`);
  }
  if (params.jdSkills && (params.jdSkills.required.length || params.jdSkills.preferred.length)) {
    parts.push(
      `JD REQUIRED SKILLS: ${params.jdSkills.required.join(", ") || "none extracted"}\nJD PREFERRED SKILLS: ${params.jdSkills.preferred.join(", ") || "none extracted"}`,
    );
  }

  const a = params.resumeAnalysis;
  if (params.candidateSkills.length || a) {
    const resumeParts: string[] = [`General ATS score: ${params.atsScore}/100`];
    if (params.candidateSkills.length)
      resumeParts.push(`Skills: ${params.candidateSkills.slice(0, 40).join(", ")}`);
    if (a?.projects?.length)
      resumeParts.push(
        `Projects: ${a.projects
          .slice(0, 6)
          .map((p) => p.name)
          .join(", ")}`,
      );
    if (a?.certifications?.length)
      resumeParts.push(`Certifications: ${a.certifications.slice(0, 10).join(", ")}`);
    else resumeParts.push("Certifications: none listed");
    if (a?.experience?.length) {
      resumeParts.push(
        `Experience: ${a.experience
          .slice(0, 5)
          .map((e) => `${e.title} at ${e.company}${e.summary ? ` — ${e.summary}` : ""}`)
          .join("; ")}`,
      );
    }
    parts.push(`CANDIDATE RESUME:\n${resumeParts.join("\n")}`);
  } else {
    parts.push("CANDIDATE RESUME: none uploaded yet.");
  }

  if (params.latestSession) {
    const s = params.latestSession;
    parts.push(
      `MOST RECENT MOCK INTERVIEW (${s.role}${s.company ? ` at ${s.company}` : ""}): overall score ${s.overall_score ?? "n/a"}/100.\nStrengths: ${(s.strengths ?? []).join(", ") || "none recorded"}.\nWeaknesses: ${(s.weaknesses ?? []).join(", ") || "none recorded"}.\nSkills the interview flagged as missing: ${(s.missing_skills ?? []).join(", ") || "none recorded"}.`,
    );
  } else {
    parts.push("MOST RECENT MOCK INTERVIEW: none completed yet.");
  }

  parts.push(
    params.roadmapProgressPercent != null
      ? `CAREER ROADMAP PROGRESS: ${params.roadmapProgressPercent}% of the candidate's active preparation roadmap is complete.`
      : "CAREER ROADMAP PROGRESS: no active roadmap.",
  );

  parts.push(
    `COMPUTED SCORES (for context only, do not re-derive different numbers): ATS ${params.scores.ats}/100, company eligibility ${params.scores.companyEligibility}/100, role match ${params.scores.roleMatch}/100, skill match ${params.scores.skillMatch ?? "n/a"}%, interview readiness ${params.scores.interviewReadiness}/100.`,
  );

  return parts.join("\n\n");
}

export const generateEligibilityReportFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      targetRole: z.string().trim().min(2).max(100),
      targetCompany: z.string().trim().max(100).optional(),
      jobDescriptionText: z.string().trim().max(6000).optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ error: string | null; reportId?: string }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const geminiResult = getGemini();
    if ("error" in geminiResult) return { error: geminiResult.error };

    const { data: resume } = await supabase
      .from("resumes")
      .select("id, analysis, ats_score")
      .eq("profile_id", auth.user.id)
      .eq("is_current", true)
      .maybeSingle();
    const resumeAnalysis = (resume?.analysis as unknown as ResumeAnalysis | null) ?? null;
    const candidateSkills = resumeAnalysis
      ? [
          ...(resumeAnalysis.skills ?? []),
          ...(resumeAnalysis.technologies ?? []),
          ...(resumeAnalysis.frameworks ?? []),
        ]
      : [];
    const atsScore = resume?.ats_score ?? 50;

    const { data: latestSession } = await supabase
      .from("voice_interview_sessions")
      .select("id, role, company, overall_score, strengths, weaknesses, missing_skills")
      .eq("profile_id", auth.user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: activeRoadmap } = await supabase
      .from("career_roadmaps")
      .select("id")
      .eq("profile_id", auth.user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let roadmapProgressPercent: number | null = null;
    if (activeRoadmap) {
      const [{ count: total }, { count: completed }] = await Promise.all([
        supabase
          .from("career_roadmap_tasks")
          .select("*", { count: "exact", head: true })
          .eq("roadmap_id", activeRoadmap.id),
        supabase
          .from("career_roadmap_tasks")
          .select("*", { count: "exact", head: true })
          .eq("roadmap_id", activeRoadmap.id)
          .eq("completed", true),
      ]);
      if (total && total > 0) roadmapProgressPercent = Math.round(((completed ?? 0) / total) * 100);
    }

    let jdSkills: { required: string[]; preferred: string[] } | null = null;
    let skillMatchPercent: number | null = null;
    if (data.jobDescriptionText?.trim()) {
      const jdAnalysis = new JobDescriptionAnalyzer().analyze(data.jobDescriptionText);
      jdSkills = { required: jdAnalysis.requiredSkills, preferred: jdAnalysis.preferredSkills };
      const requiredSkills = [...jdAnalysis.requiredSkills, ...jdAnalysis.preferredSkills];
      if (requiredSkills.length) {
        skillMatchPercent = SkillMatcher.match(candidateSkills, requiredSkills).matchPercent;
      }
    }

    const interviewOverall = latestSession?.overall_score ?? null;
    const roleMatchScore = clampScore(meanOf([atsScore, skillMatchPercent]));
    const companyProfile = data.targetCompany ? getCompanyProfile(data.targetCompany) : null;
    const companyAdjustment = companyProfile ? READINESS_ADJUSTMENT[companyProfile.difficulty] : 0;
    const companyEligibilityScore = clampScore(roleMatchScore + companyAdjustment);
    const estimatedInterviewReadiness = clampScore(
      meanOf([interviewOverall, roleMatchScore, roadmapProgressPercent]),
    );

    const contextBlock = buildContextBlock({
      targetCompany: data.targetCompany ?? null,
      jobDescriptionText: data.jobDescriptionText ?? null,
      candidateSkills,
      resumeAnalysis,
      atsScore,
      jdSkills,
      latestSession: latestSession ?? null,
      roadmapProgressPercent,
      scores: {
        ats: atsScore,
        companyEligibility: companyEligibilityScore,
        roleMatch: roleMatchScore,
        skillMatch: skillMatchPercent,
        interviewReadiness: estimatedInterviewReadiness,
      },
    });

    let text: string | undefined;
    try {
      const response = await withGeminiRetry(() =>
        geminiResult.client.models.generateContent({
          model: GEMINI_MODEL,
          contents: ELIGIBILITY_PROMPT({
            targetRole: data.targetRole,
            targetCompany: companyProfile?.name ?? data.targetCompany ?? null,
            contextBlock,
          }),
          config: { responseMimeType: "application/json" },
        }),
      );
      text = response.text;
    } catch (err) {
      return { error: friendlyGeminiError(err, "eligibility.generate") };
    }
    if (!text) return { error: "AI eligibility analysis returned no result. Try again." };

    let generated: GeneratedEligibility;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      generated = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { error: "Could not parse the eligibility analysis. Try again." };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("eligibility_reports")
      .insert({
        profile_id: auth.user.id,
        target_company: companyProfile?.name ?? data.targetCompany ?? null,
        target_role: data.targetRole,
        job_description_text: data.jobDescriptionText ?? null,
        resume_id: resume?.id ?? null,
        voice_interview_session_id: latestSession?.id ?? null,
        career_roadmap_id: activeRoadmap?.id ?? null,
        roadmap_progress_percent: roadmapProgressPercent,
        ats_score: atsScore,
        company_eligibility_score: companyEligibilityScore,
        role_match_score: roleMatchScore,
        skill_match_percent: skillMatchPercent,
        estimated_interview_readiness: estimatedInterviewReadiness,
        missing_skills: generated.missingSkills ?? [],
        missing_projects: generated.missingProjects ?? [],
        missing_certifications: generated.missingCertifications ?? [],
        score_rationale: generated.scoreRationale ?? {},
        recommendations: generated.recommendations ?? {},
      })
      .select("id")
      .single();
    if (insertError || !inserted)
      return { error: insertError?.message ?? "Could not save the eligibility report." };

    return { error: null, reportId: inserted.id };
  });
