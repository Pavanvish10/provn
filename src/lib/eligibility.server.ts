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
//
// Sprint 21 deepens this same run rather than building a fourth parallel
// "check against a target company/role" system: adds a soft/technical
// skill split, four more scored dimensions (communication/problem-
// solving/DSA/system-design), and a structured per-skill learning
// breakdown. Resource recommendations never include a fabricated URL —
// courses/documentation/practice sites are named only (no link), and the
// one real link (YouTube) is a constructed search-results URL built
// server-side from a search query, never a specific fabricated video.

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

export type SkillBreakdownResources = {
  courses: string[];
  youtubeSearchQuery: string;
  youtubeUrl: string;
  documentation: string[];
  practiceWebsites: string[];
  codingQuestions: string[];
};

export type SkillBreakdownEntry = {
  skill: string;
  category: "technical" | "soft";
  whyItMatters: string;
  difficulty: "Easy" | "Medium" | "Hard";
  estimatedLearningTime: string;
  priority: "High" | "Medium" | "Low";
  learningOrder: number;
  resources: SkillBreakdownResources;
};

type GeneratedEligibility = {
  missingSkills: string[];
  missingSoftSkills: string[];
  missingProjects: string[];
  missingCertifications: string[];
  communicationLevel: number;
  problemSolvingLevel: number;
  dsaLevel: number;
  systemDesignReadiness: number;
  overallHiringProbability: number;
  scoreRationale: ScoreRationale;
  recommendations: Recommendations;
  skillBreakdown: {
    skill: string;
    category: string;
    whyItMatters: string;
    difficulty: string;
    estimatedLearningTime: string;
    priority: string;
    learningOrder: number;
    resources: {
      courses: string[];
      youtubeSearchQuery: string;
      documentation: string[];
      practiceWebsites: string[];
      codingQuestions: string[];
    };
  }[];
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
  "missingSkills": string[] (technical skills this role/company expects that the candidate doesn't clearly have — 3-6 items),
  "missingSoftSkills": string[] (soft skills — communication, teamwork, leadership, etc. — this role/company expects that the candidate's interview history doesn't clearly show — 2-4 items),
  "missingProjects": string[] (types of projects the candidate should have on their resume to prove readiness for this role but currently doesn't — 2-4 items, concrete not generic),
  "missingCertifications": string[] (certifications that would meaningfully strengthen this candidate's case for this role/company — 0-4 items, only real, recognized certifications, empty array if none would meaningfully help),
  "communicationLevel": number (0-100, based on actual interview performance below; 50 if no interview data exists),
  "problemSolvingLevel": number (0-100, based on actual interview performance below; 50 if no interview data exists),
  "dsaLevel": number (0-100, based on actual coding interview performance below; 50 if no coding interview data exists),
  "systemDesignReadiness": number (0-100, inferred from role seniority, resume experience, and any system-design-relevant signals below; be conservative if there's no direct evidence),
  "overallHiringProbability": number (0-100, your honest holistic estimate of this candidate's chance of being hired for this specific role/company today — do not default to high numbers),
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
  },
  "skillBreakdown": [
    {
      "skill": string (one specific missing skill — technical or soft, drawn from missingSkills/missingSoftSkills above),
      "category": string (exactly "technical" or "soft"),
      "whyItMatters": string (1-2 sentences: why this specific role/company cares about this skill),
      "difficulty": string (exactly "Easy", "Medium", or "Hard" — how hard this is to learn from the candidate's current level),
      "estimatedLearningTime": string (a realistic estimate, e.g. "1-2 weeks", "2-3 months"),
      "priority": string (exactly "High", "Medium", or "Low"),
      "learningOrder": number (1 = learn first; order every entry so the full list forms one sensible learning sequence, no duplicate numbers),
      "resources": {
        "courses": string[] (1-3 REAL, well-known course/platform names only, e.g. "freeCodeCamp: Data Structures and Algorithms" — never a specific URL),
        "youtubeSearchQuery": string (a good, specific YouTube search phrase for this skill — not a video title, not a URL),
        "documentation": string[] (0-2 REAL, well-known official documentation site names, e.g. "MDN Web Docs", "PostgreSQL Documentation" — never a specific URL),
        "practiceWebsites": string[] (0-2 REAL, well-known practice platform names, e.g. "LeetCode", "HackerRank", "System Design Primer (GitHub)" — never a specific URL),
        "codingQuestions": string[] (0-3 original practice question prompts you write yourself for this skill, e.g. "Implement an LRU cache with O(1) get/put" — plain text questions, not links)
      }
    }
  ] (one entry per item in missingSkills + missingSoftSkills combined, ordered sensibly — omit only if there are truly no missing skills)
}

Be honest and specific, grounded strictly in the real context below — never invent experience or credentials the candidate doesn't have. Never include a URL anywhere in your response — every resource field above asks for a name or a search phrase only; the application constructs any real links itself.`;

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
  codingInterview: {
    overall_score: number | null;
    correctness_score: number | null;
    optimization_score: number | null;
    mistakes: string[] | null;
  } | null;
  hrInterview: {
    overall_score: number | null;
    communication_score: number | null;
    problem_solving_score: number | null;
    hr_readiness_score: number | null;
    weaknesses: string[] | null;
  } | null;
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

  if (params.codingInterview) {
    const ci = params.codingInterview;
    parts.push(
      `MOST RECENT CODING INTERVIEW (use this for dsaLevel): overall ${ci.overall_score ?? "n/a"}/100, correctness ${ci.correctness_score ?? "n/a"}/100, optimization ${ci.optimization_score ?? "n/a"}/100. Mistakes noted: ${(ci.mistakes ?? []).join(", ") || "none recorded"}.`,
    );
  } else {
    parts.push(
      "MOST RECENT CODING INTERVIEW: none completed yet — use this to inform dsaLevel conservatively.",
    );
  }

  if (params.hrInterview) {
    const hi = params.hrInterview;
    parts.push(
      `MOST RECENT HR/BEHAVIORAL INTERVIEW (use this for communicationLevel/problemSolvingLevel): overall ${hi.overall_score ?? "n/a"}/100, communication ${hi.communication_score ?? "n/a"}/100, problem solving ${hi.problem_solving_score ?? "n/a"}/100, HR readiness ${hi.hr_readiness_score ?? "n/a"}/100. Weaknesses: ${(hi.weaknesses ?? []).join(", ") || "none recorded"}.`,
    );
  } else {
    parts.push("MOST RECENT HR/BEHAVIORAL INTERVIEW: none completed yet.");
  }

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

    const { data: codingInterview } = await supabase
      .from("coding_interview_sessions")
      .select("id, overall_score, correctness_score, optimization_score, mistakes")
      .eq("profile_id", auth.user.id)
      .eq("status", "evaluated")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: hrInterview } = await supabase
      .from("voice_interview_sessions")
      .select(
        "id, overall_score, communication_score, problem_solving_score, hr_readiness_score, weaknesses",
      )
      .eq("profile_id", auth.user.id)
      .eq("status", "completed")
      .in("interview_type", ["hr", "behavioral", "manager"])
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
      codingInterview: codingInterview ?? null,
      hrInterview: hrInterview ?? null,
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

    const clamp = (n: number | undefined) => Math.max(0, Math.min(100, Math.round(n ?? 50)));
    const DIFFICULTIES = new Set(["Easy", "Medium", "Hard"]);
    const PRIORITIES = new Set(["High", "Medium", "Low"]);

    // Every real link is built here, server-side, from a search query — never
    // accepted as a URL from the model, so nothing fabricated can reach the UI.
    const skillBreakdown: SkillBreakdownEntry[] = (generated.skillBreakdown ?? [])
      .map((s, i) => {
        const query = (s.resources?.youtubeSearchQuery ?? s.skill ?? "").trim();
        const resources: SkillBreakdownResources = {
          courses: s.resources?.courses ?? [],
          youtubeSearchQuery: query,
          youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query || s.skill)}`,
          documentation: s.resources?.documentation ?? [],
          practiceWebsites: s.resources?.practiceWebsites ?? [],
          codingQuestions: s.resources?.codingQuestions ?? [],
        };
        return {
          skill: s.skill,
          category: (s.category === "soft" ? "soft" : "technical") as "technical" | "soft",
          whyItMatters: s.whyItMatters ?? "",
          difficulty: (DIFFICULTIES.has(s.difficulty) ? s.difficulty : "Medium") as
            "Easy" | "Medium" | "Hard",
          estimatedLearningTime: s.estimatedLearningTime ?? "",
          priority: (PRIORITIES.has(s.priority) ? s.priority : "Medium") as
            "High" | "Medium" | "Low",
          learningOrder: Number.isFinite(s.learningOrder) ? s.learningOrder : i + 1,
          resources,
        };
      })
      .sort((a, b) => a.learningOrder - b.learningOrder);

    const { data: inserted, error: insertError } = await supabase
      .from("eligibility_reports")
      .insert({
        profile_id: auth.user.id,
        target_company: companyProfile?.name ?? data.targetCompany ?? null,
        target_role: data.targetRole,
        job_description_text: data.jobDescriptionText ?? null,
        resume_id: resume?.id ?? null,
        voice_interview_session_id: latestSession?.id ?? null,
        coding_interview_session_id: codingInterview?.id ?? null,
        hr_interview_session_id: hrInterview?.id ?? null,
        career_roadmap_id: activeRoadmap?.id ?? null,
        roadmap_progress_percent: roadmapProgressPercent,
        ats_score: atsScore,
        company_eligibility_score: companyEligibilityScore,
        role_match_score: roleMatchScore,
        skill_match_percent: skillMatchPercent,
        estimated_interview_readiness: estimatedInterviewReadiness,
        missing_skills: generated.missingSkills ?? [],
        missing_soft_skills: generated.missingSoftSkills ?? [],
        missing_projects: generated.missingProjects ?? [],
        missing_certifications: generated.missingCertifications ?? [],
        communication_level: clamp(generated.communicationLevel),
        problem_solving_level: clamp(generated.problemSolvingLevel),
        dsa_level: clamp(generated.dsaLevel),
        system_design_readiness: clamp(generated.systemDesignReadiness),
        overall_hiring_probability: clamp(generated.overallHiringProbability),
        score_rationale: generated.scoreRationale ?? {},
        recommendations: generated.recommendations ?? {},
        skill_breakdown: skillBreakdown,
      })
      .select("id")
      .single();
    if (insertError || !inserted)
      return { error: insertError?.message ?? "Could not save the eligibility report." };

    return { error: null, reportId: inserted.id };
  });
