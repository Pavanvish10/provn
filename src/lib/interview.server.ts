import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";

export type InterviewTurn = { role: "assistant" | "user"; content: string };

export type InterviewMode = "technical" | "soft_skills";

export type InterviewFeedback = {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
};

const CANDIDATE_ANSWER_THRESHOLD = 5;

function personaPrompt(role: string, mode: InterviewMode) {
  if (mode === "soft_skills") {
    return `You are conducting a professional soft-skills / behavioral interview for a candidate targeting the role of "${role}". Focus exclusively on soft skills — communication, teamwork, conflict resolution, leadership, adaptability, time management, and handling pressure or ambiguity. Ask thoughtful behavioral questions one at a time (STAR-style prompts work well). Do not ask technical or coding questions. Keep each question concise (1-3 sentences). Respond with ONLY the question text — no preamble, no numbering, no markdown, no quotation marks.`;
  }
  return `You are conducting a professional mock interview for a candidate targeting the role of "${role}". Ask thoughtful, role-relevant interview questions one at a time, mixing technical and behavioral questions appropriate for the role. Keep each question concise (1-3 sentences). Respond with ONLY the question text — no preamble, no numbering, no markdown, no quotation marks.`;
}

function transcriptToText(transcript: InterviewTurn[]) {
  return transcript
    .map((t) => `${t.role === "assistant" ? "Interviewer" : "Candidate"}: ${t.content}`)
    .join("\n\n");
}

function getGemini(): { client: GoogleGenerativeAI } | { error: string } {
  // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable AI mock interviews.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return { error: "AI mock interviews are not configured yet (missing GEMINI_API_KEY)." };
  return { client: new GoogleGenerativeAI(apiKey) };
}

export const startMockInterviewFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      role: z.string().trim().min(1).max(80),
      mode: z.enum(["technical", "soft_skills"]).default("technical"),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{ error: string | null; interviewId?: string; question?: string }> => {
      const supabase = getSupabaseServerClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { error: "Not signed in." };

      const geminiResult = getGemini();
      if ("error" in geminiResult) return { error: geminiResult.error };

      const model = geminiResult.client.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: personaPrompt(data.role, data.mode),
      });

      let question: string;
      try {
        const result = await withGeminiRetry(() =>
          model.generateContent("Begin the interview with your first question."),
        );
        question = result.response.text().trim();
      } catch (err) {
        return { error: friendlyGeminiError(err, "interview.start") };
      }
      if (!question) return { error: "AI interviewer returned no question. Try again." };

      const transcript: InterviewTurn[] = [{ role: "assistant", content: question }];

      const { data: inserted, error: insertError } = await supabase
        .from("mock_interviews")
        .insert({
          profile_id: auth.user.id,
          role: data.role,
          mode: data.mode,
          transcript,
          status: "in_progress",
        })
        .select("id")
        .single();
      if (insertError || !inserted)
        return { error: insertError?.message ?? "Could not start the interview." };

      return { error: null, interviewId: inserted.id, question };
    },
  );

