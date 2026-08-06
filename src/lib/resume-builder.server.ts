import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";
import type { ResumeAnalysis } from "@/lib/resume.server";
import { getCompanyProfile } from "@/ai/resume/CompanyProfile";

// Sprint 19: an authored, structured, multi-version resume builder —
// distinct from `resumes` (Sprint 13's single uploaded-file-per-user,
// read-only-analysis model). resume_versions is the mutable document a
// candidate edits directly; resume_optimizations is an append-only log
// of every AI optimization run against it (same history pattern as
// Sprint 16's eligibility_reports), so a run's scores/suggestions never
// get silently overwritten by the next run.

export type ResumeBuilderContact = {
  name: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
};
export type ResumeBuilderExperience = {
  title: string;
  company: string;
  duration: string;
  bullets: string[];
};
export type ResumeBuilderProject = {
  name: string;
  description: string;
  bullets: string[];
  technologies: string[];
};
export type ResumeBuilderEducation = { institution: string; degree: string; years: string };

export type ResumeBuilderContent = {
  contact: ResumeBuilderContact;
  summary: string;
  skills: string[];
  technologies: string[];
  frameworks: string[];
  soft_skills: string[];
  experience: ResumeBuilderExperience[];
  projects: ResumeBuilderProject[];
  education: ResumeBuilderEducation[];
  certifications: string[];
  languages: string[];
};

export type ResumeType =
  "fresher" | "experienced" | "internship" | "ats_friendly" | "company_specific";

type SectionFeedback = {
  summary: string;
  skills: string;
  experience: string;
  projects: string;
  education: string;
};

type GeneratedOptimization = {
  atsOptimizationScore: number;
  resumeQualityScore: number;
  keywordMatchScore: number;
  sectionFeedback: SectionFeedback;
  rewrittenSummary: string;
  rewrittenExperience: { index: number; bullets: string[] }[];
  rewrittenProjects: { index: number; description: string; bullets: string[] }[];
  missingSkills: string[];
  recommendedCertifications: string[];
  keywordSuggestions: string[];
  formattingSuggestions: string[];
};

function blankContent(): ResumeBuilderContent {
  return {
    contact: { name: "", email: "", phone: "", location: "", links: [] },
    summary: "",
    skills: [],
    technologies: [],
    frameworks: [],
    soft_skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    languages: [],
  };
}

function seedContentFromAnalysis(
  analysis: ResumeAnalysis | null,
  contact: ResumeBuilderContact,
): ResumeBuilderContent {
  const base = blankContent();
  base.contact = contact;
  if (!analysis) return base;
  return {
    ...base,
    skills: analysis.skills ?? [],
    technologies: analysis.technologies ?? [],
    frameworks: analysis.frameworks ?? [],
    soft_skills: analysis.soft_skills ?? [],
    certifications: analysis.certifications ?? [],
    languages: analysis.languages ?? [],
    experience: (analysis.experience ?? []).map((e) => ({
      title: e.title,
      company: e.company,
      duration: e.duration,
      bullets: e.summary ? [e.summary] : [],
    })),
    projects: (analysis.projects ?? []).map((p) => ({
      name: p.name,
      description: p.description,
      bullets: p.description ? [p.description] : [],
      technologies: [],
    })),
    education: (analysis.education ?? []).map((ed) => ({
      institution: ed.institution,
      degree: ed.degree,
      years: ed.years,
    })),
  };
}

function getGemini(): { client: GoogleGenAI } | { error: string } {
  // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable the AI resume builder/optimizer.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return { error: "AI resume optimization is not configured yet (missing GEMINI_API_KEY)." };
  return { client: new GoogleGenAI({ apiKey }) };
}

