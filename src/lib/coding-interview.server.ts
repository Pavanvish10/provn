import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";
import { runAgainstTestCases } from "@/lib/judge0.server";
import type { ResumeAnalysis } from "@/lib/resume.server";
import { getCompanyProfile } from "@/ai/resume/CompanyProfile";

// Sprint 17: a real, Judge0-graded coding interview — distinct from
// challenges/challenge_submissions (the admin-curated, reusable daily
// practice bank that also gates /apply). Each session's problem is
// generated once by Gemini, grounded in target company/role/difficulty
// and the candidate's real resume/roadmap context, then graded for real
// against Judge0 and evaluated by a second Gemini call across six
// dimensions. Sessions are historical/repeatable, same as
// eligibility_reports and voice_interview_sessions.

export type CodingExample = { input: string; output: string; explanation?: string };
export type CodingTestCase = { input: string; expected_output: string; is_hidden: boolean };

type GeneratedProblem = {
  title: string;
  description: string;
  constraints: string;
  examples: CodingExample[];
  testCases: { input: string; expectedOutput: string; isHidden: boolean }[];
};

type GeneratedEvaluation = {
  correctnessScore: number;
  timeComplexityScore: number;
  spaceComplexityScore: number;
  codeQualityScore: number;
  edgeCaseScore: number;
  optimizationScore: number;
  overallScore: number;
  mistakes: string[];
  betterSolution: string;
  optimizationSuggestions: string[];
  learningResources: string[];
};

function getGemini(): { client: GoogleGenAI } | { error: string } {
  // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable the AI coding interview engine.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return { error: "AI coding interview is not configured yet (missing GEMINI_API_KEY)." };
  return { client: new GoogleGenAI({ apiKey }) };
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "an easy, warm-up-level",
  medium: "a medium, standard-round",
  hard: "a hard, bar-raiser-level",
};

const GENERATE_PROMPT = (params: {
  targetRole: string;
  targetCompany: string | null;
  difficulty: string;
  contextBlock: string;
}) => `You are a technical interviewer at ${params.targetCompany ?? "a top tech company"} writing ${DIFFICULTY_LABEL[params.difficulty] ?? "a"} original coding interview question for a candidate targeting the role of "${params.targetRole}".

${params.contextBlock}

Respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "title": string (short problem title),
  "description": string (full problem statement, plain text, self-contained — a candidate should be able to solve it from this text alone),
  "constraints": string (input size/value constraints, one per line),
  "examples": [ { "input": string, "output": string, "explanation": string } ] (2-3 worked examples),
  "testCases": [
    { "input": string (exact stdin for a program that reads input and prints output), "expectedOutput": string (exact expected stdout), "isHidden": boolean }
  ] (6-8 cases total: the FIRST 2 must have "isHidden": false — simple, matching the given examples, for a "Run sample" check — the rest "isHidden": true and must include edge cases like empty/boundary/large/duplicate inputs appropriate to the problem)
}

The problem must be solvable via a standalone program that reads from stdin and writes to stdout (the format every test case's input/expectedOutput follows). Make it genuinely appropriate for ${params.targetCompany ?? "a top-tier"} company's real interview bar at "${params.difficulty}" difficulty — not generic filler. Ground the topic in the candidate's context above where it makes sense (e.g. favor topics relevant to the target role), but the problem itself must be self-contained and fair to any candidate.`;

const EVALUATE_PROMPT = (params: {
  title: string;
  description: string;
  language: string;
  source: string;
  passed: number;
  total: number;
  stdout: string;
  stderr: string;
}) => `You are a senior technical interviewer grading a candidate's solution to this coding interview question.

PROBLEM: "${params.title}"
"""
${params.description}
"""

CANDIDATE'S SOLUTION (${params.language}), which passed ${params.passed}/${params.total} test cases:
"""
${params.source}
"""

Last run's stdout: """${params.stdout || "(empty)"}"""
Last run's stderr: """${params.stderr || "(empty)"}"""

Respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "correctnessScore": number (0-100, based on the actual test pass rate and logical correctness),
  "timeComplexityScore": number (0-100, how good the solution's actual time complexity is for this problem — 100 is optimal),
  "spaceComplexityScore": number (0-100, how good the solution's actual space complexity is for this problem),
  "codeQualityScore": number (0-100, naming, structure, readability of the actual code),
  "edgeCaseScore": number (0-100, whether the code visibly handles edge cases like empty input, boundaries, duplicates),
  "optimizationScore": number (0-100, how close the approach is to the optimal known approach for this problem),
  "overallScore": number (0-100, holistic weighted assessment),
  "mistakes": string[] (2-5 concrete mistakes or weaknesses in this specific code, empty array if none),
  "betterSolution": string (a concise, correct, well-commented reference solution in ${params.language} that solves the problem optimally — plain text, no markdown fences),
  "optimizationSuggestions": string[] (2-4 concrete ways this exact code could be improved),
  "learningResources": string[] (2-4 specific topics or concepts to study based on the gaps shown here — e.g. "Two-pointer technique for sorted arrays" — plain topic names, not URLs)
}

Score honestly based on the actual code and results above — do not default to high scores, and never invent behavior the code doesn't actually have.`;

