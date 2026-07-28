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
  if (!apiKey) throw new Error("Code execution is not configured yet (missing JUDGE0_API_KEY).");
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
  const res = await fetch(`${JUDGE0_BASE}/languages`, { headers: judge0Headers() });
  if (!res.ok) throw new Error(`Judge0 returned ${res.status} listing languages.`);
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

async function runOnce(languageId: number, source: string, stdin: string): Promise<Judge0Result> {
  const res = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`, {
    method: "POST",
    headers: judge0Headers(),
    body: JSON.stringify({ source_code: source, language_id: languageId, stdin }),
  });
  if (!res.ok) throw new Error(`Judge0 execution request failed (${res.status}).`);
  return res.json();
}

type TestCase = { input: string; expected_output: string };

async function runAgainstTestCases(
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
      })
      .select()
      .single();
    if (insertError) return { error: "Could not record submission." };

    return { error: null, submission };
  });