export const createResumeVersionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().trim().min(1).max(120),
      resumeType: z.enum([
        "fresher",
        "experienced",
        "internship",
        "ats_friendly",
        "company_specific",
      ]),
      targetCompany: z.string().trim().max(100).optional(),
      targetRole: z.string().trim().max(100).optional(),
      jobDescriptionText: z.string().trim().max(6000).optional(),
      seedFromResume: z.boolean(),
    }),
  )
  .handler(async ({ data }): Promise<{ error: string | null; versionId?: string }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, location, mobile, linkedin_url, github_url, portfolio_url")
      .eq("id", auth.user.id)
      .maybeSingle();
    const contact: ResumeBuilderContact = {
      name: profile?.full_name ?? "",
      email: profile?.email ?? "",
      phone: profile?.mobile ?? "",
      location: profile?.location ?? "",
      links: [profile?.linkedin_url, profile?.github_url, profile?.portfolio_url].filter(
        (v): v is string => !!v,
      ),
    };

    let content = blankContent();
    content.contact = contact;
    let sourceResumeId: string | null = null;

    if (data.seedFromResume) {
      const { data: resume } = await supabase
        .from("resumes")
        .select("id, analysis")
        .eq("profile_id", auth.user.id)
        .eq("is_current", true)
        .maybeSingle();
      if (resume) {
        sourceResumeId = resume.id;
        content = seedContentFromAnalysis(
          (resume.analysis as unknown as ResumeAnalysis | null) ?? null,
          contact,
        );
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("resume_versions")
      .insert({
        profile_id: auth.user.id,
        title: data.title,
        resume_type: data.resumeType,
        target_company: data.targetCompany ?? null,
        target_role: data.targetRole ?? null,
        job_description_text: data.jobDescriptionText ?? null,
        source_resume_id: sourceResumeId,
        content,
        status: "draft",
      })
      .select("id")
      .single();
    if (insertError || !inserted)
      return { error: insertError?.message ?? "Could not create the resume." };

    return { error: null, versionId: inserted.id };
  });

export const deleteResumeVersionFn = createServerFn({ method: "POST" })
  .validator(z.object({ versionId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { error } = await supabase
      .from("resume_versions")
      .delete()
      .eq("id", data.versionId)
      .eq("profile_id", auth.user.id);
    if (error) return { error: error.message };
    return { error: null };
  });

const OPTIMIZE_PROMPT = (params: {
  resumeType: ResumeType;
  targetRole: string | null;
  targetCompany: string | null;
  contextBlock: string;
}) => `You are an expert resume writer and ATS optimization specialist reviewing a ${params.resumeType.replace("_", " ")} resume${params.targetRole ? ` for the role of "${params.targetRole}"` : ""}${params.targetCompany ? ` at ${params.targetCompany}` : ""}.

${params.contextBlock}

Respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "atsOptimizationScore": number (0-100, how well this resume would parse and rank in an ATS today),
  "resumeQualityScore": number (0-100, overall writing quality — impact, clarity, structure),
  "keywordMatchScore": number (0-100, how well the resume's keywords match the target role/JD — 50 if no JD/role given),
  "sectionFeedback": {
    "summary": string (1-2 sentences of specific feedback on the summary section),
    "skills": string (1-2 sentences of specific feedback on the skills section),
    "experience": string (1-2 sentences of specific feedback on the experience section),
    "projects": string (1-2 sentences of specific feedback on the projects section),
    "education": string (1-2 sentences of specific feedback on the education section)
  },
  "rewrittenSummary": string (a polished, 2-4 sentence professional summary, rewritten to be stronger — never invent employers/titles that aren't in the original content),
  "rewrittenExperience": [
    { "index": number (matches the EXPERIENCE index below), "bullets": string[] (2-4 rewritten bullet points — action verbs, quantified impact where plausible from the original content, ATS-friendly keywords — never invent facts not implied by the original) }
  ],
  "rewrittenProjects": [
    { "index": number (matches the PROJECTS index below), "description": string (1 sentence project summary), "bullets": string[] (1-3 rewritten bullet points) }
  ],
  "missingSkills": string[] (3-6 skills this role/company/JD calls for that the resume doesn't show — empty array if none),
  "recommendedCertifications": string[] (0-3 real, recognized certifications worth adding — empty if none would help),
  "keywordSuggestions": string[] (3-6 specific ATS keywords/phrases to work into the resume),
  "formattingSuggestions": string[] (2-4 concrete formatting/structure improvements)
}

Rewrite content to be stronger and more quantified, but never fabricate employers, titles, dates, metrics, or experience that isn't grounded in the original content below.`;

function buildOptimizeContextBlock(params: {
  content: ResumeBuilderContent;
  jobDescriptionText: string | null;
  companyProfile: ReturnType<typeof getCompanyProfile>;
  eligibility: {
    missing_skills: string[];
    missing_certifications: string[];
    ats_score: number;
  } | null;
  roadmapProgressPercent: number | null;
  latestInterview: {
    interview_type: string;
    overall_score: number | null;
    strengths: string[] | null;
    weaknesses: string[] | null;
  } | null;
}): string {
  const parts: string[] = [];

  if (params.companyProfile) {
    parts.push(
      `TARGET COMPANY: ${params.companyProfile.name} — ${params.companyProfile.interviewStyle} Focus areas: ${params.companyProfile.preferredTopics.join(", ")}.`,
    );
  }
  if (params.jobDescriptionText?.trim()) {
    parts.push(`JOB DESCRIPTION:\n${params.jobDescriptionText.trim().slice(0, 4000)}`);
  }

  const c = params.content;
  parts.push(`SUMMARY: ${c.summary || "(empty)"}`);
  parts.push(
    `SKILLS: ${[...c.skills, ...c.technologies, ...c.frameworks].join(", ") || "(none listed)"}`,
  );
  parts.push(
    `EXPERIENCE:\n${
      c.experience.length
        ? c.experience
            .map(
              (e, i) =>
                `[index ${i}] ${e.title} at ${e.company} (${e.duration})\n${e.bullets.map((b) => `- ${b}`).join("\n")}`,
            )
            .join("\n\n")
        : "(none listed)"
    }`,
  );
  parts.push(
    `PROJECTS:\n${
      c.projects.length
        ? c.projects
            .map(
              (p, i) =>
                `[index ${i}] ${p.name}: ${p.description}\n${p.bullets.map((b) => `- ${b}`).join("\n")}`,
            )
            .join("\n\n")
        : "(none listed)"
    }`,
  );
  parts.push(`CERTIFICATIONS: ${c.certifications.join(", ") || "(none listed)"}`);
  parts.push(
    `EDUCATION: ${c.education.map((e) => `${e.degree}, ${e.institution} (${e.years})`).join("; ") || "(none listed)"}`,
  );

  if (params.eligibility) {
    parts.push(
      `LATEST COMPANY ELIGIBILITY CHECK: ATS score ${params.eligibility.ats_score}/100. Missing skills flagged: ${params.eligibility.missing_skills.join(", ") || "none"}. Missing certifications flagged: ${params.eligibility.missing_certifications.join(", ") || "none"}.`,
    );
  }
  if (params.roadmapProgressPercent != null) {
    parts.push(`CAREER ROADMAP PROGRESS: ${params.roadmapProgressPercent}% complete.`);
  }
  if (params.latestInterview) {
    const li = params.latestInterview;
    parts.push(
      `MOST RECENT INTERVIEW (${li.interview_type}): overall score ${li.overall_score ?? "n/a"}/100. Strengths: ${(li.strengths ?? []).join(", ") || "none recorded"}. Weaknesses: ${(li.weaknesses ?? []).join(", ") || "none recorded"}.`,
    );
  }

  return parts.join("\n\n");
}

export const optimizeResumeVersionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      versionId: z.string().uuid(),
      targetCompany: z.string().trim().max(100).optional(),
      targetRole: z.string().trim().max(100).optional(),
      jobDescriptionText: z.string().trim().max(6000).optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ error: string | null; optimizationId?: string }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const geminiResult = getGemini();
    if ("error" in geminiResult) return { error: geminiResult.error };

    const { data: version, error: fetchError } = await supabase
      .from("resume_versions")
      .select("id, profile_id, resume_type, content, target_company, target_role")
      .eq("id", data.versionId)
      .single();
    if (fetchError || !version) return { error: "Resume not found." };
    if (version.profile_id !== auth.user.id) return { error: "Not authorized." };

    const targetCompany = data.targetCompany ?? version.target_company ?? undefined;
    const targetRole = data.targetRole ?? version.target_role ?? undefined;
    const jobDescriptionText = data.jobDescriptionText ?? undefined;
    const content = version.content as unknown as ResumeBuilderContent;

    const { data: eligibility } = await supabase
      .from("eligibility_reports")
      .select("missing_skills, missing_certifications, ats_score")
      .eq("profile_id", auth.user.id)
      .order("created_at", { ascending: false })
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

    const { data: latestInterview } = await supabase
      .from("voice_interview_sessions")
      .select("interview_type, overall_score, strengths, weaknesses")
      .eq("profile_id", auth.user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const companyProfile = targetCompany ? getCompanyProfile(targetCompany) : null;
    const contextBlock = buildOptimizeContextBlock({
      content,
      jobDescriptionText: jobDescriptionText ?? null,
      companyProfile,
      eligibility: eligibility ?? null,
      roadmapProgressPercent,
      latestInterview: latestInterview ?? null,
    });

    let text: string | undefined;
    try {
      const response = await withGeminiRetry(() =>
        geminiResult.client.models.generateContent({
          model: GEMINI_MODEL,
          contents: OPTIMIZE_PROMPT({
            resumeType: version.resume_type as ResumeType,
            targetRole: targetRole ?? null,
            targetCompany: companyProfile?.name ?? targetCompany ?? null,
            contextBlock,
          }),
          config: { responseMimeType: "application/json" },
        }),
      );
      text = response.text;
    } catch (err) {
      return { error: friendlyGeminiError(err, "resume_builder.optimize") };
    }
    if (!text) return { error: "AI optimization returned no result. Try again." };

    let generated: GeneratedOptimization;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      generated = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { error: "Could not parse the optimization result. Try again." };
    }

    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n ?? 0)));

    const { data: optimization, error: insertError } = await supabase
      .from("resume_optimizations")
      .insert({
        resume_version_id: version.id,
        profile_id: auth.user.id,
        target_company: companyProfile?.name ?? targetCompany ?? null,
        target_role: targetRole ?? null,
        job_description_text: jobDescriptionText ?? null,
        ats_optimization_score: clamp(generated.atsOptimizationScore),
        resume_quality_score: clamp(generated.resumeQualityScore),
        keyword_match_score: clamp(generated.keywordMatchScore),
        section_feedback: generated.sectionFeedback ?? {},
        missing_skills: generated.missingSkills ?? [],
        recommended_certifications: generated.recommendedCertifications ?? [],
        rewritten_summary: generated.rewrittenSummary ?? null,
        rewritten_experience: generated.rewrittenExperience ?? [],
        rewritten_projects: generated.rewrittenProjects ?? [],
        keyword_suggestions: generated.keywordSuggestions ?? [],
        formatting_suggestions: generated.formattingSuggestions ?? [],
        applied: false,
      })
      .select("id")
      .single();
    if (insertError || !optimization)
      return { error: insertError?.message ?? "Could not save the optimization." };

    await supabase
      .from("resume_versions")
      .update({
        ats_optimization_score: clamp(generated.atsOptimizationScore),
        resume_quality_score: clamp(generated.resumeQualityScore),
        keyword_match_score: clamp(generated.keywordMatchScore),
        section_feedback: generated.sectionFeedback ?? {},
        target_company: companyProfile?.name ?? targetCompany ?? version.target_company ?? null,
        target_role: targetRole ?? version.target_role ?? null,
        job_description_text: jobDescriptionText ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", version.id);

    return { error: null, optimizationId: optimization.id };
  });

