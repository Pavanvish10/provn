import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { friendlyGeminiError } from "@/lib/ai.server";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export type ResumeAnalysis = {
  skills: string[];
  experience: { title: string; company: string; duration: string; summary: string }[];
  education: { institution: string; degree: string; years: string }[];
  projects: { name: string; description: string }[];
  certifications: string[];
  languages: string[];
  technologies: string[];
  frameworks: string[];
  soft_skills: string[];
  ats_score: number;
  ats_feedback: string[];
};

const ANALYSIS_PROMPT = `You are an ATS (Applicant Tracking System) resume analyzer. Read the attached resume PDF and respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "skills": string[],
  "experience": [{ "title": string, "company": string, "duration": string, "summary": string }],
  "education": [{ "institution": string, "degree": string, "years": string }],
  "projects": [{ "name": string, "description": string }],
  "certifications": string[],
  "languages": string[],
  "technologies": string[],
  "frameworks": string[],
  "soft_skills": string[],
  "ats_score": number (0-100, a realistic honest ATS-compatibility score),
  "ats_feedback": string[] (3-6 concrete, specific improvement suggestions)
}

Be accurate to what's actually in the resume. Do not invent experience or skills that aren't present. If a section is empty, return an empty array. ats_score should reflect real ATS parseability and content quality, not just be generous.`;

export const analyzeResumeFn = createServerFn({ method: "POST" })
  .validator(z.object({ resumeId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null; analysis?: ResumeAnalysis }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("id, storage_path, profile_id")
      .eq("id", data.resumeId)
      .single();
    if (resumeError || !resume) return { error: "Resume not found." };
    if (resume.profile_id !== auth.user.id) return { error: "Not authorized." };
    if (!resume.storage_path) return { error: "Resume file is missing." };

    // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable AI resume analysis.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { error: "AI analysis is not configured yet (missing GEMINI_API_KEY)." };
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(resume.storage_path);
    if (downloadError || !file) return { error: "Could not read the uploaded resume file." };

    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });

    let text: string;
    try {
      const result = await model.generateContent([
        { inlineData: { mimeType: "application/pdf", data: base64 } },
        ANALYSIS_PROMPT,
      ]);
      text = result.response.text();
    } catch (err) {
      return { error: friendlyGeminiError(err) };
    }

    if (!text) {
      return { error: "AI analysis returned no result. Try again." };
    }

    let analysis: ResumeAnalysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { error: "Could not parse AI analysis. Try again." };
    }

    await supabase
      .from("resumes")
      .update({
        analysis,
        ats_score: Math.round(analysis.ats_score ?? 0),
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", resume.id);

    const skillNames = new Set<string>([
      ...(analysis.skills ?? []),
      ...(analysis.technologies ?? []),
      ...(analysis.frameworks ?? []),
    ]);
    for (const name of skillNames) {
      if (!name?.trim()) continue;
      await supabase
        .from("skills")
        .upsert(
          { profile_id: auth.user.id, skill_name: name.trim(), source: "resume", level: "claimed" },
          { onConflict: "profile_id,skill_name", ignoreDuplicates: true },
        );
    }

    await supabase.rpc("create_notification", {
      p_recipient_id: auth.user.id,
      p_actor_id: auth.user.id,
      p_type: "resume_analysis",
      p_message: `Your resume analysis is ready — ATS score ${Math.round(analysis.ats_score ?? 0)}`,
      p_entity_type: "resume",
      p_entity_id: resume.id,
    });

    return { error: null, analysis };
  });

export type JdMatchResult = {
  score: number;
  strengths: string[];
  gaps: string[];
  rewrite: string[];
};

const JD_MATCH_PROMPT = (
  jd: string,
) => `You are an ATS matching engine. Compare the attached resume PDF against this specific job description and respond with ONLY a JSON object (no markdown fences, no prose):

{
  "score": number (0-100, realistic JD-fit score),
  "strengths": string[] (3-5 concrete ways the resume matches this JD),
  "gaps": string[] (3-5 concrete gaps versus this JD's requirements),
  "rewrite": string[] (3-5 specific, actionable rewrite suggestions tailored to this JD)
}

Base every point strictly on the actual resume content and the job description below — never invent experience.

JOB DESCRIPTION:
"""
${jd}
"""`;

export const analyzeResumeAgainstJdFn = createServerFn({ method: "POST" })
  .validator(z.object({ jobDescription: z.string().min(40) }))
  .handler(async ({ data }): Promise<{ error: string | null; result?: JdMatchResult }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable AI JD matching.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { error: "AI analysis is not configured yet (missing GEMINI_API_KEY)." };
    }

    const { data: resume } = await supabase
      .from("resumes")
      .select("storage_path")
      .eq("profile_id", auth.user.id)
      .eq("is_current", true)
      .maybeSingle();
    if (!resume?.storage_path) {
      return { error: "Upload a resume to your profile first." };
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(resume.storage_path);
    if (downloadError || !file) return { error: "Could not read your uploaded resume." };

    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });

    let text: string;
    try {
      const geminiResult = await model.generateContent([
        { inlineData: { mimeType: "application/pdf", data: base64 } },
        JD_MATCH_PROMPT(data.jobDescription),
      ]);
      text = geminiResult.response.text();
    } catch (err) {
      return { error: friendlyGeminiError(err) };
    }

    if (!text) return { error: "AI analysis returned no result." };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const result: JdMatchResult = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      return { error: null, result };
    } catch {
      return { error: "Could not parse AI analysis. Try again." };
    }
  });
