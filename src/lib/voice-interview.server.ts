import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit.server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";
import type { ResumeAnalysis } from "@/lib/resume.server";

export type InterviewType = "hr" | "technical" | "manager" | "startup" | "faang" | "behavioral";
// Sprint 18: the "HR-intelligence" family — types that get extra
// grounding (roadmap progress, previous interview performance) and the
// extended teamwork/adaptability/cultureFit/hrReadiness evaluation.
const HR_FAMILY_TYPES = new Set<InterviewType>(["hr", "behavioral", "manager"]);
export type Difficulty = "easy" | "medium" | "hard";
export type Language = "english" | "hindi" | "hinglish";
export type VoiceGender = "male" | "female";

export type VoiceInterviewQA = {
  index: number;
  question: string;
  answer: string | null;
  askedAt: string;
  answeredAt: string | null;
  // Sprint 14: per-answer feedback, filled in by respondToVoiceInterviewFn
  // once the candidate's answer to this question comes back.
  score?: number;
  strengths?: string[];
  weaknesses?: string[];
  idealAnswer?: string;
  suggestions?: string[];
};

export type VoiceInterviewReport = {
  overallScore: number;
  communicationScore: number;
  confidenceScore: number;
  grammarScore: number;
  technicalScore: number;
  leadershipScore: number;
  problemSolvingScore: number;
  professionalismScore: number;
  // Sprint 18: only populated for hr/behavioral/manager sessions.
  teamworkScore: number | null;
  adaptabilityScore: number | null;
  cultureFitScore: number | null;
  hrReadinessScore: number | null;
  strengths: string[];
  weaknesses: string[];
  improvementPlan: string[];
  hiringRecommendation: string;
  summary: string;
  missingSkills: string[];
  matchedSkills: string[];
};

/** Sprint 14: real target-company/role/JD/resume grounding, built once at
 * session start and persisted (`context_block`) so every later Gemini
 * call in the session reuses it verbatim instead of re-deriving it or
 * requiring the client to resend it every turn. */
function buildContextBlock(params: {
  jobDescriptionText?: string | null;
  targetSkills?: string[] | null;
  resumeAnalysis?: ResumeAnalysis | null;
  // Sprint 18: extra grounding for hr/behavioral/manager sessions.
  roadmapProgressPercent?: number | null;
  previousSession?: {
    interview_type: string;
    role: string;
    company: string | null;
    overall_score: number | null;
    strengths: string[] | null;
    weaknesses: string[] | null;
  } | null;
}): string | null {
  const parts: string[] = [];
  if (params.jobDescriptionText?.trim()) {
    parts.push(`JOB DESCRIPTION:\n${params.jobDescriptionText.trim().slice(0, 4000)}`);
  }
  if (params.targetSkills?.length) {
    parts.push(`KEY SKILLS THIS ROLE REQUIRES: ${params.targetSkills.slice(0, 30).join(", ")}`);
  }
  if (params.resumeAnalysis) {
    const a = params.resumeAnalysis;
    const resumeParts: string[] = [];
    const skills = [...(a.skills ?? []), ...(a.technologies ?? []), ...(a.frameworks ?? [])];
    if (skills.length) resumeParts.push(`Skills: ${skills.slice(0, 40).join(", ")}`);
    if (a.experience?.length) {
      resumeParts.push(
        `Experience: ${a.experience
          .slice(0, 5)
          .map((e) => `${e.title} at ${e.company}${e.summary ? ` — ${e.summary}` : ""}`)
          .join("; ")}`,
      );
    }
    if (a.projects?.length) {
      resumeParts.push(
        `Projects: ${a.projects
          .slice(0, 5)
          .map((p) => p.name)
          .join(", ")}`,
      );
    }
    if (resumeParts.length) parts.push(`CANDIDATE RESUME:\n${resumeParts.join("\n")}`);
  }
  if (params.roadmapProgressPercent != null) {
    parts.push(
      `CAREER ROADMAP PROGRESS: ${params.roadmapProgressPercent}% of the candidate's active preparation roadmap is complete.`,
    );
  }
  if (params.previousSession) {
    const p = params.previousSession;
    parts.push(
      `PREVIOUS INTERVIEW PERFORMANCE (${p.interview_type} interview for ${p.role}${p.company ? ` at ${p.company}` : ""}): overall score ${p.overall_score ?? "n/a"}/100. Strengths shown: ${(p.strengths ?? []).join(", ") || "none recorded"}. Weaknesses shown: ${(p.weaknesses ?? []).join(", ") || "none recorded"}. Build on this — probe whether past weaknesses have improved.`,
    );
  }
  return parts.length ? parts.join("\n\n") : null;
}