export const applyResumeOptimizationFn = createServerFn({ method: "POST" })
  .validator(z.object({ optimizationId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: optimization, error: fetchError } = await supabase
      .from("resume_optimizations")
      .select("*")
      .eq("id", data.optimizationId)
      .single();
    if (fetchError || !optimization) return { error: "Optimization not found." };
    if (optimization.profile_id !== auth.user.id) return { error: "Not authorized." };

    const { data: version, error: versionError } = await supabase
      .from("resume_versions")
      .select("id, profile_id, content")
      .eq("id", optimization.resume_version_id)
      .single();
    if (versionError || !version) return { error: "Resume not found." };
    if (version.profile_id !== auth.user.id) return { error: "Not authorized." };

    const content = version.content as unknown as ResumeBuilderContent;
    const rewrittenExperience =
      (optimization.rewritten_experience as unknown as {
        index: number;
        bullets: string[];
      }[]) ?? [];
    const rewrittenProjects =
      (optimization.rewritten_projects as unknown as {
        index: number;
        description: string;
        bullets: string[];
      }[]) ?? [];

    const nextContent: ResumeBuilderContent = {
      ...content,
      summary: optimization.rewritten_summary || content.summary,
      experience: content.experience.map((e, i) => {
        const rewrite = rewrittenExperience.find((r) => r.index === i);
        return rewrite ? { ...e, bullets: rewrite.bullets } : e;
      }),
      projects: content.projects.map((p, i) => {
        const rewrite = rewrittenProjects.find((r) => r.index === i);
        return rewrite ? { ...p, description: rewrite.description, bullets: rewrite.bullets } : p;
      }),
      skills: Array.from(new Set([...content.skills, ...(optimization.missing_skills ?? [])])),
      certifications: Array.from(
        new Set([...content.certifications, ...(optimization.recommended_certifications ?? [])]),
      ),
    };

    const { error: updateError } = await supabase
      .from("resume_versions")
      .update({ content: nextContent, status: "optimized", updated_at: new Date().toISOString() })
      .eq("id", version.id);
    if (updateError) return { error: updateError.message };

    await supabase.from("resume_optimizations").update({ applied: true }).eq("id", optimization.id);

    return { error: null };
  });
