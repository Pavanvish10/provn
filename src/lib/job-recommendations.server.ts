import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";
import { scoreCandidate, type Candidate } from "@/lib/matching";
import { getCompanyProfile } from "@/ai/resume/CompanyProfile";
import type { ResumeAnalysis } from "@/lib/resume.server";

// Sprint 20: recommendations are always built on top of the REAL jobs
// board (`jobs`/`companies` — real business accounts, real postings)
// and the REAL skill-match formula already used by matching-scores.server.ts
// (the /apply flow's post-application scoring) — never a fabricated
// listing. Gemini only adds a qualitative overlay (eligibility/difficulty/
// hiring probability/why) on top of real title/company/location/salary/
// tags; it never invents job facts. "Internship"/"remote"/"startup"
// categories are derived deterministically from those same real rows
// (employment_type/work_mode/company_size), not left to the AI to guess.

export type RecommendationCategory = "job" | "internship" | "remote" | "startup" | "company";

export type JobRecommendationEntry = {
  jobId: string;
  title: string;
  companyId: string | null;
  companyName: string;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  tags: string[];
  matchPercent: number;
  eligibilityScore: number;
  missingSkills: string[];
  difficulty: string;
  hiringProbability: number;
  whyRecommended: string;
  categories: RecommendationCategory[];
};

export type JobRecommendationNextSteps = {
  skillsToLearn: string[];
  certifications: string[];
  projects: string[];
  codingTopics: string[];
  hrTopics: string[];
};

const STARTUP_SIZES = new Set(["1-10", "11-50"]);

function getGemini(): { client: GoogleGenAI } | { error: string } {
  // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable AI job recommendations.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return { error: "AI job recommendations are not configured yet (missing GEMINI_API_KEY)." };
  return { client: new GoogleGenAI({ apiKey }) };
}

type ShortlistedJob = {
  id: string;
  title: string;
  companyId: string | null;
  companyName: string;
  companySize: string | null;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  tags: string[];
  requirements: string | null;
  matchPercent: number;
};

const RECOMMEND_PROMPT = (params: {
  contextBlock: string;
  jobs: ShortlistedJob[];
}) => `You are an AI career advisor matching a candidate against a shortlist of REAL open job postings on a job platform. Every job below is real — its title, company, location, salary, and tags are all genuine platform data. Do not alter or invent any job facts; only add your qualitative assessment.

${params.contextBlock}

SHORTLISTED REAL JOBS (each already has a deterministic skill-match % computed):
${params.jobs
  .map((j) => {
    const knownProfile = getCompanyProfile(j.companyName);
    const cultureNote = knownProfile
      ? ` | known interview culture: ${knownProfile.interviewStyle} (typically ${knownProfile.difficulty} bar)`
      : "";
    return `- id="${j.id}" | "${j.title}" at ${j.companyName} (size: ${j.companySize ?? "unknown"}) | location: ${j.location ?? "unspecified"} | work mode: ${j.workMode ?? "unspecified"} | type: ${j.employmentType ?? "unspecified"} | experience: ${j.experienceLevel ?? "unspecified"} | salary: ${j.salaryMin != null || j.salaryMax != null ? `${j.salaryMin ?? "?"}-${j.salaryMax ?? "?"} ${j.currency}` : "not disclosed"} | required tags: ${j.tags.join(", ") || "none listed"} | deterministic match: ${j.matchPercent}%${cultureNote}`;
  })
  .join("\n")}

Respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "recommendations": [
    {
      "jobId": string (must exactly match one of the "id" values above — do not invent ids),
      "eligibilityScore": number (0-100, holistic readiness for this specific role, using the candidate context above — may differ from the deterministic match %),
      "missingSkills": string[] (0-5 skills this job's tags call for that the candidate doesn't clearly have),
      "difficulty": string (one of exactly: "Easy", "Medium", "Hard" — this company/role's likely interview bar),
      "hiringProbability": number (0-100, your honest estimate of this candidate's chance if they applied today — do not default to high numbers),
      "whyRecommended": string (2-3 sentences, specific to this candidate and this real job — reference actual matched skills or actual gaps)
    }
  ] (rank best-fit first; include every job id given above, even weak matches — just give them honest low scores),
  "nextSteps": {
    "skillsToLearn": string[] (3-6 skills to learn next, prioritized across all shortlisted jobs),
    "certifications": string[] (0-4 real, recognized certifications worth pursuing),
    "projects": string[] (2-4 concrete project ideas that would close the biggest gaps),
    "codingTopics": string[] (3-5 coding/DSA or role-specific technical topics to drill),
    "hrTopics": string[] (2-4 HR/behavioral interview topics to prepare)
  }
}

Be honest and specific — grounded strictly in the real context and job data above, never inflate scores.`;

