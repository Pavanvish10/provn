import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type InterviewTurn = { role: "assistant" | "user"; content: string };

export type InterviewFeedback = {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
};

const CANDIDATE_ANSWER_THRESHOLD = 5;

function personaPrompt(role: string) {
  return `You are conducting a professional mock interview for a candidate targeting the role of "${role}". Ask thoughtful, role-relevant interview questions one at a time, mixing technical and behavioral questions appropriate for the role. Keep each question concise (1-3 sentences). Respond with ONLY the question text — no preamble, no numbering, no markdown, no quotation marks.`;
}

function transcriptToText(transcript: InterviewTurn[]) {
  return transcript
    .map((t) => `${t.role === "assistant" ? "Interviewer" : "Candidate"}: ${t.content}`)
    .join("\n\n");
}

function getAnthropic(): { client: Anthropic } | { error: string } {
  // TODO(API_KEY): set ANTHROPIC_API_KEY in the environment to enable AI mock interviews.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return { error: "AI mock interviews are not configured yet (missing ANTHROPIC_API_KEY)." };
  return { client: new Anthropic({ apiKey }) };
}

function firstText(message: Anthropic.Messages.Message): string | null {
  const block = message.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text.trim() : null;
}

export const startMockInterviewFn = createServerFn({ method: "POST" })
  .validator(z.object({ role: z.string().trim().min(1).max(80) }))
  .handler(
    async ({
      data,
    }): Promise<{ error: string | null; interviewId?: string; question?: string }> => {
      const supabase = getSupabaseServerClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { error: "Not signed in." };

      const anthropicResult = getAnthropic();
      if ("error" in anthropicResult) return { error: anthropicResult.error };

      const message = await anthropicResult.client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 300,
        system: personaPrompt(data.role),
        messages: [{ role: "user", content: "Begin the interview with your first question." }],
      });
      const question = firstText(message);
      if (!question) return { error: "AI interviewer returned no question. Try again." };

      const transcript: InterviewTurn[] = [{ role: "assistant", content: question }];

      const { data: inserted, error: insertError } = await supabase
        .from("mock_interviews")
        .insert({
          profile_id: auth.user.id,
          role: data.role,
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
        .select("id, profile_id, role, transcript, status")
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

      const anthropicResult = getAnthropic();
      if ("error" in anthropicResult) return { error: anthropicResult.error };

      const followUp = shouldConclude
        ? "The interview is now complete. Write a brief, warm closing remark (2-3 sentences) thanking the candidate and letting them know their feedback is being prepared. Respond with ONLY that closing remark — no preamble, no markdown."
        : "Based on the conversation so far, ask the next interview question. Respond with ONLY the next question text — no preamble, no numbering, no markdown.";

      const message = await anthropicResult.client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 300,
        system: personaPrompt(interview.role),
        messages: [{ role: "user", content: `${transcriptToText(transcript)}\n\n${followUp}` }],
      });
      const nextText = firstText(message);
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
      .select("id, profile_id, role, transcript, status, feedback, score")
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

    const anthropicResult = getAnthropic();
    if ("error" in anthropicResult) return { error: anthropicResult.error };

    const feedbackPrompt = `You are an expert interview coach. Review this full mock interview transcript for a candidate targeting the role of "${interview.role}" and respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

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

    const message = await anthropicResult.client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: feedbackPrompt }],
    });
    const text = firstText(message);
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