function buildCandidateContextBlock(params: {
  candidateSkills: string[];
  resumeAnalysis: ResumeAnalysis | null;
  atsScore: number | null;
  roadmapProgressPercent: number | null;
  companyProfile: ReturnType<typeof getCompanyProfile>;
}): string {
  const parts: string[] = [];
  if (params.companyProfile) {
    parts.push(
      `TARGET COMPANY STYLE: ${params.companyProfile.interviewStyle} Focus areas: ${params.companyProfile.preferredTopics.join(", ")}.`,
    );
  }
  if (params.candidateSkills.length) {
    parts.push(`CANDIDATE SKILLS: ${params.candidateSkills.slice(0, 30).join(", ")}`);
  }
  if (params.atsScore != null) parts.push(`CANDIDATE RESUME ATS SCORE: ${params.atsScore}/100`);
  if (params.roadmapProgressPercent != null) {
    parts.push(`CANDIDATE'S PREP ROADMAP PROGRESS: ${params.roadmapProgressPercent}% complete.`);
  }
  return parts.join("\n\n");
}

export const startCodingInterviewFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      targetRole: z.string().trim().min(2).max(100),
      targetCompany: z.string().trim().max(100).optional(),
      difficulty: z.enum(["easy", "medium", "hard"]),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      error: string | null;
      sessionId?: string;
      title?: string;
      description?: string;
      constraints?: string;
      examples?: CodingExample[];
      sampleTestCases?: { input: string; expected_output: string }[];
    }> => {
      const supabase = getSupabaseServerClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { error: "Not signed in." };

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
        if (total && total > 0)
          roadmapProgressPercent = Math.round(((completed ?? 0) / total) * 100);
      }

      const companyProfile = data.targetCompany ? getCompanyProfile(data.targetCompany) : null;
      const contextBlock = buildCandidateContextBlock({
        candidateSkills,
        resumeAnalysis,
        atsScore: resume?.ats_score ?? null,
        roadmapProgressPercent,
        companyProfile,
      });

      let text: string | undefined;
      try {
        const response = await withGeminiRetry(() =>
          geminiResult.client.models.generateContent({
            model: GEMINI_MODEL,
            contents: GENERATE_PROMPT({
              targetRole: data.targetRole,
              targetCompany: companyProfile?.name ?? data.targetCompany ?? null,
              difficulty: data.difficulty,
              contextBlock,
            }),
            config: { responseMimeType: "application/json" },
          }),
        );
        text = response.text;
      } catch (err) {
        return { error: friendlyGeminiError(err, "coding_interview.generate") };
      }
      if (!text) return { error: "AI question generation returned no result. Try again." };

      let generated: GeneratedProblem;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        generated = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        return { error: "Could not parse the generated question. Try again." };
      }
      if (!generated?.testCases?.length) {
        return { error: "The generated question had no test cases. Try again." };
      }

      const testCases: CodingTestCase[] = generated.testCases.map((tc) => ({
        input: tc.input,
        expected_output: tc.expectedOutput,
        is_hidden: tc.isHidden,
      }));
      const sampleTestCases = testCases.filter((tc) => !tc.is_hidden);

      const { data: inserted, error: insertError } = await supabase
        .from("coding_interview_sessions")
        .insert({
          profile_id: auth.user.id,
          target_company: companyProfile?.name ?? data.targetCompany ?? null,
          target_role: data.targetRole,
          difficulty: data.difficulty,
          title: generated.title,
          description: generated.description,
          constraints: generated.constraints ?? null,
          examples: generated.examples ?? [],
          test_cases: testCases,
          sample_test_cases: sampleTestCases,
          status: "in_progress",
          resume_id: resume?.id ?? null,
          career_roadmap_id: activeRoadmap?.id ?? null,
          roadmap_progress_percent: roadmapProgressPercent,
          ats_score: resume?.ats_score ?? null,
        })
        .select("id")
        .single();
      if (insertError || !inserted)
        return { error: insertError?.message ?? "Could not save the coding interview session." };

      return {
        error: null,
        sessionId: inserted.id,
        title: generated.title,
        description: generated.description,
        constraints: generated.constraints,
        examples: generated.examples ?? [],
        sampleTestCases: testCases.filter((tc) => !tc.is_hidden),
      };
    },
  );

