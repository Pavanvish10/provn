import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit.server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";

export type GeneratedChallengeDraft = {
  title: string;
  description: string;
  constraints: string | null;
  input_format: string | null;
  output_format: string | null;
  tags: string[];
  company_tags: string[];
  hints: string[];
  editorial: string;
  starter_code: Record<string, string>;
  test_cases: { input: string; expected_output: string; is_hidden: boolean }[];
};

/** Scales the question bank beyond what a one-shot hand-written seed can
 * cover (see supabase/migrations/20260730000300_daily_challenges_v3_seed.sql).
 * Admin-only: generates ONE draft for review — nothing is saved until the
 * admin explicitly approves it via saveGeneratedChallengeFn-equivalent
 * client insert (see admin.challenges.tsx "Generate with AI" panel). */
export const generateChallengeDraftFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      categoryName: z.string().trim().min(1),
      difficulty: z.enum(["easy", "medium", "hard"]),
      questionFormat: z.enum(["coding", "theory"]),
    }),
  )
  .handler(async ({ data }): Promise<{ error: string | null; draft?: GeneratedChallengeDraft }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return { error: "Admin access required." };
    if (!(await checkRateLimit(`ai:challenge-draft:${auth.user.id}`, 20, 600))) {
      return { error: RATE_LIMIT_MESSAGE };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { error: "AI question generation is not configured yet (missing GEMINI_API_KEY)." };
    }

    const prompt =
      data.questionFormat === "coding"
        ? codingPrompt(data.categoryName, data.difficulty)
        : theoryPrompt(data.categoryName, data.difficulty);

    const ai = new GoogleGenAI({ apiKey });

    let text: string | undefined;
    try {
      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: { responseMimeType: "application/json" },
        }),
      );
      text = response.text;
    } catch (err) {
      return { error: friendlyGeminiError(err, "challenge.generate") };
    }
    if (!text) return { error: "AI generation returned no result. Try again." };

    let draft: GeneratedChallengeDraft;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      draft = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { error: "Could not parse the generated question. Try again." };
    }

    if (data.questionFormat === "theory") {
      draft.starter_code = {};
      draft.test_cases = [];
    }

    return { error: null, draft };
  });

function codingPrompt(category: string, difficulty: string) {
  return `You are writing an original, realistic technical interview coding question for a "${category}" (difficulty: ${difficulty}) practice bank. Do NOT copy questions from LeetCode, HackerRank, Codeforces, or any other platform — write something original in the same spirit.

Respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "title": string,
  "description": string (the full problem statement, including 1-2 worked examples inline as plain text, e.g. "Example 1:\\nInput: ...\\nOutput: ..."),
  "constraints": string (input size bounds, edge cases to consider),
  "input_format": string (brief description of the input),
  "output_format": string (brief description of the expected output),
  "tags": string[] (3-5 relevant technical tags),
  "company_tags": string[] (2-4 realistic companies that would plausibly ask this in an interview),
  "hints": string[] (3 progressive hints, from vague to specific, without giving away the full solution),
  "editorial": string (a full worked explanation of the correct approach with a short code snippet, revealed only after the user solves it),
  "starter_code": { "javascript": string, "python": string } (a minimal function/class signature with a comment placeholder, no implementation),
  "test_cases": [ { "input": string, "expected_output": string, "is_hidden": boolean } ] (produce exactly 4: 2 with is_hidden=false covering the examples, 2 with is_hidden=true covering edge cases)
}

Be precise, realistic, and interview-quality. Never invent a category-inappropriate question.`;
}

function theoryPrompt(category: string, difficulty: string) {
  return `You are writing an original conceptual/theory interview question for a "${category}" (difficulty: ${difficulty}) practice bank (this is NOT a coding problem — no code execution, just explanation-based). Do NOT copy content verbatim from any textbook or platform — write an original question in the same spirit.

Respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "title": string,
  "description": string (the full question text — for MCQ-style aptitude questions, include the options inline as plain text),
  "tags": string[] (2-4 relevant tags),
  "company_tags": string[] (2-4 realistic companies/contexts where this kind of question appears, e.g. "TCS NQT", "Infosys", "Amazon"),
  "hints": string[] (3 progressive hints toward the reasoning, without giving away the full answer),
  "editorial": string (the full correct answer with a clear explanation of the reasoning)
}

Be precise, realistic, and interview-quality.`;
}
