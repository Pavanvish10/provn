import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";
import type { Json } from "@/lib/supabase/types";

// Sprint 23: a read-side aggregation dashboard over data that already
// exists across Sprints 13-22 — coding_interview_sessions,
// voice_interview_sessions, eligibility_reports, resumes, career_roadmaps,
// career_roadmap_tasks, and challenge_submissions. No new interview/score
// tables. The only new table (analytics_snapshots) caches the AI-
// synthesized insights (so Gemini isn't re-called on every page view) and
// backs the public "shareable report link" — it stores a metrics/insights
// snapshot, never raw interview content.

type SupabaseServer = ReturnType<typeof getSupabaseServerClient>;

export type ScoreTrendPoint = { date: string; codingScore: number | null; hrScore: number | null };
export type WeeklyActivityPoint = {
  weekLabel: string;
  weekStart: string;
  codingPractice: number;
  codingInterviews: number;
  hrInterviews: number;
};
export type TopicPerformancePoint = { topic: string; score: number };
export type CompanyReadinessPoint = { company: string; readiness: number };
export type SkillGapTrendPoint = { date: string; skillMatchPercent: number };

export type AnalyticsMetrics = {
  overallInterviewScore: number | null;
  codingScore: number | null;
  hrScore: number | null;
  communicationScore: number | null;
  problemSolvingScore: number | null;
  confidenceScore: number | null;
  atsScore: number | null;
  companyReadinessScore: number | null;
  skillCompletionPercent: number | null;
  roadmapCompletionPercent: number | null;
};

export type AnalyticsCharts = {
  scoreTrend: ScoreTrendPoint[];
  weeklyActivity: WeeklyActivityPoint[];
  topicPerformance: TopicPerformancePoint[];
  companyReadiness: CompanyReadinessPoint[];
  skillGapTrend: SkillGapTrendPoint[];
};

export type AnalyticsAlert = {
  type: "upcoming_mock_interview" | "missed_daily_task" | "low_readiness" | "ats_drop";
  severity: "info" | "warning" | "critical";
  message: string;
};

export type InterviewComparison = {
  label: string;
  current: { date: string; overallScore: number | null } | null;
  previous: { date: string; overallScore: number | null } | null;
  delta: number | null;
};

export type AnalyticsInsights = {
  topStrengths: string[];
  topWeaknesses: string[];
  mostImprovedArea: string;
  highestRiskArea: string;
  recommendedNextAction: string;
  estimatedSuccessProbability: number;
};

export type AnalyticsContext = {
  metrics: AnalyticsMetrics;
  charts: AnalyticsCharts;
  alerts: AnalyticsAlert[];
  comparisons: InterviewComparison[];
  hasAnyData: boolean;
};

export type AnalyticsDashboard = AnalyticsContext & {
  cachedInsights: AnalyticsInsights | null;
  insightsGeneratedAt: string | null;
  isPublic: boolean;
  shareToken: string | null;
};

function mean(values: (number | null | undefined)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  if (!present.length) return null;
  return Math.round(present.reduce((a, b) => a + b, 0) / present.length);
}

function skillMatchPercentFromGap(gap: unknown): number | null {
  const g = gap as { matched?: string[]; missing?: string[] } | null;
  const matched = g?.matched?.length ?? 0;
  const missing = g?.missing?.length ?? 0;
  const total = matched + missing;
  if (!total) return null;
  return Math.round((matched / total) * 100);
}