export const runCodingInterviewSampleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({ sessionId: z.string().uuid(), judge0Id: z.number(), source: z.string().min(1) }),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      error: string | null;
      passed?: number;
      total?: number;
      stdout?: string;
      stderr?: string;
    }> => {
      const supabase = getSupabaseServerClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { error: "Not signed in." };

      const { data: session, error: fetchError } = await supabase
        .from("coding_interview_sessions")
        .select("profile_id, test_cases")
        .eq("id", data.sessionId)
        .single();
      if (fetchError || !session) return { error: "Coding interview session not found." };
      if (session.profile_id !== auth.user.id) return { error: "Not authorized." };

      const testCases = (session.test_cases as unknown as CodingTestCase[]) ?? [];
      const sampleCases = testCases.filter((tc) => !tc.is_hidden);
      if (sampleCases.length === 0) return { error: "No sample test cases available." };

      try {
        const { passed, total, stdout, stderr } = await runAgainstTestCases(
          data.judge0Id,
          data.source,
          sampleCases.map((tc) => ({ input: tc.input, expected_output: tc.expected_output })),
        );
        return { error: null, passed, total, stdout, stderr };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Execution failed." };
      }
    },
  );

export const submitCodingInterviewFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionId: z.string().uuid(),
      judge0Id: z.number(),
      language: z.string().min(1),
      source: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: session, error: fetchError } = await supabase
      .from("coding_interview_sessions")
      .select("profile_id, title, description, test_cases, status")
      .eq("id", data.sessionId)
      .single();
    if (fetchError || !session) return { error: "Coding interview session not found." };
    if (session.profile_id !== auth.user.id) return { error: "Not authorized." };
    if (session.status === "evaluated") return { error: "This session has already been graded." };

    const testCases = (session.test_cases as unknown as CodingTestCase[]) ?? [];
    if (testCases.length === 0) return { error: "This session has no test cases configured." };

    let passed = 0;
    const total = testCases.length;
    let stdout = "";
    let stderr = "";
    const start = Date.now();
    try {
      const result = await runAgainstTestCases(
        data.judge0Id,
        data.source,
        testCases.map((tc) => ({ input: tc.input, expected_output: tc.expected_output })),
      );
      passed = result.passed;
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (e) {
      stderr = e instanceof Error ? e.message : "Execution failed.";
    }
    const runtimeMs = Date.now() - start;

    const geminiResult = getGemini();
    if ("error" in geminiResult) {
      // Judge0 grading still succeeded — persist results without AI evaluation
      // rather than discarding a real run because the AI layer is unavailable.
      await supabase
        .from("coding_interview_sessions")
        .update({
          language: data.language,
          source_code: data.source,
          status: "evaluated",
          passed_count: passed,
          total_count: total,
          runtime_ms: runtimeMs,
          stdout: stdout.slice(0, 4000),
          stderr: stderr.slice(0, 4000),
          correctness_score: total > 0 ? Math.round((passed / total) * 100) : 0,
          overall_score: total > 0 ? Math.round((passed / total) * 100) : 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", data.sessionId);
      return { error: geminiResult.error };
    }

    let evalText: string | undefined;
    try {
      const response = await withGeminiRetry(() =>
        geminiResult.client.models.generateContent({
          model: GEMINI_MODEL,
          contents: EVALUATE_PROMPT({
            title: session.title,
            description: session.description,
            language: data.language,
            source: data.source,
            passed,
            total,
            stdout,
            stderr,
          }),
          config: { responseMimeType: "application/json" },
        }),
      );
      evalText = response.text;
    } catch (err) {
      return { error: friendlyGeminiError(err, "coding_interview.evaluate") };
    }

    let evaluation: GeneratedEvaluation | null = null;
    if (evalText) {
      try {
        const jsonMatch = evalText.match(/\{[\s\S]*\}/);
        evaluation = JSON.parse(jsonMatch ? jsonMatch[0] : evalText);
      } catch {
        evaluation = null;
      }
    }

    const clamp = (n: number | undefined) => Math.max(0, Math.min(100, Math.round(n ?? 0)));
    const fallbackScore = total > 0 ? Math.round((passed / total) * 100) : 0;

    const { error: updateError } = await supabase
      .from("coding_interview_sessions")
      .update({
        language: data.language,
        source_code: data.source,
        status: "evaluated",
        passed_count: passed,
        total_count: total,
        runtime_ms: runtimeMs,
        stdout: stdout.slice(0, 4000),
        stderr: stderr.slice(0, 4000),
        correctness_score: evaluation ? clamp(evaluation.correctnessScore) : fallbackScore,
        time_complexity_score: evaluation ? clamp(evaluation.timeComplexityScore) : null,
        space_complexity_score: evaluation ? clamp(evaluation.spaceComplexityScore) : null,
        code_quality_score: evaluation ? clamp(evaluation.codeQualityScore) : null,
        edge_case_score: evaluation ? clamp(evaluation.edgeCaseScore) : null,
        optimization_score: evaluation ? clamp(evaluation.optimizationScore) : null,
        overall_score: evaluation ? clamp(evaluation.overallScore) : fallbackScore,
        mistakes: evaluation?.mistakes ?? [],
        better_solution: evaluation?.betterSolution ?? null,
        optimization_suggestions: evaluation?.optimizationSuggestions ?? [],
        learning_resources: evaluation?.learningResources ?? [],
        completed_at: new Date().toISOString(),
      })
      .eq("id", data.sessionId);
    if (updateError) return { error: updateError.message };

    return { error: null };
  });
