import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit.server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";
import type { ResumeAnalysis } from "@/lib/resume.server";
import { getCompanyProfile } from "@/ai/resume/CompanyProfile";
import { JobDescriptionAnalyzer } from "@/ai/resume/JobDescriptionAnalyzer";
import { SkillMatcher } from "@/services/job/SkillMatcher";
import type { Database } from "@/lib/supabase/types";

// Sprint 15: distinct from roadmap.server.ts/roadmap_templates (a shared,
// admin-curated track per role). This generates a roadmap unique to one
// candidate — grounded in their real resume analysis (Sprint 13), their
// most recent completed interview report (Sprint 14), a target
// company/role, and an optional job description.
//
// Sprint 22 deepens this same roadmap rather than building a fifth
// parallel "prepare for a target company/role" system: adds a
// certifications plan, a revision plan, a mock-interview schedule, and a
// predicted-readiness estimate, and pulls in the candidate's most recent
// coding interview (Sprint 17), HR interview (Sprint 18), and latest
// skill-gap check (Sprint 21) as extra grounding signals. Roadmap
// history already existed (archived rows are kept, never deleted) —
// this sprint surfaces it in the UI rather than duplicating storage.

type PlanItem = { title: string; detail: string };
type ProjectItem = { title: string; description: string; skillsPracticed: string[] };
type MilestoneItem = { month: number; title: string; description: string };
type MockInterviewScheduleEntry = {
  weekNumber: number;
  type: "coding" | "hr";
  title: string;
  description: string;
};
type DailyTaskTemplate = {
  dayOfWeek: number;
  title: string;
  description: string;
  category: string;
};
type PhaseTemplate = {
  phase: string;
  weeklyGoalTitle: string;
  weeklyGoalDescription: string;
  dailyTasks: DailyTaskTemplate[];
};