export const respondToInterviewFn = createServerFn({ method: "POST" })
  .validator(
    z.object({ interviewId: z.string().uuid(), answer: z.string().trim().min(1).max(4000) }),
  )
  .handler(
    async ({
      data,
    }): Promise<{ error: string | null; question?: string; readyToFinish?: boolean }> => {
      const supabase = getSupabaseServerClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { error: "Not signed in." };

      const { data: interview, error: fetchError } = await supabase
        .from("mock_interviews")
        .select("id, profile_id, role, mode, transcript, status")
        .eq("id", data.interviewId)
        .single();
      if (fetchError || !interview) return { error: "Interview not found." };
      if (interview.profile_id !== auth.user.id) return { error: "Not authorized." };
      if (interview.status !== "in_progress")
        return { error: "This interview has already finished." };

      const transcript = (interview.transcript as unknown as InterviewTurn[]) ?? [];
      transcript.push({ role: "user", content: data.answer });

      const candidateAnswers = transcript.filter((t) => t.role === "user").length;
      const shouldConclude = candidateAnswers >= CANDIDATE_ANSWER_THRESHOLD;

      const geminiResult = getGemini();
      if ("error" in geminiResult) return { error: geminiResult.error };

      const mode = (interview.mode as InterviewMode | null) ?? "technical";
      const model = geminiResult.client.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: personaPrompt(interview.role, mode),
      });

      const followUp = shouldConclude
        ? "The interview is now complete. Write a brief, warm closing remark (2-3 sentences) thanking the candidate and letting them know their feedback is being prepared. Respond with ONLY that closing remark — no preamble, no markdown."
        : "Based on the conversation so far, ask the next interview question. Respond with ONLY the next question text — no preamble, no numbering, no markdown.";

      let nextText: string;
      try {
        const result = await withGeminiRetry(() =>
          model.generateContent(`${transcriptToText(transcript)}\n\n${followUp}`),
        );
        nextText = result.response.text().trim();
      } catch (err) {
        return { error: friendlyGeminiError(err, "interview.respond") };
      }
      if (!nextText) return { error: "AI interviewer returned no response. Try again." };

      transcript.push({ role: "assistant", content: nextText });

      const { error: updateError } = await supabase
        .from("mock_interviews")
        .update({ transcript })
        .eq("id", data.interviewId);
      if (updateError) return { error: updateError.message };

      return { error: null, question: nextText, readyToFinish: shouldConclude };
    },
  );

export const finishInterviewFn = createServerFn({ method: "POST" })
  .validator(z.object({ interviewId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null; feedback?: InterviewFeedback }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: interview, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("id, profile_id, role, mode, transcript, status, feedback, score")
      .eq("id", data.interviewId)
      .single();
    if (fetchError || !interview) return { error: "Interview not found." };
    if (interview.profile_id !== auth.user.id) return { error: "Not authorized." };

    if (interview.status === "completed" && interview.feedback) {
      return { error: null, feedback: interview.feedback as unknown as InterviewFeedback };
    }

    const transcript = (interview.transcript as unknown as InterviewTurn[]) ?? [];
    if (transcript.filter((t) => t.role === "user").length === 0) {
      return { error: "Answer at least one question before finishing." };
    }

    const geminiResult = getGemini();
    if ("error" in geminiResult) return { error: geminiResult.error };

    const mode = (interview.mode as InterviewMode | null) ?? "technical";
    const focusLabel =
      mode === "soft_skills" ? "soft-skills / behavioral" : "technical and behavioral";

    const feedbackPrompt = `You are an expert interview coach. Review this full ${focusLabel} mock interview transcript for a candidate targeting the role of "${interview.role}" and respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "score": number (0-10, a realistic honest overall performance score),
  "summary": string (2-4 sentence overall assessment),
  "strengths": string[] (2-4 concrete strengths shown in the answers),
  "improvements": string[] (2-4 concrete, actionable areas to improve)
}

Base every point strictly on what the candidate actually said — never invent claims they didn't make.

TRANSCRIPT:
"""
${transcriptToText(transcript)}
"""`;

    const model = geminiResult.client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });

    let text: string;
    try {
      const result = await withGeminiRetry(() => model.generateContent(feedbackPrompt));
      text = result.response.text();
    } catch (err) {
      return { error: friendlyGeminiError(err, "interview.finish") };
    }
    if (!text) return { error: "AI feedback generation returned no result. Try again." };

    let feedback: InterviewFeedback;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      feedback = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { error: "Could not parse AI feedback. Try again." };
    }

    const score = Math.max(0, Math.min(10, Math.round(feedback.score ?? 0)));

    // The status transition to 'completed' fires a DB trigger that awards XP
    // and sends a notification automatically — do not duplicate that here.
    const { error: updateError } = await supabase
      .from("mock_interviews")
      .update({
        feedback,
        score,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", data.interviewId);
    if (updateError) return { error: updateError.message };

    return { error: null, feedback: { ...feedback, score } };
  });