const QUESTIONS_BY_DURATION: Record<number, number> = { 15: 4, 30: 6, 45: 8, 60: 10 };

const TYPE_LABEL: Record<InterviewType, string> = {
  hr: "HR / general fit",
  technical: "technical",
  manager: "hiring manager / leadership",
  startup: "startup, high-ownership, fast-paced",
  faang: "FAANG-style, high-bar structured",
  behavioral: "behavioral, STAR-format past-experience",
};

const LANGUAGE_INSTRUCTION: Record<Language, string> = {
  english: "Speak and ask questions in English.",
  hindi: "Speak and ask questions in Hindi (Devanagari script).",
  hinglish:
    "Speak and ask questions in natural Hinglish (a casual mix of Hindi and English, written in Roman script), the way Indian professionals actually speak in interviews.",
};

function personaPrompt(params: {
  interviewType: InterviewType;
  company: string | null;
  role: string;
  difficulty: Difficulty;
  language: Language;
  contextBlock?: string | null;
}) {
  const companyLine = params.company ? ` at ${params.company}` : "";
  const contextSection = params.contextBlock
    ? `\n\nGround your questions in this real context — ask about the candidate's actual projects/skills and the target role's actual requirements where relevant, instead of generic ${TYPE_LABEL[params.interviewType]} questions:\n\n${params.contextBlock}`
    : "";
  return `You are conducting a live, spoken ${TYPE_LABEL[params.interviewType]} interview${companyLine} for a candidate applying for the role of "${params.role}". Difficulty level: ${params.difficulty}.

${LANGUAGE_INSTRUCTION[params.language]}

Ask one question at a time, exactly the way a real human interviewer would speak it aloud — natural, conversational, never numbered or bulleted. Keep each question to 1-3 sentences. Vary question types appropriately for a ${TYPE_LABEL[params.interviewType]} interview (behavioral, situational, role-specific, and — if technical or FAANG — problem-solving). Never repeat a question you've already asked. Respond with ONLY the question text — no preamble, no markdown, no quotation marks, no "Question 1:" labels.${contextSection}`;
}

function transcriptText(questions: VoiceInterviewQA[]) {
  return questions
    .filter((q) => q.answer)
    .map((q) => `Interviewer: ${q.question}\nCandidate: ${q.answer}`)
    .join("\n\n");
}

function getGemini(): { client: GoogleGenAI } | { error: string } {
  // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable the AI voice interviewer.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "AI interviews are not configured yet (missing GEMINI_API_KEY)." };
  return { client: new GoogleGenAI({ apiKey }) };
}