function buildCandidateContextBlock(params: {
  candidateSkills: string[];
  resumeAnalysis: ResumeAnalysis | null;
  atsScore: number | null;
  eligibility: { missing_skills: string[]; ats_score: number } | null;
  roadmapProgressPercent: number | null;
  technicalInterview: { overall_score: number | null } | null;
  hrInterview: { overall_score: number | null; hr_readiness_score: number | null } | null;
  codingInterview: { overall_score: number | null } | null;
  targetRole: string | null;
  preferredLocation: string | null;
  experienceLevel: string | null;
}): string {
  const parts: string[] = [];
  parts.push(`TARGET ROLE: ${params.targetRole ?? "not specified"}`);
  if (params.preferredLocation) parts.push(`PREFERRED LOCATION: ${params.preferredLocation}`);
  if (params.experienceLevel) parts.push(`EXPERIENCE LEVEL: ${params.experienceLevel}`);
  parts.push(`CANDIDATE SKILLS: ${params.candidateSkills.join(", ") || "none listed"}`);
  if (params.atsScore != null) parts.push(`RESUME ATS SCORE: ${params.atsScore}/100`);
  const a = params.resumeAnalysis;
  if (a?.experience?.length) {
    parts.push(
      `EXPERIENCE: ${a.experience.map((e) => `${e.title} at ${e.company} (${e.duration})`).join("; ")}`,
    );
  }
  if (a?.projects?.length) {
    parts.push(`PROJECTS: ${a.projects.map((p) => p.name).join(", ")}`);
  }
  if (params.eligibility) {
    parts.push(
      `LATEST COMPANY ELIGIBILITY CHECK: ATS ${params.eligibility.ats_score}/100, missing skills flagged: ${params.eligibility.missing_skills.join(", ") || "none"}.`,
    );
  }
  if (params.roadmapProgressPercent != null) {
    parts.push(`CAREER ROADMAP PROGRESS: ${params.roadmapProgressPercent}% complete.`);
  }
  if (params.technicalInterview?.overall_score != null) {
    parts.push(
      `MOST RECENT TECHNICAL/VOICE INTERVIEW SCORE: ${params.technicalInterview.overall_score}/100.`,
    );
  }
  if (params.hrInterview) {
    parts.push(
      `MOST RECENT HR/BEHAVIORAL INTERVIEW: overall ${params.hrInterview.overall_score ?? "n/a"}/100, HR readiness ${params.hrInterview.hr_readiness_score ?? "n/a"}/100.`,
    );
  }
  if (params.codingInterview?.overall_score != null) {
    parts.push(`MOST RECENT CODING INTERVIEW SCORE: ${params.codingInterview.overall_score}/100.`);
  }
  return parts.join("\n");
}