function weekStartISO(d: Date): string {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

const HR_TYPES = new Set(["hr", "behavioral", "manager"]);

async function computeAnalyticsContext(
  supabase: SupabaseServer,
  profileId: string,
): Promise<AnalyticsContext> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: resumes },
    { data: codingSessions },
    { data: voiceSessions },
    { data: submissions },
    { data: roadmaps },
    { data: eligibilityLatest },
  ] = await Promise.all([
    supabase
      .from("resumes")
      .select("id, ats_score, is_current, version, created_at")
      .eq("profile_id", profileId)
      .order("version", { ascending: false })
      .limit(5),
    supabase
      .from("coding_interview_sessions")
      .select(
        "id, overall_score, correctness_score, optimization_score, code_quality_score, edge_case_score, completed_at",
      )
      .eq("profile_id", profileId)
      .eq("status", "evaluated")
      .gte("completed_at", ninetyDaysAgo)
      .order("completed_at", { ascending: false })
      .limit(50),
    supabase
      .from("voice_interview_sessions")
      .select(
        "id, overall_score, communication_score, confidence_score, technical_score, problem_solving_score, leadership_score, teamwork_score, interview_type, completed_at",
      )
      .eq("profile_id", profileId)
      .eq("status", "completed")
      .gte("completed_at", ninetyDaysAgo)
      .order("completed_at", { ascending: false })
      .limit(50),
    supabase
      .from("challenge_submissions")
      .select("id, created_at")
      .eq("profile_id", profileId)
      .gte("created_at", ninetyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("career_roadmaps")
      .select(
        "id, status, target_company, role_readiness_score, company_readiness_score, hiring_readiness_score, skill_gap, start_date, mock_interview_schedule, created_at",
      )
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("eligibility_reports")
      .select("ats_score, company_eligibility_score, skill_match_percent")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const currentResume = resumes?.find((r) => r.is_current) ?? resumes?.[0] ?? null;
  const previousResume = resumes?.find((r) => r.id !== currentResume?.id) ?? null;

  const latestCoding = codingSessions?.[0] ?? null;
  const previousCoding = codingSessions?.[1] ?? null;

  const hrTypeSessions = (voiceSessions ?? []).filter((s) => HR_TYPES.has(s.interview_type));
  const latestHr = hrTypeSessions[0] ?? null;
  const previousHr = hrTypeSessions[1] ?? null;
  const latestVoiceAny = voiceSessions?.[0] ?? null;

  const activeRoadmap = roadmaps?.find((r) => r.status === "active") ?? null;

  let roadmapTasks: { granularity: string; completed: boolean; task_date: string | null }[] = [];
  if (activeRoadmap) {
    const { data: tasks } = await supabase
      .from("career_roadmap_tasks")
      .select("granularity, completed, task_date")
      .eq("roadmap_id", activeRoadmap.id);
    roadmapTasks = tasks ?? [];
  }

  // ---- Metrics ----
  const codingScore = latestCoding?.overall_score ?? null;
  const hrScore = latestHr?.overall_score ?? null;
  const metrics: AnalyticsMetrics = {
    overallInterviewScore: mean([codingScore, hrScore]),
    codingScore,
    hrScore,
    communicationScore: latestVoiceAny?.communication_score ?? null,
    problemSolvingScore: latestVoiceAny?.problem_solving_score ?? null,
    confidenceScore: latestVoiceAny?.confidence_score ?? null,
    atsScore: currentResume?.ats_score ?? eligibilityLatest?.ats_score ?? null,
    companyReadinessScore:
      activeRoadmap?.company_readiness_score ??
      eligibilityLatest?.company_eligibility_score ??
      null,
    skillCompletionPercent: activeRoadmap
      ? (skillMatchPercentFromGap(activeRoadmap.skill_gap) ??
        eligibilityLatest?.skill_match_percent ??
        null)
      : (eligibilityLatest?.skill_match_percent ?? null),
    roadmapCompletionPercent:
      activeRoadmap && roadmapTasks.length > 0
        ? Math.round((roadmapTasks.filter((t) => t.completed).length / roadmapTasks.length) * 100)
        : null,
  };

  // ---- Charts ----
  const dateMap = new Map<string, { codingScore: number | null; hrScore: number | null }>();
  for (const s of codingSessions ?? []) {
    if (!s.completed_at) continue;
    const day = s.completed_at.slice(0, 10);
    const entry = dateMap.get(day) ?? { codingScore: null, hrScore: null };
    entry.codingScore = s.overall_score ?? entry.codingScore;
    dateMap.set(day, entry);
  }
  for (const s of hrTypeSessions) {
    if (!s.completed_at) continue;
    const day = s.completed_at.slice(0, 10);
    const entry = dateMap.get(day) ?? { codingScore: null, hrScore: null };
    entry.hrScore = s.overall_score ?? entry.hrScore;
    dateMap.set(day, entry);
  }
  const scoreTrend: ScoreTrendPoint[] = Array.from(dateMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const weeklyMap = new Map<
    string,
    { codingPractice: number; codingInterviews: number; hrInterviews: number }
  >();
  const bump = (
    dateStr: string | null,
    key: "codingPractice" | "codingInterviews" | "hrInterviews",
  ) => {
    if (!dateStr) return;
    const week = weekStartISO(new Date(dateStr));
    const entry = weeklyMap.get(week) ?? {
      codingPractice: 0,
      codingInterviews: 0,
      hrInterviews: 0,
    };
    entry[key] += 1;
    weeklyMap.set(week, entry);
  };
  for (const s of submissions ?? []) bump(s.created_at, "codingPractice");
  for (const s of codingSessions ?? []) bump(s.completed_at, "codingInterviews");
  for (const s of voiceSessions ?? []) bump(s.completed_at, "hrInterviews");

  const weeklyActivity: WeeklyActivityPoint[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const weekDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekStart = weekStartISO(weekDate);
    const entry = weeklyMap.get(weekStart) ?? {
      codingPractice: 0,
      codingInterviews: 0,
      hrInterviews: 0,
    };
    const label = new Date(weekStart).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    weeklyActivity.push({ weekLabel: label, weekStart, ...entry });
  }

  const avg = (nums: (number | null | undefined)[]): number | null => mean(nums);
  const topicPerformance: TopicPerformancePoint[] = (
    [
      {
        topic: "Communication",
        score: avg((voiceSessions ?? []).map((s) => s.communication_score)),
      },
      { topic: "Confidence", score: avg((voiceSessions ?? []).map((s) => s.confidence_score)) },
      {
        topic: "Problem Solving",
        score: avg((voiceSessions ?? []).map((s) => s.problem_solving_score)),
      },
      {
        topic: "Technical (HR round)",
        score: avg((voiceSessions ?? []).map((s) => s.technical_score)),
      },
      { topic: "Leadership", score: avg((voiceSessions ?? []).map((s) => s.leadership_score)) },
      { topic: "Teamwork", score: avg((voiceSessions ?? []).map((s) => s.teamwork_score)) },
      { topic: "Correctness", score: avg((codingSessions ?? []).map((s) => s.correctness_score)) },
      {
        topic: "Optimization",
        score: avg((codingSessions ?? []).map((s) => s.optimization_score)),
      },
      {
        topic: "Code Quality",
        score: avg((codingSessions ?? []).map((s) => s.code_quality_score)),
      },
      { topic: "Edge Cases", score: avg((codingSessions ?? []).map((s) => s.edge_case_score)) },
    ] as { topic: string; score: number | null }[]
  ).filter((t): t is TopicPerformancePoint => t.score != null);

  const companyReadinessMap = new Map<string, number>();
  for (const r of roadmaps ?? []) {
    if (!r.target_company || r.company_readiness_score == null) continue;
    if (!companyReadinessMap.has(r.target_company)) {
      companyReadinessMap.set(r.target_company, r.company_readiness_score);
    }
  }
  const companyReadiness: CompanyReadinessPoint[] = Array.from(companyReadinessMap.entries()).map(
    ([company, readiness]) => ({ company, readiness }),
  );

  const skillGapTrend: SkillGapTrendPoint[] = (roadmaps ?? [])
    .slice()
    .reverse()
    .map((r) => ({ date: r.created_at, skillMatchPercent: skillMatchPercentFromGap(r.skill_gap) }))
    .filter((p): p is SkillGapTrendPoint => p.skillMatchPercent != null);

  const charts: AnalyticsCharts = {
    scoreTrend,
    weeklyActivity,
    topicPerformance,
    companyReadiness,
    skillGapTrend,
  };

  // ---- Alerts ----
  const alerts: AnalyticsAlert[] = [];

  if (activeRoadmap) {
    const schedule =
      (activeRoadmap.mock_interview_schedule as unknown as
        { weekNumber: number; type: string; title: string }[] | null) ?? [];
    const startDate = new Date(activeRoadmap.start_date);
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    for (const entry of schedule) {
      const entryDate = new Date(startDate);
      entryDate.setDate(entryDate.getDate() + (entry.weekNumber - 1) * 7);
      // start_date/entryDate are date-only (midnight); compare against the
      // start of today rather than the current instant, so an event
      // scheduled for "today" still counts as upcoming rather than already past.
      if (entryDate >= todayStart && entryDate <= in14) {
        alerts.push({
          type: "upcoming_mock_interview",
          severity: "info",
          message: `${entry.title} scheduled for ${entryDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} (week ${entry.weekNumber}).`,
        });
      }
    }

    const todayStr = now.toISOString().slice(0, 10);
    const missed = roadmapTasks.filter(
      (t) => t.granularity === "daily" && !t.completed && t.task_date && t.task_date < todayStr,
    );
    if (missed.length > 0) {
      alerts.push({
        type: "missed_daily_task",
        severity: "warning",
        message: `${missed.length} daily task${missed.length === 1 ? "" : "s"} overdue in your active roadmap.`,
      });
    }

    const dims: [string, number | null][] = [
      ["Role readiness", activeRoadmap.role_readiness_score],
      ["Company readiness", activeRoadmap.company_readiness_score],
      ["Hiring readiness", activeRoadmap.hiring_readiness_score],
    ];
    for (const [label, score] of dims) {
      if (score != null && score < 50) {
        alerts.push({
          type: "low_readiness",
          severity: "critical",
          message: `${label} is low (${score}%) — focus here next.`,
        });
      }
    }
  }

  if (currentResume?.ats_score != null && previousResume?.ats_score != null) {
    const drop = previousResume.ats_score - currentResume.ats_score;
    if (drop >= 5) {
      alerts.push({
        type: "ats_drop",
        severity: "warning",
        message: `ATS score dropped ${drop} points since your last resume version (${previousResume.ats_score} → ${currentResume.ats_score}).`,
      });
    }
  }

  // ---- Comparisons ----
  const comparisons: InterviewComparison[] = [
    {
      label: "Coding",
      current: latestCoding
        ? { date: latestCoding.completed_at!, overallScore: latestCoding.overall_score }
        : null,
      previous: previousCoding
        ? { date: previousCoding.completed_at!, overallScore: previousCoding.overall_score }
        : null,
      delta:
        latestCoding?.overall_score != null && previousCoding?.overall_score != null
          ? latestCoding.overall_score - previousCoding.overall_score
          : null,
    },
    {
      label: "HR",
      current: latestHr
        ? { date: latestHr.completed_at!, overallScore: latestHr.overall_score }
        : null,
      previous: previousHr
        ? { date: previousHr.completed_at!, overallScore: previousHr.overall_score }
        : null,
      delta:
        latestHr?.overall_score != null && previousHr?.overall_score != null
          ? latestHr.overall_score - previousHr.overall_score
          : null,
    },
  ];

  const hasAnyData = Boolean(
    currentResume ||
    codingSessions?.length ||
    voiceSessions?.length ||
    roadmaps?.length ||
    submissions?.length,
  );

  return { metrics, charts, alerts, comparisons, hasAnyData };
}

function getGemini(): { client: GoogleGenAI } | { error: string } {
  // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable AI analytics insights.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return { error: "AI analytics insights are not configured yet (missing GEMINI_API_KEY)." };
  return { client: new GoogleGenAI({ apiKey }) };
}

const INSIGHTS_PROMPT = (
  summary: string,
) => `You are an expert interview coach reviewing a candidate's consolidated performance analytics.

${summary}

Respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "topStrengths": string[] (exactly 5 items, most significant first, grounded strictly in the data above),
  "topWeaknesses": string[] (exactly 5 items, most significant first, grounded strictly in the data above),
  "mostImprovedArea": string (1 sentence naming the specific metric/dimension that improved most and by how much, or "Not enough historical data yet" if there's no trend to compare),
  "highestRiskArea": string (1 sentence naming the single biggest risk to this candidate's hiring chances right now),
  "recommendedNextAction": string (1-2 sentences, the single most impactful thing to do next),
  "estimatedSuccessProbability": number (0-100, your honest holistic estimate of interview success based strictly on the data above — do not default to high numbers)
}

Be honest and specific, grounded strictly in the real data above — never invent achievements or credentials. If a section says data is missing, say so plainly in your strengths/weaknesses rather than guessing.`;

function buildInsightsSummary(context: AnalyticsContext): string {
  const m = context.metrics;
  const parts: string[] = [];

  parts.push(
    `CONSOLIDATED METRICS (0-100 scale, "n/a" = no data yet):
- Overall interview score: ${m.overallInterviewScore ?? "n/a"}
- Coding score: ${m.codingScore ?? "n/a"}
- HR score: ${m.hrScore ?? "n/a"}
- Communication score: ${m.communicationScore ?? "n/a"}
- Problem solving score: ${m.problemSolvingScore ?? "n/a"}
- Confidence score: ${m.confidenceScore ?? "n/a"}
- ATS score: ${m.atsScore ?? "n/a"}
- Company readiness score: ${m.companyReadinessScore ?? "n/a"}
- Skill completion: ${m.skillCompletionPercent ?? "n/a"}%
- Roadmap completion: ${m.roadmapCompletionPercent ?? "n/a"}%`,
  );

  if (context.charts.topicPerformance.length) {
    parts.push(
      `TOPIC-WISE PERFORMANCE: ${context.charts.topicPerformance.map((t) => `${t.topic} ${t.score}`).join(", ")}`,
    );
  }
  if (context.charts.companyReadiness.length) {
    parts.push(
      `COMPANY-WISE READINESS: ${context.charts.companyReadiness.map((c) => `${c.company} ${c.readiness}%`).join(", ")}`,
    );
  }
  if (context.charts.scoreTrend.length >= 2) {
    const first = context.charts.scoreTrend[0];
    const last = context.charts.scoreTrend[context.charts.scoreTrend.length - 1];
    parts.push(
      `SCORE TREND: earliest recorded point (${first.date}) coding=${first.codingScore ?? "n/a"} hr=${first.hrScore ?? "n/a"}; latest recorded point (${last.date}) coding=${last.codingScore ?? "n/a"} hr=${last.hrScore ?? "n/a"}.`,
    );
  }
  for (const c of context.comparisons) {
    if (c.current) {
      parts.push(
        `${c.label} INTERVIEW COMPARISON: current ${c.current.overallScore ?? "n/a"}, previous ${c.previous?.overallScore ?? "n/a"}, delta ${c.delta ?? "n/a"}.`,
      );
    }
  }
  parts.push(
    context.alerts.length
      ? `ACTIVE ALERTS: ${context.alerts.map((a) => a.message).join(" | ")}`
      : "ACTIVE ALERTS: none.",
  );
  if (!context.hasAnyData) {
    parts.push(
      "NOTE: this candidate has not completed any interviews, resume analysis, or roadmap activity yet — say so plainly rather than guessing.",
    );
  }

  return parts.join("\n\n");
}

export const getAnalyticsDashboardFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ error: string | null; data?: AnalyticsDashboard }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const context = await computeAnalyticsContext(supabase, auth.user.id);

    const { data: snapshot } = await supabase
      .from("analytics_snapshots")
      .select("insights, updated_at, is_public, share_token")
      .eq("profile_id", auth.user.id)
      .maybeSingle();

    const insights = (snapshot?.insights as unknown as AnalyticsInsights | null) ?? null;

    return {
      error: null,
      data: {
        ...context,
        cachedInsights: insights && Object.keys(insights).length ? insights : null,
        insightsGeneratedAt: snapshot?.updated_at ?? null,
        isPublic: snapshot?.is_public ?? false,
        shareToken: snapshot?.share_token ?? null,
      },
    };
  },
);

export const generateAnalyticsInsightsFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ error: string | null; insights?: AnalyticsInsights }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const geminiResult = getGemini();
    if ("error" in geminiResult) return { error: geminiResult.error };

    const context = await computeAnalyticsContext(supabase, auth.user.id);
    const summary = buildInsightsSummary(context);

    let text: string | undefined;
    try {
      const response = await withGeminiRetry(() =>
        geminiResult.client.models.generateContent({
          model: GEMINI_MODEL,
          contents: INSIGHTS_PROMPT(summary),
          config: { responseMimeType: "application/json" },
        }),
      );
      text = response.text;
    } catch (err) {
      return { error: friendlyGeminiError(err, "analytics.generateInsights") };
    }
    if (!text) return { error: "AI analytics insights returned no result. Try again." };

    let generated: Partial<AnalyticsInsights>;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      generated = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { error: "Could not parse the analytics insights. Try again." };
    }

    const clamp = (n: number | undefined) => Math.max(0, Math.min(100, Math.round(n ?? 50)));
    const insights: AnalyticsInsights = {
      topStrengths: (generated.topStrengths ?? []).slice(0, 5),
      topWeaknesses: (generated.topWeaknesses ?? []).slice(0, 5),
      mostImprovedArea: generated.mostImprovedArea ?? "",
      highestRiskArea: generated.highestRiskArea ?? "",
      recommendedNextAction: generated.recommendedNextAction ?? "",
      estimatedSuccessProbability: clamp(generated.estimatedSuccessProbability),
    };

    const { error: upsertError } = await supabase.from("analytics_snapshots").upsert(
      {
        profile_id: auth.user.id,
        metrics: context.metrics as unknown as Json,
        insights: insights as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    );
    if (upsertError) return { error: upsertError.message };

    return { error: null, insights };
  },
);