type GeneratedRoadmap = {
  skillGap: { matched: string[]; missing: string[]; priority: string[] };
  recommendedProjects: ProjectItem[];
  codingPracticePlan: PlanItem[];
  hrPrepPlan: PlanItem[];
  interviewPrepPlan: PlanItem[];
  certificationsPlan: PlanItem[];
  revisionPlan: PlanItem[];
  mockInterviewSchedule: MockInterviewScheduleEntry[];
  predictedReadinessWeeks: number;
  monthlyMilestones: MilestoneItem[];
  weeklyPhaseTemplates: PhaseTemplate[];
  summary: string;
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

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getGemini(): { client: GoogleGenAI } | { error: string } {
  // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable AI roadmap generation.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return { error: "AI roadmap generation is not configured yet (missing GEMINI_API_KEY)." };
  return { client: new GoogleGenAI({ apiKey }) };
}

const ROADMAP_PROMPT = (params: {
  targetRole: string;
  targetCompany: string | null;
  durationMonths: number;
  totalWeeks: number;
  contextBlock: string;
}) => `You are a senior career coach building a personalized, month-by-month preparation plan for a candidate targeting the role of "${params.targetRole}"${params.targetCompany ? ` at ${params.targetCompany}` : ""}, over a ${params.durationMonths}-month (${params.totalWeeks}-week) timeline.

${params.contextBlock}

Respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "skillGap": {
    "matched": string[] (skills the candidate already has that this role needs),
    "missing": string[] (skills this role needs that the candidate doesn't clearly have yet),
    "priority": string[] (2-5 of the missing skills to focus on first, ordered by impact)
  },
  "recommendedProjects": [
    { "title": string, "description": string (what to build and why it proves the missing skills), "skillsPracticed": string[] }
  ] (2-4 projects),
  "codingPracticePlan": [ { "title": string, "detail": string } ] (4-6 concrete steps, e.g. topics/problem categories to drill),
  "hrPrepPlan": [ { "title": string, "detail": string } ] (3-5 concrete steps for behavioral/HR readiness),
  "interviewPrepPlan": [ { "title": string, "detail": string } ] (3-5 concrete steps for the technical/role interview itself),
  "certificationsPlan": [ { "title": string (a real, recognized certification name), "detail": string (why it helps and roughly when to pursue it) } ] (0-4 items, empty array if none would meaningfully help),
  "revisionPlan": [ { "title": string, "detail": string } ] (3-5 steps for how the candidate should revisit/reinforce earlier material later in the plan, not just learn new things once),
  "mockInterviewSchedule": [
    { "weekNumber": number (1 through ${params.totalWeeks}), "type": string (exactly "coding" or "hr"), "title": string, "description": string }
  ] (3-6 checkpoints spaced sensibly across the ${params.totalWeeks}-week plan — a mix of coding and hr type, more frequent near the end),
  "predictedReadinessWeeks": number (1 through ${params.totalWeeks} — your honest estimate of how many weeks into this plan the candidate would realistically be interview-ready for this specific company/role, based on their current scores below — do not always default to the full duration),
  "monthlyMilestones": [
    { "month": number (1 through ${params.durationMonths}, one entry per month, no skipping), "title": string, "description": string }
  ] (exactly ${params.durationMonths} entries),
  "weeklyPhaseTemplates": [
    {
      "phase": string (short phase name, e.g. "Foundations", "Applied Practice", "Mock Interviews", "Final Polish"),
      "weeklyGoalTitle": string,
      "weeklyGoalDescription": string,
      "dailyTasks": [
        { "dayOfWeek": number (1=Monday through 7=Sunday, all 7 required), "title": string, "description": string, "category": string (one of: "coding","system-design","project","hr","behavioral","resume","networking","rest") }
      ] (exactly 7 entries, one per day of the week — include at least one lighter/rest day)
    }
  ] (3-5 phases that together represent how the whole ${params.durationMonths}-month plan should progress from foundational to interview-ready; do not generate one phase per week — these are reusable weekly templates the schedule will be built from),
  "summary": string (3-4 sentences: realistic overall assessment and what this plan is designed to close)
}

Be concrete and realistic, grounded in the candidate's actual context above — no generic filler.`;

function buildContextBlock(params: {
  targetRole: string;
  targetCompany: string | null;
  jobDescriptionText: string | null;
  candidateSkills: string[];
  resumeAnalysis: ResumeAnalysis | null;
  latestSession: {
    role: string;
    company: string | null;
    overall_score: number | null;
    technical_score: number | null;
    problem_solving_score: number | null;
    strengths: string[] | null;
    weaknesses: string[] | null;
    matched_skills: string[] | null;
    missing_skills: string[] | null;
  } | null;
  jdSkills: { required: string[]; preferred: string[] } | null;
  codingInterview: {
    overall_score: number | null;
    correctness_score: number | null;
    optimization_score: number | null;
  } | null;
  hrInterview: {
    overall_score: number | null;
    communication_score: number | null;
    hr_readiness_score: number | null;
  } | null;
  eligibility: {
    missing_skills: string[];
    missing_soft_skills: string[] | null;
    dsa_level: number | null;
    system_design_readiness: number | null;
  } | null;
  scores: { role: number; company: number; hiring: number };
}): string {
  const parts: string[] = [];

  const companyProfile = params.targetCompany ? getCompanyProfile(params.targetCompany) : null;
  if (companyProfile) {
    parts.push(
      `TARGET COMPANY: ${companyProfile.name} — ${companyProfile.interviewStyle} Focus areas: ${companyProfile.preferredTopics.join(", ")}.`,
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

  if (params.candidateSkills.length || params.resumeAnalysis) {
    const resumeParts: string[] = [];
    if (params.candidateSkills.length)
      resumeParts.push(`Skills: ${params.candidateSkills.slice(0, 40).join(", ")}`);
    const a = params.resumeAnalysis;
    if (a?.experience?.length) {
      resumeParts.push(
        `Experience: ${a.experience
          .slice(0, 5)
          .map((e) => `${e.title} at ${e.company}${e.summary ? ` — ${e.summary}` : ""}`)
          .join("; ")}`,
      );
    }
    if (a?.projects?.length) {
      resumeParts.push(
        `Projects: ${a.projects
          .slice(0, 5)
          .map((p) => p.name)
          .join(", ")}`,
      );
    }
    if (resumeParts.length) parts.push(`CANDIDATE RESUME:\n${resumeParts.join("\n")}`);
  } else {
    parts.push("CANDIDATE RESUME: none uploaded yet — plan should include uploading one.");
  }

  if (params.latestSession) {
    const s = params.latestSession;
    parts.push(
      `MOST RECENT MOCK INTERVIEW (${s.role}${s.company ? ` at ${s.company}` : ""}): overall score ${s.overall_score ?? "n/a"}/100, technical ${s.technical_score ?? "n/a"}/100, problem solving ${s.problem_solving_score ?? "n/a"}/100.\nStrengths shown: ${(s.strengths ?? []).join(", ") || "none recorded"}.\nWeaknesses shown: ${(s.weaknesses ?? []).join(", ") || "none recorded"}.\nSkills the interview flagged as missing: ${(s.missing_skills ?? []).join(", ") || "none recorded"}.`,
    );
  } else {
    parts.push("MOST RECENT MOCK INTERVIEW: none completed yet — plan should include taking one.");
  }

  if (params.codingInterview) {
    const ci = params.codingInterview;
    parts.push(
      `MOST RECENT CODING INTERVIEW: overall ${ci.overall_score ?? "n/a"}/100, correctness ${ci.correctness_score ?? "n/a"}/100, optimization ${ci.optimization_score ?? "n/a"}/100.`,
    );
  } else {
    parts.push("MOST RECENT CODING INTERVIEW: none completed yet — plan should include one.");
  }

  if (params.hrInterview) {
    const hi = params.hrInterview;
    parts.push(
      `MOST RECENT HR/BEHAVIORAL INTERVIEW: overall ${hi.overall_score ?? "n/a"}/100, communication ${hi.communication_score ?? "n/a"}/100, HR readiness ${hi.hr_readiness_score ?? "n/a"}/100.`,
    );
  } else {
    parts.push(
      "MOST RECENT HR/BEHAVIORAL INTERVIEW: none completed yet — plan should include one.",
    );
  }

  if (params.eligibility) {
    const el = params.eligibility;
    parts.push(
      `LATEST SKILL GAP CHECK: missing technical skills: ${el.missing_skills.join(", ") || "none flagged"}. Missing soft skills: ${(el.missing_soft_skills ?? []).join(", ") || "none flagged"}. DSA level ${el.dsa_level ?? "n/a"}/100, system design readiness ${el.system_design_readiness ?? "n/a"}/100.`,
    );
  } else {
    parts.push("LATEST SKILL GAP CHECK: none run yet.");
  }

  parts.push(
    `COMPUTED READINESS (for context only, do not re-derive different numbers): role readiness ${params.scores.role}/100, company readiness ${params.scores.company}/100, hiring readiness ${params.scores.hiring}/100.`,
  );

  return parts.join("\n\n");
}

function fallbackPhase(): PhaseTemplate {
  const day = (n: number, title: string, description: string, category: string) => ({
    dayOfWeek: n,
    title,
    description,
    category,
  });
  return {
    phase: "General Preparation",
    weeklyGoalTitle: "Steady, balanced preparation",
    weeklyGoalDescription: "Split time across coding practice, project work, and interview prep.",
    dailyTasks: [
      day(1, "Coding practice", "Solve 2 practice problems in your target stack.", "coding"),
      day(2, "Project work", "Spend an hour on a portfolio project.", "project"),
      day(3, "Coding practice", "Solve 2 more practice problems, review solutions.", "coding"),
      day(4, "Interview prep", "Review a system design or role-specific topic.", "system-design"),
      day(5, "HR / behavioral prep", "Draft one STAR-format story.", "behavioral"),
      day(6, "Project work", "Continue portfolio project.", "project"),
      day(7, "Rest / light review", "Light review of the week — no new material.", "rest"),
    ],
  };
}

export const generateCareerRoadmapFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      targetRole: z.string().trim().min(2).max(100),
      targetCompany: z.string().trim().max(100).optional(),
      jobDescriptionText: z.string().trim().max(6000).optional(),
      durationMonths: z.number().int().min(1).max(24),
    }),
  )
  .handler(async ({ data }): Promise<{ error: string | null; roadmapId?: string }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };
    if (!(await checkRateLimit(`ai:career-roadmap:${auth.user.id}`, 10, 600))) {
      return { error: RATE_LIMIT_MESSAGE };
    }

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

    const { data: latestSession } = await supabase
      .from("voice_interview_sessions")
      .select(
        "id, role, company, overall_score, technical_score, problem_solving_score, strengths, weaknesses, matched_skills, missing_skills",
      )
      .eq("profile_id", auth.user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: codingInterview } = await supabase
      .from("coding_interview_sessions")
      .select("id, overall_score, correctness_score, optimization_score")
      .eq("profile_id", auth.user.id)
      .eq("status", "evaluated")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: hrInterview } = await supabase
      .from("voice_interview_sessions")
      .select("id, overall_score, communication_score, hr_readiness_score")
      .eq("profile_id", auth.user.id)
      .eq("status", "completed")
      .in("interview_type", ["hr", "behavioral", "manager"])
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: eligibility } = await supabase
      .from("eligibility_reports")
      .select("id, missing_skills, missing_soft_skills, dsa_level, system_design_readiness")
      .eq("profile_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

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

    const atsScore = resume?.ats_score ?? null;
    const interviewOverall = latestSession?.overall_score ?? null;

    const roleReadinessScore = clampScore(meanOf([atsScore, skillMatchPercent]));
    const companyProfile = data.targetCompany ? getCompanyProfile(data.targetCompany) : null;
    const companyAdjustment = companyProfile ? READINESS_ADJUSTMENT[companyProfile.difficulty] : 0;
    const companyReadinessScore = clampScore(roleReadinessScore + companyAdjustment);
    const hiringReadinessScore = clampScore(
      meanOf([atsScore, skillMatchPercent, interviewOverall]),
    );

    const totalWeeks = Math.ceil((data.durationMonths * 4.345) / 1);

    const contextBlock = buildContextBlock({
      targetRole: data.targetRole,
      targetCompany: data.targetCompany ?? null,
      jobDescriptionText: data.jobDescriptionText ?? null,
      candidateSkills,
      resumeAnalysis,
      latestSession: latestSession ?? null,
      jdSkills,
      codingInterview: codingInterview ?? null,
      hrInterview: hrInterview ?? null,
      eligibility: eligibility ?? null,
      scores: {
        role: roleReadinessScore,
        company: companyReadinessScore,
        hiring: hiringReadinessScore,
      },
    });

    let text: string | undefined;
    try {
      const response = await withGeminiRetry(() =>
        geminiResult.client.models.generateContent({
          model: GEMINI_MODEL,
          contents: ROADMAP_PROMPT({
            targetRole: data.targetRole,
            targetCompany: companyProfile?.name ?? data.targetCompany ?? null,
            durationMonths: data.durationMonths,
            totalWeeks,
            contextBlock,
          }),
          config: { responseMimeType: "application/json" },
        }),
      );
      text = response.text;
    } catch (err) {
      return { error: friendlyGeminiError(err, "career_roadmap.generate") };
    }
    if (!text) return { error: "AI roadmap generation returned no result. Try again." };

    let generated: GeneratedRoadmap;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      generated = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { error: "Could not parse the generated roadmap. Try again." };
    }

    const monthlyMilestones = generated.monthlyMilestones?.length
      ? generated.monthlyMilestones
      : Array.from({ length: data.durationMonths }, (_, i) => ({
          month: i + 1,
          title: `Month ${i + 1}`,
          description: "Keep progressing through your weekly goals and daily tasks.",
        }));
    const phases = generated.weeklyPhaseTemplates?.length
      ? generated.weeklyPhaseTemplates
      : [fallbackPhase()];

    // Archive any prior active roadmap — only one active plan per candidate at a time.
    await supabase
      .from("career_roadmaps")
      .update({ status: "archived" })
      .eq("profile_id", auth.user.id)
      .eq("status", "active");

    const { data: inserted, error: insertError } = await supabase
      .from("career_roadmaps")
      .insert({
        profile_id: auth.user.id,
        target_company: companyProfile?.name ?? data.targetCompany ?? null,
        target_role: data.targetRole,
        job_description_text: data.jobDescriptionText ?? null,
        duration_months: data.durationMonths,
        resume_id: resume?.id ?? null,
        voice_interview_session_id: latestSession?.id ?? null,
        company_readiness_score: companyReadinessScore,
        role_readiness_score: roleReadinessScore,
        hiring_readiness_score: hiringReadinessScore,
        skill_gap: generated.skillGap ?? { matched: [], missing: [], priority: [] },
        recommended_projects: generated.recommendedProjects ?? [],
        coding_practice_plan: generated.codingPracticePlan ?? [],
        hr_prep_plan: generated.hrPrepPlan ?? [],
        interview_prep_plan: generated.interviewPrepPlan ?? [],
        certifications_plan: generated.certificationsPlan ?? [],
        revision_plan: generated.revisionPlan ?? [],
        mock_interview_schedule: generated.mockInterviewSchedule ?? [],
        predicted_readiness_weeks:
          Number.isFinite(generated.predictedReadinessWeeks) &&
          generated.predictedReadinessWeeks > 0
            ? Math.min(totalWeeks, Math.round(generated.predictedReadinessWeeks))
            : null,
        coding_interview_session_id: codingInterview?.id ?? null,
        hr_interview_session_id: hrInterview?.id ?? null,
        eligibility_report_id: eligibility?.id ?? null,
        summary: generated.summary ?? null,
        status: "active",
      })
      .select("id, start_date")
      .single();
    if (insertError || !inserted)
      return { error: insertError?.message ?? "Could not save the roadmap." };

    const startDate = new Date(inserted.start_date);
    type TaskInsert = Database["public"]["Tables"]["career_roadmap_tasks"]["Insert"];
    const taskRows: TaskInsert[] = [];

    for (let month = 1; month <= data.durationMonths; month++) {
      const milestone =
        monthlyMilestones.find((m) => m.month === month) ?? monthlyMilestones[month - 1];
      taskRows.push({
        roadmap_id: inserted.id,
        granularity: "monthly",
        period_index: month,
        task_date: null,
        title: milestone?.title ?? `Month ${month}`,
        description: milestone?.description ?? null,
        category: null,
      });
    }

    for (let week = 1; week <= totalWeeks; week++) {
      const phaseIdx = Math.min(
        phases.length - 1,
        Math.floor(((week - 1) / totalWeeks) * phases.length),
      );
      const phase = phases[phaseIdx];
      taskRows.push({
        roadmap_id: inserted.id,
        granularity: "weekly",
        period_index: week,
        task_date: null,
        title: `Week ${week}: ${phase.weeklyGoalTitle}`,
        description: phase.weeklyGoalDescription ?? null,
        category: phase.phase ?? null,
      });

      for (let d = 0; d < 7; d++) {
        const dayOffset = (week - 1) * 7 + d;
        const template =
          phase.dailyTasks?.find((t) => t.dayOfWeek === d + 1) ?? phase.dailyTasks?.[d] ?? null;
        if (!template) continue;
        taskRows.push({
          roadmap_id: inserted.id,
          granularity: "daily",
          period_index: dayOffset,
          task_date: addDays(startDate, dayOffset),
          title: template.title,
          description: template.description ?? null,
          category: template.category ?? null,
        });
      }
    }

    for (let i = 0; i < taskRows.length; i += 500) {
      const chunk = taskRows.slice(i, i + 500);
      const { error: taskError } = await supabase.from("career_roadmap_tasks").insert(chunk);
      if (taskError) {
        console.error("[career-roadmap] task insert failed:", taskError.message);
        return { error: "Could not save the roadmap's tasks." };
      }
    }

    return { error: null, roadmapId: inserted.id };
  });

export const archiveCareerRoadmapFn = createServerFn({ method: "POST" })
  .validator(z.object({ roadmapId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { error } = await supabase
      .from("career_roadmaps")
      .update({ status: "archived" })
      .eq("id", data.roadmapId)
      .eq("profile_id", auth.user.id);
    if (error) {
      console.error("[career-roadmap] archive failed:", error.message);
      return { error: "Could not archive this roadmap." };
    }
    return { error: null };
  });
