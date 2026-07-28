import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { friendlyAnthropicError } from "@/lib/ai.server";

const PASSED_PROMPT = (
  title: string,
  difficulty: string,
  description: string,
  language: string,
  source: string,
) => `You are an encouraging coding mentor. A student just PASSED all test cases for this coding challenge.

Challenge: "${title}" (difficulty: ${difficulty})
Description:
"""
${description}
"""

Their solution (${language}):
"""
${source}
"""

Write a short, encouraging explanation (3-5 sentences, plain text, no markdown headers) covering:
1. A brief note on the time and space complexity of their approach.
2. One concrete idea for how the solution could be improved further (performance, readability, or edge cases).

Keep it warm and specific to their actual code — don't be generic.`;

const FAILED_PROMPT = (
  title: string,
  difficulty: string,
  description: string,
  language: string,
  source: string,
  stdout: string,
  stderr: string,
  passedCount: number,
  totalCount: number,
) => `You are an encouraging coding mentor. A student's submission did NOT pass all test cases for this coding challenge.

Challenge: "${title}" (difficulty: ${difficulty})
Description:
"""
${description}
"""

Their solution (${language}), which passed ${passedCount}/${totalCount} test cases:
"""
${source}
"""

stdout from the last failing run:
"""
${stdout || "(empty)"}
"""

stderr from the last failing run:
"""
${stderr || "(empty)"}
"""

Write a short, encouraging, hint-level explanation (3-5 sentences, plain text, no markdown headers) of what is likely going wrong, based on the code and the output above. Point them toward the bug or misunderstanding without revealing the full corrected solution or writing corrected code for them. Be specific to their actual code, not generic advice.`;

export const explainSubmissionFn = createServerFn({ method: "POST" })
  .validator(z.object({ submissionId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null; explanation?: string }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: submission, error: submissionError } = await supabase
      .from("challenge_submissions")
      .select(
        "id, profile_id, challenge_id, language, source_code, status, stdout, stderr, passed_count, total_count",
      )
      .eq("id", data.submissionId)
      .single();
    if (submissionError || !submission) return { error: "Submission not found." };
    if (submission.profile_id !== auth.user.id) return { error: "Not authorized." };

    // TODO(API_KEY): set ANTHROPIC_API_KEY in the environment to enable AI submission explanations.
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { error: "AI explanation isn't configured yet (missing ANTHROPIC_API_KEY)." };
    }

    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .select("title, description, difficulty")
      .eq("id", submission.challenge_id)
      .single();
    if (challengeError || !challenge) return { error: "Challenge not found." };

    const passed = submission.status === "passed";
    const prompt = passed
      ? PASSED_PROMPT(
          challenge.title,
          challenge.difficulty,
          challenge.description,
          submission.language,
          submission.source_code,
        )
      : FAILED_PROMPT(
          challenge.title,
          challenge.difficulty,
          challenge.description,
          submission.language,
          submission.source_code,
          submission.stdout ?? "",
          submission.stderr ?? "",
          submission.passed_count,
          submission.total_count,
        );

    const anthropic = new Anthropic({ apiKey });
    let message: Anthropic.Messages.Message;
    try {
      message = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (err) {
      return { error: friendlyAnthropicError(err) };
    }

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { error: "AI explanation returned no result. Try again." };
    }

    return { error: null, explanation: textBlock.text.trim() };
  });