export const generateJobRecommendationsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      preferredLocation: z.string().trim().max(100).optional(),
      minSalary: z.number().int().min(0).optional(),
      experienceLevel: z.string().trim().max(40).optional(),
      remoteOnly: z.boolean().optional(),
      internshipOnly: z.boolean().optional(),
      fullTimeOnly: z.boolean().optional(),
      targetRole: z.string().trim().max(100).optional(),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      error: string | null;
      recommendationId?: string;
      recommendations?: JobRecommendationEntry[];
      nextSteps?: JobRecommendationNextSteps;
    }> => {
      const supabase = getSupabaseServerClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { error: "Not signed in." };

      const geminiResult = getGemini();
      if ("error" in geminiResult) return { error: geminiResult.error };

      const [
        { data: resume },
        { data: verifiedSkills },
        { data: eligibility },
        { data: activeRoadmap },
        { data: technicalInterview },
        { data: hrInterview },
        { data: codingInterview },
      ] = await Promise.all([
        supabase
          .from("resumes")
          .select("analysis, ats_score")
          .eq("profile_id", auth.user.id)
          .eq("is_current", true)
          .maybeSingle(),
        supabase
          .from("skills")
          .select("skill_name")
          .eq("profile_id", auth.user.id)
          .eq("verified", true),
        supabase
          .from("eligibility_reports")
          .select("missing_skills, ats_score")
          .eq("profile_id", auth.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("career_roadmaps")
          .select("id")
          .eq("profile_id", auth.user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("voice_interview_sessions")
          .select("overall_score")
          .eq("profile_id", auth.user.id)
          .eq("status", "completed")
          .in("interview_type", ["technical", "startup", "faang"])
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("voice_interview_sessions")
          .select("overall_score, hr_readiness_score")
          .eq("profile_id", auth.user.id)
          .eq("status", "completed")
          .in("interview_type", ["hr", "behavioral", "manager"])
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("coding_interview_sessions")
          .select("overall_score")
          .eq("profile_id", auth.user.id)
          .eq("status", "evaluated")
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

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
        if (total && total > 0)
          roadmapProgressPercent = Math.round(((completed ?? 0) / total) * 100);
      }

      const resumeAnalysis = (resume?.analysis as unknown as ResumeAnalysis | null) ?? null;
      const candidateSkills = Array.from(
        new Set([
          ...(verifiedSkills ?? []).map((s) => s.skill_name).filter((s): s is string => !!s),
          ...(resumeAnalysis?.skills ?? []),
          ...(resumeAnalysis?.technologies ?? []),
          ...(resumeAnalysis?.frameworks ?? []),
        ]),
      );
      const atsScore = resume?.ats_score ?? null;

      // Fetch real open jobs, applying hard filters at the SQL level.
      let jobsQuery = supabase
        .from("jobs")
        .select("*, companies(id, company_name, company_size)")
        .eq("status", "open")
        .order("posted_at", { ascending: false })
        .limit(150);
      if (data.preferredLocation)
        jobsQuery = jobsQuery.ilike("location", `%${data.preferredLocation}%`);
      if (data.minSalary) jobsQuery = jobsQuery.gte("salary_max", data.minSalary);
      if (data.experienceLevel) jobsQuery = jobsQuery.eq("experience_level", data.experienceLevel);
      if (data.internshipOnly) jobsQuery = jobsQuery.eq("employment_type", "Internship");
      if (data.fullTimeOnly) jobsQuery = jobsQuery.eq("employment_type", "Full-time");
      if (data.remoteOnly)
        jobsQuery = jobsQuery.or("work_mode.eq.remote,employment_type.eq.Remote");

      const { data: jobs, error: jobsError } = await jobsQuery;
      if (jobsError) return { error: jobsError.message };

      const candidate: Candidate = {
        id: auth.user.id,
        name: "",
        avatar: "",
        headline: "",
        location: "",
        years: 0,
        verifiedSkills: candidateSkills,
        streak: 0,
      };

      const scored: ShortlistedJob[] = (jobs ?? []).map((j) => {
        const company = j.companies as unknown as {
          id: string;
          company_name: string | null;
          company_size: string | null;
        } | null;
        const tags = j.tags ?? [];
        const skillsScore =
          tags.length > 0 ? Math.round(scoreCandidate(candidate, tags).score * 100) : 0;
        const matchPercent =
          atsScore != null && tags.length > 0
            ? Math.round(skillsScore * 0.6 + atsScore * 0.4)
            : skillsScore || atsScore || 0;
        return {
          id: j.id,
          title: j.title ?? "Untitled role",
          companyId: company?.id ?? null,
          companyName: company?.company_name ?? "Unknown company",
          companySize: company?.company_size ?? null,
          location: j.location,
          workMode: j.work_mode,
          employmentType: j.employment_type,
          experienceLevel: j.experience_level,
          salaryMin: j.salary_min,
          salaryMax: j.salary_max,
          currency: j.currency,
          tags,
          requirements: j.requirements,
          matchPercent,
        };
      });

      scored.sort((a, b) => b.matchPercent - a.matchPercent);
      const shortlist = scored.slice(0, 20);

      const contextBlock = buildCandidateContextBlock({
        candidateSkills,
        resumeAnalysis,
        atsScore,
        eligibility: eligibility ?? null,
        roadmapProgressPercent,
        technicalInterview: technicalInterview ?? null,
        hrInterview: hrInterview ?? null,
        codingInterview: codingInterview ?? null,
        targetRole: data.targetRole ?? null,
        preferredLocation: data.preferredLocation ?? null,
        experienceLevel: data.experienceLevel ?? null,
      });

      let recommendations: JobRecommendationEntry[] = [];
      let nextSteps: JobRecommendationNextSteps = {
        skillsToLearn: [],
        certifications: [],
        projects: [],
        codingTopics: [],
        hrTopics: [],
      };

      if (shortlist.length > 0) {
        let text: string | undefined;
        try {
          const response = await withGeminiRetry(() =>
            geminiResult.client.models.generateContent({
              model: GEMINI_MODEL,
              contents: RECOMMEND_PROMPT({ contextBlock, jobs: shortlist }),
              config: { responseMimeType: "application/json" },
            }),
          );
          text = response.text;
        } catch (err) {
          return { error: friendlyGeminiError(err, "job_recommendations.generate") };
        }
        if (!text) return { error: "AI recommendation generation returned no result. Try again." };

        let generated: {
          recommendations: {
            jobId: string;
            eligibilityScore: number;
            missingSkills: string[];
            difficulty: string;
            hiringProbability: number;
            whyRecommended: string;
          }[];
          nextSteps: JobRecommendationNextSteps;
        };
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          generated = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        } catch {
          return { error: "Could not parse the recommendation result. Try again." };
        }

        const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n ?? 0)));
        const byId = new Map(shortlist.map((j) => [j.id, j]));
        recommendations = (generated.recommendations ?? [])
          .map((r) => {
            const job = byId.get(r.jobId);
            if (!job) return null;
            // Categories are objective facts derived straight from the real
            // job row — never left to the AI to classify.
            const categories: RecommendationCategory[] = ["job"];
            if (job.employmentType === "Internship") categories.push("internship");
            if (job.workMode === "remote" || job.employmentType === "Remote")
              categories.push("remote");
            if (job.companySize && STARTUP_SIZES.has(job.companySize)) categories.push("startup");
            const entry: JobRecommendationEntry = {
              jobId: job.id,
              title: job.title,
              companyId: job.companyId,
              companyName: job.companyName,
              location: job.location,
              workMode: job.workMode,
              employmentType: job.employmentType,
              experienceLevel: job.experienceLevel,
              salaryMin: job.salaryMin,
              salaryMax: job.salaryMax,
              currency: job.currency,
              tags: job.tags,
              matchPercent: job.matchPercent,
              eligibilityScore: clamp(r.eligibilityScore),
              missingSkills: r.missingSkills ?? [],
              difficulty: ["Easy", "Medium", "Hard"].includes(r.difficulty)
                ? r.difficulty
                : "Medium",
              hiringProbability: clamp(r.hiringProbability),
              whyRecommended: r.whyRecommended ?? "",
              categories,
            };
            return entry;
          })
          .filter((r): r is JobRecommendationEntry => !!r)
          .sort((a, b) => b.eligibilityScore - a.eligibilityScore);

        // Tag the single best match per company as a "company" recommendation too.
        const bestPerCompany = new Map<string, JobRecommendationEntry>();
        for (const r of recommendations) {
          const key = r.companyId ?? r.companyName;
          const existing = bestPerCompany.get(key);
          if (!existing || r.eligibilityScore > existing.eligibilityScore)
            bestPerCompany.set(key, r);
        }
        for (const r of bestPerCompany.values()) {
          if (!r.categories.includes("company")) r.categories.push("company");
        }

        nextSteps = generated.nextSteps ?? nextSteps;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("job_recommendations")
        .insert({
          profile_id: auth.user.id,
          preferred_location: data.preferredLocation ?? null,
          min_salary: data.minSalary ?? null,
          experience_level: data.experienceLevel ?? null,
          remote_only: data.remoteOnly ?? false,
          internship_only: data.internshipOnly ?? false,
          full_time_only: data.fullTimeOnly ?? false,
          target_role: data.targetRole ?? null,
          recommendations,
          next_steps: nextSteps,
        })
        .select("id")
        .single();
      if (insertError || !inserted)
        return { error: insertError?.message ?? "Could not save the recommendations." };

      return { error: null, recommendationId: inserted.id, recommendations, nextSteps };
    },
  );
