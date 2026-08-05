import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";

export type InterviewType = "hr" | "technical" | "manager" | "startup" | "faang";
export type Difficulty = "easy" | "medium" | "hard";
export type Language = "english" | "hindi" | "hinglish";
export type VoiceGender = "male" | "female";

export type VoiceInterviewQA = {
  index: number;
  question: string;
  answer: string | null;
  askedAt: string;
  answeredAt: string | null;
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
  strengths: string[];
  weaknesses: string[];
  improvementPlan: string[];
  hiringRecommendation: string;
  summary: string;
};

const QUESTIONS_BY_DURATION: Record<number, number> = { 15: 4, 30: 6, 45: 8, 60: 10 };

const TYPE_LABEL: Record<InterviewType, string> = {
  hr: "HR / general fit",
  technical: "technical",
  manager: "hiring manager / leadership",
  startup: "startup, high-ownership, fast-paced",
  faang: "FAANG-style, high-bar structured",
};

const LANGUAGE_INSTRUCTION: Record<Language, string> = {
  english: "Speak and ask questions in English.",
  hindi: "Speak and ask questions in Hindi (Devanagari script).",
  hinglish: "Speak and ask questions in natural Hinglish (a casual mix of Hindi and English, written in Roman script), the way Indian professionals actually speak in interviews.",
};

function personaPrompt(params: {
  interviewType: InterviewType;
  company: string | null;
  role: string;
  difficulty: Difficulty;
  language: Language;
}) {
  const companyLine = params.company
    ? ` at ${params.company}`
    : "";
  return `You are conducting a live, spoken ${TYPE_LABEL[params.interviewType]} interview${companyLine} for a candidate applying for the role of "${params.role}". Difficulty level: ${params.difficulty}.

${LANGUAGE_INSTRUCTION[params.language]}

Ask one question at a time, exactly the way a real human interviewer would speak it aloud — natural, conversational, never numbered or bulleted. Keep each question to 1-3 sentences. Vary question types appropriately for a ${TYPE_LABEL[params.interviewType]} interview (behavioral, situational, role-specific, and — if technical or FAANG — problem-solving). Never repeat a question you've already asked. Respond with ONLY the question text — no preamble, no markdown, no quotation marks, no "Question 1:" labels.`;
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
      interviewType: z.enum(["hr", "technical", "manager", "startup", "faang"]),
      company: z.string().trim().max(100).optional(),
      role: z.string().trim().min(1).max(100),
      difficulty: z.enum(["easy", "medium", "hard"]),
      durationMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
      language: z.enum(["english", "hindi", "hinglish"]),
      voiceGender: z.enum(["male", "female"]),
    }),
  )
  .handler(
    async ({ data }): Promise<{ error: string | null; sessionId?: string; question?: string }> => {
      const supabase = getSupabaseServerClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { error: "Not signed in." };

      const geminiResult = getGemini();
      if ("error" in geminiResult) return { error: geminiResult.error };

      const persona = personaPrompt({
        interviewType: data.interviewType,
        company: data.company ?? null,
        role: data.role,
        difficulty: data.difficulty,
        language: data.language,
      });

      let question: string;
      try {
        const response = await withGeminiRetry(() =>
          geminiResult.client.models.generateContent({
            model: GEMINI_MODEL,
            contents: "Begin the interview. Greet the candidate warmly in one short sentence, then ask your first question.",
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
        })
        .select("id")
        .single();
      if (insertError || !inserted)
        return { error: insertError?.message ?? "Could not start the interview." };

      return { error: null, sessionId: inserted.id, question };
    },
  );

export const respondToVoiceInterviewFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().uuid(), answer: z.string().trim().min(1).max(4000) }))
  .handler(
    async ({ data }): Promise<{ error: string | null; question?: string; readyToFinish?: boolean }> => {
      const supabase = getSupabaseServerClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { error: "Not signed in." };

      const { data: session, error: fetchError } = await supabase
        .from("voice_interview_sessions")
        .select(
          "id, profile_id, interview_type, company, role, difficulty, duration_minutes, language, questions, status",
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
      });

      const followUp = shouldConclude
        ? "The interview is now complete. Speak a brief, warm closing remark (1-2 sentences) thanking the candidate and letting them know their report is being prepared. Respond with ONLY that closing remark."
        : "Based on the conversation so far, ask the next interview question — a different topic or angle than what's already been asked. Respond with ONLY the next question text.";

      let nextText: string;
      try {
        const response = await withGeminiRetry(() =>
          geminiResult.client.models.generateContent({
            model: GEMINI_MODEL,
            contents: `${transcriptText(questions)}\n\n${followUp}`,
            config: { systemInstruction: persona },
          }),
        );
        nextText = (response.text ?? "").trim();
      } catch (err) {
        return { error: friendlyGeminiError(err, "voice_interview.respond") };
      }
      if (!nextText) return { error: "AI interviewer returned no response. Try again." };

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

const REPORT_PROMPT = (
  interviewType: InterviewType,
  role: string,
  company: string | null,
  transcript: string,
) => `You are a senior interview coach and hiring panel reviewer. Review this full ${TYPE_LABEL[interviewType]} interview transcript for a candidate targeting the role of "${role}"${company ? ` at ${company}` : ""}, and respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "overallScore": number (0-100),
  "communicationScore": number (0-100),
  "confidenceScore": number (0-100),
  "grammarScore": number (0-100),
  "technicalScore": number (0-100, rate general problem-solving/role knowledge even for non-technical interviews),
  "leadershipScore": number (0-100),
  "problemSolvingScore": number (0-100),
  "professionalismScore": number (0-100),
  "strengths": string[] (3-5 concrete strengths shown in the actual answers),
  "weaknesses": string[] (3-5 concrete, honest weaknesses shown in the actual answers),
  "improvementPlan": string[] (3-5 specific, actionable next steps to improve),
  "hiringRecommendation": string (one of exactly: "Strong Hire", "Hire", "Leaning Hire", "Leaning No Hire", "No Hire"),
  "summary": string (3-5 sentence overall assessment, direct and specific)
}

Score honestly and realistically based on actual answer quality, depth, and clarity — do not default to high scores. Base every point strictly on what the candidate actually said — never invent claims they didn't make.

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
          strengths: session.strengths ?? [],
          weaknesses: session.weaknesses ?? [],
          improvementPlan: session.improvement_plan ?? [],
          hiringRecommendation: session.hiring_recommendation ?? "",
          summary: session.summary ?? "",
        },
      };
    }

    const questions = (session.questions as unknown as VoiceInterviewQA[]) ?? [];
    if (questions.filter((q) => q.answer).length === 0) {
      return { error: "Answer at least one question before finishing." };
    }

    const geminiResult = getGemini();
    if ("error" in geminiResult) return { error: geminiResult.error };

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
        strengths: report.strengths ?? [],
        weaknesses: report.weaknesses ?? [],
        improvement_plan: report.improvementPlan ?? [],
        hiring_recommendation: report.hiringRecommendation ?? "",
        summary: report.summary ?? "",
      })
      .eq("id", data.sessionId);
    if (updateError) return { error: updateError.message };

    return {
      error: null,
      report: { ...report, overallScore: clamp(report.overallScore) },
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
    if (error) return { error: error.message };
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
    if (error) return { error: error.message };
    return { error: null };
  });