export const createShareLinkFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ error: string | null; shareToken?: string }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: existing } = await supabase
      .from("analytics_snapshots")
      .select("share_token")
      .eq("profile_id", auth.user.id)
      .maybeSingle();

    const shareToken = existing?.share_token ?? crypto.randomUUID();
    const context = await computeAnalyticsContext(supabase, auth.user.id);

    const { error } = await supabase.from("analytics_snapshots").upsert(
      {
        profile_id: auth.user.id,
        metrics: context.metrics as unknown as Json,
        is_public: true,
        share_token: shareToken,
      },
      { onConflict: "profile_id" },
    );
    if (error) {
      console.error("[analytics] share-link snapshot failed:", error.message);
      return { error: "Could not create a share link." };
    }
    return { error: null, shareToken };
  },
);

export const revokeShareLinkFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ error: string | null }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { error } = await supabase
      .from("analytics_snapshots")
      .update({ is_public: false, share_token: null })
      .eq("profile_id", auth.user.id);
    if (error) {
      console.error("[analytics] revoke share-link failed:", error.message);
      return { error: "Could not revoke the share link." };
    }
    return { error: null };
  },
);

export const getSharedAnalyticsReportFn = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().uuid() }))
  .handler(
    async ({
      data,
    }): Promise<{
      error: string | null;
      report?: {
        metrics: AnalyticsMetrics;
        insights: AnalyticsInsights | null;
        generatedAt: string;
      };
    }> => {
      // Public route — no auth check. Reads through the service-role client
      // so no client-side query against analytics_snapshots is ever needed
      // (and no public RLS policy exists on the table at all): a visitor
      // can only ever reach a row by already knowing its share_token.
      const admin = getSupabaseAdminClient();
      const { data: snapshot } = await admin
        .from("analytics_snapshots")
        .select("metrics, insights, updated_at, is_public")
        .eq("share_token", data.token)
        .eq("is_public", true)
        .maybeSingle();

      if (!snapshot) return { error: "This report link is invalid or has been revoked." };

      const insights = snapshot.insights as unknown as AnalyticsInsights;
      return {
        error: null,
        report: {
          metrics: snapshot.metrics as unknown as AnalyticsMetrics,
          insights: insights && Object.keys(insights).length ? insights : null,
          generatedAt: snapshot.updated_at,
        },
      };
    },
  );
