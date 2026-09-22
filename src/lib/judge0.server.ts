import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

const JUDGE0_BASE = "https://judge0-ce.p.rapidapi.com";
const JUDGE0_HOST = "judge0-ce.p.rapidapi.com";

type Judge0Language = { id: number; name: string };
type Judge0Result = {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
};

function judge0Headers(): HeadersInit {
  // TODO(API_KEY): set JUDGE0_API_KEY (RapidAPI "Judge0 CE") in the environment to enable
  // real code execution (Run/Submit on the challenge workspace, sample runs, language list).
  const apiKey = process.env.JUDGE0_API_KEY;
  if (!apiKey) {
    console.error("[judge0] JUDGE0_API_KEY is not set in this environment.");
    throw new Error("Code execution is not configured yet (missing JUDGE0_API_KEY).");
  }
  return {
    "Content-Type": "application/json",
    "X-RapidAPI-Key": apiKey,
    "X-RapidAPI-Host": JUDGE0_HOST,
  };
}

let languagesCache: { at: number; languages: Judge0Language[] } | null = null;

async function getLanguages(): Promise<Judge0Language[]> {
  if (languagesCache && Date.now() - languagesCache.at < 30 * 60 * 1000) {
    return languagesCache.languages;
  }
  let res: Response;
  try {
    res = await fetch(`${JUDGE0_BASE}/languages`, {
      headers: judge0Headers(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.error("[judge0] /languages request failed or timed out:", err);
    throw new Error("Judge0 did not respond in time listing languages.");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(
      `[judge0] /languages failed: ${res.status} ${res.statusText} :: ${body.slice(0, 500)}`,
    );
    throw new Error(`Judge0 returned ${res.status} listing languages.`);
  }
  const languages = (await res.json()) as Judge0Language[];
  languagesCache = { at: Date.now(), languages };
  return languages;
}

// A friendly, curated subset — Judge0 lists 60+ near-duplicate versions per
// language, which is noisy for a language picker.
const PREFERRED_NAME_MATCH: Record<string, RegExp> = {
  javascript: /Node\.js/i,
  typescript: /^TypeScript/i,
  python: /^Python \(3/i,
  java: /^Java \(/i,
  cpp: /^C\+\+ \(GCC 1[0-9]/i,
  c: /^C \(GCC 1[0-9]/i,
  go: /^Go \(/i,
  ruby: /^Ruby \(/i,
  rust: /^Rust \(/i,
  bash: /^Bash \(/i,
  sql: /^SQLite/i,
};

export const getSupportedLanguagesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ language: string; version: string; judge0Id: number }[]> => {
    const languages = await getLanguages();
    const picked: { language: string; version: string; judge0Id: number }[] = [];
    for (const [key, pattern] of Object.entries(PREFERRED_NAME_MATCH)) {
      const match = languages.find((l) => pattern.test(l.name));
      if (match) picked.push({ language: key, version: match.name, judge0Id: match.id });
    }
    return picked;
  },
);

// Exported so other real-execution features (e.g. the Sprint 17 AI coding
// interview engine) can run candidate code against dynamically generated
// test cases through the same Judge0 REST plumbing/headers/error handling,
// instead of re-implementing the fetch calls against a second table shape.
export async function runOnce(
  languageId: number,
  source: string,
  stdin: string,
): Promise<Judge0Result> {
  let res: Response;
  try {
    res = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers: judge0Headers(),
      body: JSON.stringify({ source_code: source, language_id: languageId, stdin }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    console.error("[judge0] execution request failed or timed out:", err);
    throw new Error("Judge0 did not respond in time running this code.");
  }
  if (!res.ok) throw new Error(`Judge0 execution request failed (${res.status}).`);
  return res.json();
}

export type TestCase = { input: string; expected_output: string };

export async function runAgainstTestCases(
  languageId: number,
  source: string,
  cases: TestCase[],
): Promise<{ passed: number; total: number; stdout: string; stderr: string }> {
  let passed = 0;
  let lastStdout = "";
  let lastStderr = "";
  for (const tc of cases) {
    const result = await runOnce(languageId, source, tc.input);
    const stdout = result.stdout ?? "";
    const stderr =
      result.compile_output ||
      result.stderr ||
      (result.status.id > 3 ? result.status.description : "");
    lastStdout = stdout;
    lastStderr = stderr;
    if (result.status.id === 3 && stdout.trim() === tc.expected_output.trim()) passed += 1;
  }
  return { passed, total: cases.length, stdout: lastStdout, stderr: lastStderr };
}

export const runSampleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      challengeId: z.string().uuid(),
      judge0Id: z.number(),
      source: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: cases, error } = await supabase
      .from("challenge_test_cases")
      .select("input, expected_output")
      .eq("challenge_id", data.challengeId)
      .eq("is_hidden", false)
      .limit(3);
    if (error) return { error: "Could not load sample tests." };

    try {
      if (!cases || cases.length === 0) {
        const result = await runOnce(data.judge0Id, data.source, "");
        return {
          error: null,
          passed: 0,
          total: 0,
          stdout: result.stdout ?? "",
          stderr: result.compile_output || result.stderr || "",
        };
      }
      const { passed, total, stdout, stderr } = await runAgainstTestCases(
        data.judge0Id,
        data.source,
        cases,
      );
      return { error: null, passed, total, stdout, stderr };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Execution failed." };
    }
  });

export const submitChallengeFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      challengeId: z.string().uuid(),
      judge0Id: z.number(),
      language: z.string().min(1),
      source: z.string().min(1),
      timeTakenSeconds: z.number().int().min(0).optional(),
      hintUsed: z.boolean().optional(),
      // The user's own local calendar date (YYYY-MM-DD), used to bucket
      // "solved today" / streak day-boundaries by the user's local
      // timezone rather than the server's. See the streak-system
      // migration for why this is trusted from the client rather than
      // derived server-side.
      localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: cases, error } = await supabase
      .from("challenge_test_cases")
      .select("input, expected_output")
      .eq("challenge_id", data.challengeId);
    if (error || !cases || cases.length === 0) {
      return { error: "This challenge has no test cases configured yet." };
    }

    let passed = 0;
    const total = cases.length;
    let stdout = "";
    let stderr = "";
    let status: "passed" | "failed" | "error" = "passed";
    const start = Date.now();
    try {
      const result = await runAgainstTestCases(data.judge0Id, data.source, cases);
      passed = result.passed;
      stdout = result.stdout;
      stderr = result.stderr;
      status = passed === total ? "passed" : "failed";
    } catch (e) {
      status = "error";
      stderr = e instanceof Error ? e.message : "Execution failed.";
    }
    const runtimeMs = Date.now() - start;

    const { data: submission, error: insertError } = await supabase
      .from("challenge_submissions")
      .insert({
        challenge_id: data.challengeId,
        profile_id: auth.user.id,
        language: data.language,
        source_code: data.source,
        status,
        passed_count: passed,
        total_count: total,
        runtime_ms: runtimeMs,
        stdout: stdout.slice(0, 4000),
        stderr: stderr.slice(0, 4000),
        time_taken_seconds: data.timeTakenSeconds ?? null,
        hint_used: data.hintUsed ?? false,
        local_date: data.localDate,
      })
      .select()
      .single();
    if (insertError) return { error: "Could not record submission." };

    // The insert above already ran the daily-streak trigger synchronously
    // (Postgres AFTER triggers fire within the same statement), so this
    // read reflects its result. solvedToday landing on exactly 2 is what
    // distinguishes "this submission is the one that completed today's
    // goal" from an already-met goal (would be 3+) or a duplicate/failed
    // submission (would still be whatever it was before, or unaffected).
    const { data: progressRows } = await supabase.rpc("get_my_daily_progress", {
      p_local_date: data.localDate,
    });
    const progress = progressRows?.[0];
    const dailyProgress = progress
      ? {
          solvedToday: progress.solved_today,
          currentStreak: progress.current_streak,
          highestStreak: progress.highest_streak,
          totalSolved: progress.total_solved,
        }
      : null;
    const streakJustIncreased = status === "passed" && progress?.solved_today === 2;

    return { error: null, submission, dailyProgress, streakJustIncreased };
  });