export const startVoiceInterviewFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      interviewType: z.enum(["hr", "technical", "manager", "startup", "faang", "behavioral"]),
      company: z.string().trim().max(100).optional(),
      role: z.string().trim().min(1).max(100),
      difficulty: z.enum(["easy", "medium", "hard"]),
      durationMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
      language: z.enum(["english", "hindi", "hinglish"]),
      voiceGender: z.enum(["male", "female"]),
      // Sprint 14: optional real grounding — a Job Description page
      // analysis (Sprint 12) and/or the candidate's current résumé
      // analysis (Sprint 13, fetched here server-side by profile id).
      jobDescriptionText: z.string().trim().max(6000).optional(),
      targetSkills: z.array(z.string().trim().max(60)).max(40).optional(),
    }),
  )
  .handler(
    async ({ data }): Promise<{ error: string | null; sessionId?: string; question?: string }> => {
      const supabase = getSupabaseServerClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { error: "Not signed in." };
      if (!(await checkRateLimit(`ai:voice-interview-start:${auth.user.id}`, 10, 600))) {
        return { error: RATE_LIMIT_MESSAGE };
      }

      const geminiResult = getGemini();
      if ("error" in geminiResult) return { error: geminiResult.error };

      const { data: resume } = await supabase
        .from("resumes")
        .select("analysis")
        .eq("profile_id", auth.user.id)
        .eq("is_current", true)
        .maybeSingle();
      const resumeAnalysis = (resume?.analysis as unknown as ResumeAnalysis | null) ?? null;

      // Sprint 18: hr/behavioral/manager sessions additionally ground on
      // the candidate's active roadmap progress and their most recent
      // completed interview of any type — technical/startup/faang keep
      // their existing Sprint 14 behavior unchanged.
      let roadmapProgressPercent: number | null = null;
      let previousSession: Parameters<typeof buildContextBlock>[0]["previousSession"] = null;
      let previousSessionId: string | null = null;
      if (HR_FAMILY_TYPES.has(data.interviewType)) {
        const { data: activeRoadmap } = await supabase
          .from("career_roadmaps")
          .select("id")
          .eq("profile_id", auth.user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
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

        const { data: lastSession } = await supabase
          .from("voice_interview_sessions")
          .select("id, interview_type, role, company, overall_score, strengths, weaknesses")
          .eq("profile_id", auth.user.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastSession) {
          previousSession = lastSession;
          previousSessionId = lastSession.id;
        }
      }

      const contextBlock = buildContextBlock({
        jobDescriptionText: data.jobDescriptionText,
        targetSkills: data.targetSkills,
        resumeAnalysis,
        roadmapProgressPercent,
        previousSession,
      });

      const persona = personaPrompt({
        interviewType: data.interviewType,
        company: data.company ?? null,
        role: data.role,
        difficulty: data.difficulty,
        language: data.language,
        contextBlock,
      });

      let question: string;
      try {
        const response = await withGeminiRetry(() =>
          geminiResult.client.models.generateContent({
            model: GEMINI_MODEL,
            contents:
              "Begin the interview. Greet the candidate warmly in one short sentence, then ask your first question.",
            config: { systemInstruction: persona },
          }),
        );
        question = (response.text ?? "").trim();
      } catch (err) {
        return { error: friendlyGeminiError(err, "voice_interview.start") };
      }
      if (!question) return { error: "AI interviewer returned no question. Try again." };

      const questions: VoiceInterviewQA[] = [
        { index: 0, question, answer: null, askedAt: new Date().toISOString(), answeredAt: null },
      ];

      const { data: inserted, error: insertError } = await supabase
        .from("voice_interview_sessions")
        .insert({
          profile_id: auth.user.id,
          interview_type: data.interviewType,
          company: data.company || null,
          role: data.role,
          difficulty: data.difficulty,
          duration_minutes: data.durationMinutes,
          language: data.language,
          voice_gender: data.voiceGender,
          status: "in_progress",
          questions,
          context_block: contextBlock,
          roadmap_progress_percent: roadmapProgressPercent,
          previous_session_id: previousSessionId,
        })
        .select("id")
        .single();
      if (insertError || !inserted)
        return { error: insertError?.message ?? "Could not start the interview." };

      return { error: null, sessionId: inserted.id, question };
    },
  );

const RESPOND_PROMPT = (transcript: string, shouldConclude: boolean) => `${transcript}

The candidate just answered the most recent question above. Respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "feedback": {
    "score": number (0-100, quality of this specific answer),
    "strengths": string[] (1-3 concrete strengths of this answer),
    "weaknesses": string[] (1-3 concrete weaknesses of this answer),
    "idealAnswer": string (2-3 sentences describing what a strong answer would have covered),
    "suggestions": string[] (1-3 specific improvement suggestions for this answer)
  },
  "nextQuestion": string (${
    shouldConclude
      ? "a brief, warm closing remark, 1-2 sentences, thanking the candidate and letting them know their report is being prepared"
      : "the next interview question — a different topic or angle than what's already been asked"
  })
}

Score honestly based on actual answer quality — do not default to high scores.`;

export const respondToVoiceInterviewFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().uuid(), answer: z.string().trim().min(1).max(4000) }))
  .handler(
    async ({
      data,
    }): Promise<{ error: string | null; question?: string; readyToFinish?: boolean }> => {
      const supabase = getSupabaseServerClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { error: "Not signed in." };

      const { data: session, error: fetchError } = await supabase
        .from("voice_interview_sessions")
        .select(
          "id, profile_id, interview_type, company, role, difficulty, duration_minutes, language, questions, status, context_block",
        )
        .eq("id", data.sessionId)
        .single();
      if (fetchError || !session) return { error: "Interview session not found." };
      if (session.profile_id !== auth.user.id) return { error: "Not authorized." };
      if (session.status !== "in_progress") return { error: "This interview has already ended." };

      const questions = (session.questions as unknown as VoiceInterviewQA[]) ?? [];
      const current = questions[questions.length - 1];
      if (current) {
        current.answer = data.answer;
        current.answeredAt = new Date().toISOString();
      }

      const answeredCount = questions.filter((q) => q.answer).length;
      const target = QUESTIONS_BY_DURATION[session.duration_minutes] ?? 6;
      const shouldConclude = answeredCount >= target;

      const geminiResult = getGemini();
      if ("error" in geminiResult) return { error: geminiResult.error };

      const persona = personaPrompt({
        interviewType: session.interview_type as InterviewType,
        company: session.company,
        role: session.role,
        difficulty: session.difficulty as Difficulty,
        language: session.language as Language,
        contextBlock: session.context_block,
      });

      let parsed: {
        feedback?: {
          score?: number;
          strengths?: string[];
          weaknesses?: string[];
          idealAnswer?: string;
          suggestions?: string[];
        };
        nextQuestion?: string;
      };
      try {
        const response = await withGeminiRetry(() =>
          geminiResult.client.models.generateContent({
            model: GEMINI_MODEL,
            contents: RESPOND_PROMPT(transcriptText(questions), shouldConclude),
            config: { systemInstruction: persona, responseMimeType: "application/json" },
          }),
        );
        const text = (response.text ?? "").trim();
        if (!text) return { error: "AI interviewer returned no response. Try again." };
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch (err) {
        if (err instanceof SyntaxError)
          return { error: "Could not parse the AI's response. Try again." };
        return { error: friendlyGeminiError(err, "voice_interview.respond") };
      }

      const nextText = (parsed.nextQuestion ?? "").trim();
      if (!nextText) return { error: "AI interviewer returned no response. Try again." };

      if (current && parsed.feedback) {
        const clamp = (n: number | undefined) => Math.max(0, Math.min(100, Math.round(n ?? 0)));
        current.score = clamp(parsed.feedback.score);
        current.strengths = parsed.feedback.strengths ?? [];
        current.weaknesses = parsed.feedback.weaknesses ?? [];
        current.idealAnswer = parsed.feedback.idealAnswer ?? "";
        current.suggestions = parsed.feedback.suggestions ?? [];
      }

      if (!shouldConclude) {
        questions.push({
          index: questions.length,
          question: nextText,
          answer: null,
          askedAt: new Date().toISOString(),
          answeredAt: null,
        });
      }

      const { error: updateError } = await supabase
        .from("voice_interview_sessions")
        .update({ questions })
        .eq("id", data.sessionId);
      if (updateError) return { error: updateError.message };

      return { error: null, question: nextText, readyToFinish: shouldConclude };
    },
  );

const HR_FIELDS_SCHEMA = `,
  "teamworkScore": number (0-100, evidence of effective collaboration in the answers),
  "adaptabilityScore": number (0-100, evidence of adjusting well to change/ambiguity in the answers),
  "cultureFitScore": number (0-100, alignment between the candidate's stated values/working style and a healthy team culture),
  "hrReadinessScore": number (0-100, holistic readiness for this HR/behavioral/managerial round specifically — distinct from the general overallScore)`;

const REPORT_PROMPT = (
  interviewType: InterviewType,
  role: string,
  company: string | null,
  transcript: string,
  contextBlock: string | null,
  includeHrFields: boolean,
) => `You are a senior interview coach and hiring panel reviewer. Review this full ${TYPE_LABEL[interviewType]} interview transcript for a candidate targeting the role of "${role}"${company ? ` at ${company}` : ""}, and respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "overallScore": number (0-100),
  "communicationScore": number (0-100),
  "confidenceScore": number (0-100),
  "grammarScore": number (0-100),
  "technicalScore": number (0-100, rate general problem-solving/role knowledge even for non-technical interviews),
  "leadershipScore": number (0-100),
  "problemSolvingScore": number (0-100),
  "professionalismScore": number (0-100)${includeHrFields ? HR_FIELDS_SCHEMA : ""},
  "strengths": string[] (3-5 concrete strengths shown in the actual answers),
  "weaknesses": string[] (3-5 concrete, honest weaknesses shown in the actual answers),
  "improvementPlan": string[] (3-5 specific, actionable next steps to improve${includeHrFields ? " — frame this as an HR/behavioral improvement plan" : ""}),
  "hiringRecommendation": string (one of exactly: "Strong Hire", "Hire", "Leaning Hire", "Leaning No Hire", "No Hire"),
  "summary": string (3-5 sentence overall assessment, direct and specific),
  "missingSkills": string[] (skills the target role/JD context below calls for that never came up or weren't demonstrated in the candidate's answers — empty array if no JD/role context is available or no gaps found),
  "matchedSkills": string[] (skills from the candidate's resume/context below that this interview's answers actually demonstrated — empty array if no resume context is available)
}

Score honestly and realistically based on actual answer quality, depth, and clarity — do not default to high scores. Base every point strictly on what the candidate actually said — never invent claims they didn't make.${contextBlock ? `\n\nTARGET ROLE / CANDIDATE CONTEXT (use this for missingSkills/matchedSkills, and — if present — to judge improvement over prior performance and roadmap progress; the scores above must still be based purely on the transcript):\n${contextBlock}` : ""}

TRANSCRIPT:
"""
${transcript}
"""`;

export const finishVoiceInterviewFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null; report?: VoiceInterviewReport }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: session, error: fetchError } = await supabase
      .from("voice_interview_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .single();
    if (fetchError || !session) return { error: "Interview session not found." };
    if (session.profile_id !== auth.user.id) return { error: "Not authorized." };

    if (session.status === "completed" && session.overall_score != null) {
      return {
        error: null,
        report: {
          overallScore: session.overall_score ?? 0,
          communicationScore: session.communication_score ?? 0,
          confidenceScore: session.confidence_score ?? 0,
          grammarScore: session.grammar_score ?? 0,
          technicalScore: session.technical_score ?? 0,
          leadershipScore: session.leadership_score ?? 0,
          problemSolvingScore: session.problem_solving_score ?? 0,
          professionalismScore: session.professionalism_score ?? 0,
          teamworkScore: session.teamwork_score ?? null,
          adaptabilityScore: session.adaptability_score ?? null,
          cultureFitScore: session.culture_fit_score ?? null,
          hrReadinessScore: session.hr_readiness_score ?? null,
          strengths: session.strengths ?? [],
          weaknesses: session.weaknesses ?? [],
          improvementPlan: session.improvement_plan ?? [],
          hiringRecommendation: session.hiring_recommendation ?? "",
          summary: session.summary ?? "",
          missingSkills: session.missing_skills ?? [],
          matchedSkills: session.matched_skills ?? [],
        },
      };
    }

    const questions = (session.questions as unknown as VoiceInterviewQA[]) ?? [];
    if (questions.filter((q) => q.answer).length === 0) {
      return { error: "Answer at least one question before finishing." };
    }

    const geminiResult = getGemini();
    if ("error" in geminiResult) return { error: geminiResult.error };

    const includeHrFields = HR_FAMILY_TYPES.has(session.interview_type as InterviewType);

    let text: string | undefined;
    try {
      const response = await withGeminiRetry(() =>
        geminiResult.client.models.generateContent({
          model: GEMINI_MODEL,
          contents: REPORT_PROMPT(
            session.interview_type as InterviewType,
            session.role,
            session.company,
            transcriptText(questions),
            session.context_block,
            includeHrFields,
          ),
          config: { responseMimeType: "application/json" },
        }),
      );
      text = response.text;
    } catch (err) {
      return { error: friendlyGeminiError(err, "voice_interview.finish") };
    }
    if (!text) return { error: "AI report generation returned no result. Try again." };

    let report: VoiceInterviewReport;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      report = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { error: "Could not parse the AI report. Try again." };
    }

    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n ?? 0)));
    const clampNullable = (n: number | null | undefined) =>
      n == null ? null : Math.max(0, Math.min(100, Math.round(n)));

    const teamworkScore = includeHrFields ? clampNullable(report.teamworkScore) : null;
    const adaptabilityScore = includeHrFields ? clampNullable(report.adaptabilityScore) : null;
    const cultureFitScore = includeHrFields ? clampNullable(report.cultureFitScore) : null;
    const hrReadinessScore = includeHrFields ? clampNullable(report.hrReadinessScore) : null;

    const { error: updateError } = await supabase
      .from("voice_interview_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        overall_score: clamp(report.overallScore),
        communication_score: clamp(report.communicationScore),
        confidence_score: clamp(report.confidenceScore),
        grammar_score: clamp(report.grammarScore),
        technical_score: clamp(report.technicalScore),
        leadership_score: clamp(report.leadershipScore),
        problem_solving_score: clamp(report.problemSolvingScore),
        professionalism_score: clamp(report.professionalismScore),
        teamwork_score: teamworkScore,
        adaptability_score: adaptabilityScore,
        culture_fit_score: cultureFitScore,
        hr_readiness_score: hrReadinessScore,
        strengths: report.strengths ?? [],
        weaknesses: report.weaknesses ?? [],
        improvement_plan: report.improvementPlan ?? [],
        hiring_recommendation: report.hiringRecommendation ?? "",
        summary: report.summary ?? "",
        missing_skills: report.missingSkills ?? [],
        matched_skills: report.matchedSkills ?? [],
      })
      .eq("id", data.sessionId);
    if (updateError) return { error: updateError.message };

    return {
      error: null,
      report: {
        ...report,
        overallScore: clamp(report.overallScore),
        teamworkScore,
        adaptabilityScore,
        cultureFitScore,
        hrReadinessScore,
        missingSkills: report.missingSkills ?? [],
        matchedSkills: report.matchedSkills ?? [],
      },
    };
  });

export const abandonVoiceInterviewFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { error } = await supabase
      .from("voice_interview_sessions")
      .update({ status: "abandoned" })
      .eq("id", data.sessionId)
      .eq("profile_id", auth.user.id)
      .eq("status", "in_progress");
    if (error) {
      console.error("[voice-interview] abandon session failed:", error.message);
      return { error: "Could not update this interview session." };
    }
    return { error: null };
  });

export const deleteVoiceInterviewFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { error } = await supabase
      .from("voice_interview_sessions")
      .delete()
      .eq("id", data.sessionId)
      .eq("profile_id", auth.user.id);
    if (error) {
      console.error("[voice-interview] delete session failed:", error.message);
      return { error: "Could not delete this interview session." };
    }
    return { error: null };
  });
