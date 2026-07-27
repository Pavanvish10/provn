import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

const PISTON_BASE = "https://emkc.org/api/v2/piston";

type PistonRuntime = { language: string; version: string; aliases: string[] };
type PistonExecuteResult = {
  run: { stdout: string; stderr: string; code: number; signal: string | null };
  compile?: { stdout: string; stderr: string; code: number };
};

let runtimesCache: { at: number; runtimes: PistonRuntime[] } | null = null;

async function getRuntimes(): Promise<PistonRuntime[]> {
  if (runtimesCache && Date.now() - runtimesCache.at < 10 * 60 * 1000) {
    return runtimesCache.runtimes;
  }
  const res = await fetch(`${PISTON_BASE}/runtimes`);
  if (!res.ok) throw new Error("Could not reach the code execution service.");
  const runtimes = (await res.json()) as PistonRuntime[];
  runtimesCache = { at: Date.now(), runtimes };
  return runtimes;
}

export const getSupportedLanguagesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ language: string; version: string }[]> => {
    const runtimes = await getRuntimes();
    // One entry per language, preferring the newest version already returned last by Piston.
    const byLanguage = new Map<string, string>();
    for (const r of runtimes) byLanguage.set(r.language, r.version);
    return Array.from(byLanguage.entries()).map(([language, version]) => ({ language, version }));
  },
);

async function runOnce(
  language: string,
  version: string,
  source: string,
  stdin: string,
): Promise<PistonExecuteResult> {
  const res = await fetch(`${PISTON_BASE}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language,
      version,
      files: [{ content: source }],
      stdin,
    }),
  });
  if (!res.ok) throw new Error(`Execution service returned ${res.status}`);
  return res.json();
}

type TestCase = { input: string; expected_output: string };

async function runAgainstTestCases(
  language: string,
  version: string,
  source: string,
  cases: TestCase[],
): Promise<{ passed: number; total: number; stdout: string; stderr: string }> {
  let passed = 0;
  let lastStdout = "";
  let lastStderr = "";
  for (const tc of cases) {
    const result = await runOnce(language, version, source, tc.input);
    const stdout = result.run?.stdout ?? "";
    const stderr = result.compile?.stderr || result.run?.stderr || "";
    lastStdout = stdout;
    lastStderr = stderr;
    if (stdout.trim() === tc.expected_output.trim()) passed += 1;
  }
  return { passed, total: cases.length, stdout: lastStdout, stderr: lastStderr };
}

export const runSampleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      challengeId: z.string().uuid(),
      language: z.string().min(1),
      version: z.string().min(1),
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
    if (!cases || cases.length === 0) {
      // No visible samples for this challenge — just run once with empty stdin so
      // the user can still see raw output.
      try {
        const result = await runOnce(data.language, data.version, data.source, "");
        return {
          error: null,
          passed: 0,
          total: 0,
          stdout: result.run?.stdout ?? "",
          stderr: result.compile?.stderr || result.run?.stderr || "",
        };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Execution failed." };
      }
    }

    try {
      const { passed, total, stdout, stderr } = await runAgainstTestCases(
        data.language,
        data.version,
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
      language: z.string().min(1),
      version: z.string().min(1),
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
      const result = await runAgainstTestCases(data.language, data.version, data.source, cases);
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
      })
      .select()
      .single();
    if (insertError) return { error: "Could not record submission." };

    return { error: null, submission };
  });
