import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit.server";
import { isFeatureEnabled, FEATURE_DISABLED_MESSAGE } from "@/lib/feature-flags.server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";
import type { ResumeAnalysis } from "@/lib/resume.server";
import { getAnalyticsDashboardFn, type AnalyticsDashboard } from "@/lib/analytics.server";

// Sprint 24: a persisted, multi-conversation AI mentor — distinct from the
// existing global "Provn AI Assistant" widget (ai-chat.server.ts /
// AiChatWidget.tsx), which is a floating, ephemeral, single-thread chatbox
// with no database persistence at all. This reuses that widget's only
// genuinely shared utility (GEMINI_MODEL/friendlyGeminiError/withGeminiRetry
// from ai.server.ts) and its Gemini calling convention (contents[] +
// systemInstruction), but needs its own schema (mentor_conversations/
// mentor_messages) since the widget's design has nowhere to persist to.
//
// Context-awareness reuses Sprint 23's analytics dashboard by calling its
// exported `getAnalyticsDashboardFn` server function directly (in-process,
// no network hop) rather than re-deriving interview-score aggregation a
// second time — the one new context-building function here
// (buildMentorContextBlock) is mentor-specific (conversational tone,
// "recent advice" memory) and not a duplicate of eligibility.server.ts's or
// career-roadmap.server.ts's differently-shaped private buildContextBlocks.

export type MentorWidgets = {
  todaysPriority: string;
  nextInterview: { title: string; date: string; type: string } | null;
  weakestSkill: string | null;
  recommendedProject: string | null;
  estimatedReadiness: number | null;
};

type RoadmapSkillGap = { matched?: string[]; missing?: string[]; priority?: string[] };
type RoadmapProject = { title: string; description: string };
type RoadmapMockInterviewEntry = { weekNumber: number; type: string; title: string };

type MentorProfileContext = {
  fullName: string | null;
  atsScore: number | null;
  resumeSkills: string[];
  activeRoadmap: {
    id: string;
    targetRole: string;
    targetCompany: string | null;
    durationMonths: number;
    startDate: string;
    roleReadiness: number;
    companyReadiness: number;
    hiringReadiness: number;
    skillGap: RoadmapSkillGap;
    recommendedProjects: RoadmapProject[];
    mockInterviewSchedule: RoadmapMockInterviewEntry[];
  } | null;
  todaysTaskTitle: string | null;
  analytics: AnalyticsDashboard | null;
};

async function computeMentorProfileContext(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  profileId: string,
): Promise<MentorProfileContext> {
  const [{ data: profile }, { data: resume }, { data: roadmaps }, analyticsResult] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", profileId).maybeSingle(),
      supabase
        .from("resumes")
        .select("ats_score, analysis")
        .eq("profile_id", profileId)
        .eq("is_current", true)
        .maybeSingle(),
      supabase
        .from("career_roadmaps")
        .select(
          "id, status, target_role, target_company, duration_months, start_date, role_readiness_score, company_readiness_score, hiring_readiness_score, skill_gap, recommended_projects, mock_interview_schedule, created_at",
        )
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(5),
      getAnalyticsDashboardFn(),
    ]);

  const roadmapRow = roadmaps?.find((r) => r.status === "active") ?? null;
  const activeRoadmap = roadmapRow
    ? {
        id: roadmapRow.id,
        targetRole: roadmapRow.target_role,
        targetCompany: roadmapRow.target_company,
        durationMonths: roadmapRow.duration_months,
        startDate: roadmapRow.start_date,
        roleReadiness: roadmapRow.role_readiness_score,
        companyReadiness: roadmapRow.company_readiness_score,
        hiringReadiness: roadmapRow.hiring_readiness_score,
        skillGap: (roadmapRow.skill_gap as unknown as RoadmapSkillGap) ?? {},
        recommendedProjects: (roadmapRow.recommended_projects as unknown as RoadmapProject[]) ?? [],
        mockInterviewSchedule:
          (roadmapRow.mock_interview_schedule as unknown as RoadmapMockInterviewEntry[]) ?? [],
      }
    : null;

  let todaysTaskTitle: string | null = null;
  if (activeRoadmap) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: task } = await supabase
      .from("career_roadmap_tasks")
      .select("title")
      .eq("roadmap_id", activeRoadmap.id)
      .eq("granularity", "daily")
      .eq("task_date", todayStr)
      .eq("completed", false)
      .limit(1)
      .maybeSingle();
    todaysTaskTitle = task?.title ?? null;
  }

  const analysis = (resume?.analysis as unknown as ResumeAnalysis | null) ?? null;
  const resumeSkills = analysis
    ? [...(analysis.skills ?? []), ...(analysis.technologies ?? []), ...(analysis.frameworks ?? [])]
    : [];

  return {
    fullName: profile?.full_name ?? null,
    atsScore: resume?.ats_score ?? null,
    resumeSkills,
    activeRoadmap,
    todaysTaskTitle,
    analytics: !analyticsResult.error ? (analyticsResult.data ?? null) : null,
  };
}

function nextInterviewFromSchedule(
  roadmap: MentorProfileContext["activeRoadmap"],
): { title: string; date: string; type: string } | null {
  if (!roadmap) return null;
  const startDate = new Date(roadmap.startDate);
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  let closest: { title: string; date: Date; type: string } | null = null;
  for (const entry of roadmap.mockInterviewSchedule) {
    const entryDate = new Date(startDate);
    entryDate.setDate(entryDate.getDate() + (entry.weekNumber - 1) * 7);
    if (entryDate >= todayStart && (!closest || entryDate < closest.date)) {
      closest = { title: entry.title, date: entryDate, type: entry.type };
    }
  }
  return closest
    ? { title: closest.title, date: closest.date.toISOString(), type: closest.type }
    : null;
}

function computeWidgets(ctx: MentorProfileContext): MentorWidgets {
  const roadmap = ctx.activeRoadmap;
  const weakestSkill = roadmap?.skillGap.priority?.[0] ?? roadmap?.skillGap.missing?.[0] ?? null;
  const recommendedProject = roadmap?.recommendedProjects[0]?.title ?? null;
  const nextInterview = nextInterviewFromSchedule(roadmap);

  let todaysPriority: string;
  if (ctx.todaysTaskTitle) {
    todaysPriority = ctx.todaysTaskTitle;
  } else if (weakestSkill) {
    todaysPriority = `Strengthen ${weakestSkill} — it's your highest-priority skill gap right now.`;
  } else if (!roadmap) {
    todaysPriority = "Generate a career roadmap to get a personalized daily plan.";
  } else {
    todaysPriority = "Review your roadmap and pick a task to work on today.";
  }

  const estimatedReadiness =
    ctx.analytics?.cachedInsights?.estimatedSuccessProbability ??
    roadmap?.hiringReadiness ??
    ctx.analytics?.metrics.overallInterviewScore ??
    null;

  return { todaysPriority, nextInterview, weakestSkill, recommendedProject, estimatedReadiness };
}

async function getRecentMentorAdvice(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  profileId: string,
  excludeConversationId: string | undefined,
  limit = 5,
): Promise<string[]> {
  let query = supabase
    .from("mentor_conversations")
    .select("id")
    .eq("profile_id", profileId)
    .order("last_message_at", { ascending: false })
    .limit(10);
  if (excludeConversationId) query = query.neq("id", excludeConversationId);
  const { data: convos } = await query;
  const ids = (convos ?? []).map((c) => c.id);
  if (!ids.length) return [];

  const { data: msgs } = await supabase
    .from("mentor_messages")
    .select("content")
    .in("conversation_id", ids)
    .eq("role", "model")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (msgs ?? []).map((m) => m.content);
}

const MENTOR_SYSTEM_PROMPT = (params: {
  fullName: string | null;
  contextBlock: string;
}) => `You are the Provn AI Mentor — a persistent, personal career coach for ${params.fullName || "this student"}.

You provide: career guidance, resume advice, project suggestions, DSA/coding guidance, HR interview coaching, mock-interview follow-up, salary negotiation tips, internship guidance, and startup-vs-product-company guidance. Ground every answer in the candidate context below rather than generic advice — reference their actual scores, skill gaps, target role/company, and roadmap when relevant.

${params.contextBlock}

Keep replies focused and practical (usually 2-5 short paragraphs or a tight bullet list). Be honest about weaknesses — don't just be encouraging when the data says otherwise. Never fabricate specific facts about the candidate that aren't in the context above. Plain text only, no markdown headers.`;

function buildMentorContextBlock(ctx: MentorProfileContext, recentAdvice: string[]): string {
  const parts: string[] = [];
  const roadmap = ctx.activeRoadmap;

  parts.push(
    `ATS score: ${ctx.atsScore ?? "n/a (no resume uploaded yet)"}. Resume skills: ${ctx.resumeSkills.length ? ctx.resumeSkills.slice(0, 30).join(", ") : "none on file"}.`,
  );

  if (roadmap) {
    parts.push(
      `ACTIVE ROADMAP: targeting "${roadmap.targetRole}"${roadmap.targetCompany ? ` at ${roadmap.targetCompany}` : ""}, a ${roadmap.durationMonths}-month plan. Readiness — role ${roadmap.roleReadiness}%, company ${roadmap.companyReadiness}%, hiring ${roadmap.hiringReadiness}%.`,
    );
    const gap = roadmap.skillGap;
    parts.push(
      `Skill gap — matched: ${gap.matched?.join(", ") || "none"}. Missing (priority first): ${[...(gap.priority ?? []), ...(gap.missing ?? []).filter((s) => !gap.priority?.includes(s))].join(", ") || "none"}.`,
    );
    if (roadmap.recommendedProjects.length) {
      parts.push(
        `Recommended projects: ${roadmap.recommendedProjects.map((p) => p.title).join(", ")}.`,
      );
    }
    if (ctx.todaysTaskTitle) parts.push(`Today's roadmap task: ${ctx.todaysTaskTitle}.`);
    const next = nextInterviewFromSchedule(roadmap);
    if (next) {
      parts.push(
        `Next scheduled mock interview: "${next.title}" (${next.type}) on ${new Date(next.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
      );
    }
  } else {
    parts.push(
      "ACTIVE ROADMAP: none yet — encourage generating one at /career-roadmap when relevant.",
    );
  }

  const m = ctx.analytics?.metrics;
  if (m) {
    parts.push(
      `INTERVIEW ANALYTICS — overall ${m.overallInterviewScore ?? "n/a"}, coding ${m.codingScore ?? "n/a"}, HR ${m.hrScore ?? "n/a"}, communication ${m.communicationScore ?? "n/a"}, problem solving ${m.problemSolvingScore ?? "n/a"}, confidence ${m.confidenceScore ?? "n/a"}.`,
    );
  }
  if (ctx.analytics?.alerts.length) {
    parts.push(`ACTIVE ALERTS: ${ctx.analytics.alerts.map((a) => a.message).join(" | ")}`);
  }

  if (recentAdvice.length) {
    parts.push(
      `RECENT MENTOR GUIDANCE YOU'VE ALREADY GIVEN THIS CANDIDATE (build on this, don't repeat it verbatim): ${recentAdvice.map((a, i) => `(${i + 1}) ${a.slice(0, 220)}`).join(" ")}`,
    );
  }

  return parts.join("\n\n");
}

function getGemini(): { client: GoogleGenAI } | { error: string } {
  // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable the AI mentor.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "The AI mentor isn't configured yet (missing GEMINI_API_KEY)." };
  return { client: new GoogleGenAI({ apiKey }) };
}

export const getMentorDashboardFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ error: string | null; widgets?: MentorWidgets }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const ctx = await computeMentorProfileContext(supabase, auth.user.id);
    return { error: null, widgets: computeWidgets(ctx) };
  },
);

export const sendMentorMessageFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      conversationId: z.string().uuid().optional(),
      message: z.string().trim().min(1).max(4000),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{ error: string | null; conversationId?: string; reply?: string }> => {
      const supabase = getSupabaseServerClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { error: "Not signed in." };
      if (!(await checkRateLimit(`ai:mentor:${auth.user.id}`, 20, 600))) {
        return { error: RATE_LIMIT_MESSAGE };
      }
      if (!(await isFeatureEnabled(supabase, "mentor_chat"))) {
        return { error: FEATURE_DISABLED_MESSAGE };
      }

      const geminiResult = getGemini();
      if ("error" in geminiResult) return { error: geminiResult.error };

      let conversationId = data.conversationId;
      if (!conversationId) {
        const { data: created, error: createErr } = await supabase
          .from("mentor_conversations")
          .insert({ profile_id: auth.user.id, title: data.message.slice(0, 60) })
          .select("id")
          .single();
        if (createErr || !created) {
          return { error: createErr?.message ?? "Could not start a new chat." };
        }
        conversationId = created.id;
      }

      const { error: insertUserErr } = await supabase
        .from("mentor_messages")
        .insert({ conversation_id: conversationId, role: "user", content: data.message });
      if (insertUserErr) return { error: insertUserErr.message };

      const [{ data: history }, ctx, recentAdvice] = await Promise.all([
        supabase
          .from("mentor_messages")
          .select("role, content")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(30),
        computeMentorProfileContext(supabase, auth.user.id),
        getRecentMentorAdvice(supabase, auth.user.id, conversationId),
      ]);

      const contents = (history ?? []).map((m) => ({
        role: m.role === "model" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }));

      let text: string | undefined;
      try {
        const response = await withGeminiRetry(() =>
          geminiResult.client.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
              systemInstruction: MENTOR_SYSTEM_PROMPT({
                fullName: ctx.fullName,
                contextBlock: buildMentorContextBlock(ctx, recentAdvice),
              }),
            },
          }),
        );
        text = response.text;
      } catch (err) {
        return { error: friendlyGeminiError(err, "mentor.send"), conversationId };
      }
      if (!text)
        return { error: "The mentor didn't return a response. Try again.", conversationId };

      const reply = text.trim();
      const { error: insertModelErr } = await supabase
        .from("mentor_messages")
        .insert({ conversation_id: conversationId, role: "model", content: reply });
      if (insertModelErr) return { error: insertModelErr.message, conversationId };

      await supabase
        .from("mentor_conversations")
        .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      return { error: null, conversationId, reply };
    },
  );

export const createMentorConversationFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ error: string | null; conversationId?: string }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { data: created, error } = await supabase
      .from("mentor_conversations")
      .insert({ profile_id: auth.user.id, title: "New chat" })
      .select("id")
      .single();
    if (error || !created) return { error: error?.message ?? "Could not start a new chat." };
    return { error: null, conversationId: created.id };
  },
);

export const renameMentorConversationFn = createServerFn({ method: "POST" })
  .validator(
    z.object({ conversationId: z.string().uuid(), title: z.string().trim().min(1).max(80) }),
  )
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { error } = await supabase
      .from("mentor_conversations")
      .update({ title: data.title, updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);
    if (error) {
      console.error("[mentor] rename conversation failed:", error.message);
      return { error: "Could not rename this conversation." };
    }
    return { error: null };
  });

export const deleteMentorConversationFn = createServerFn({ method: "POST" })
  .validator(z.object({ conversationId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { error } = await supabase
      .from("mentor_conversations")
      .delete()
      .eq("id", data.conversationId);
    if (error) {
      console.error("[mentor] delete conversation failed:", error.message);
      return { error: "Could not delete this conversation." };
    }
    return { error: null };
  });

export const togglePinMentorConversationFn = createServerFn({ method: "POST" })
  .validator(z.object({ conversationId: z.string().uuid(), pinned: z.boolean() }))
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const { error } = await supabase
      .from("mentor_conversations")
      .update({ is_pinned: data.pinned, updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);
    if (error) {
      console.error("[mentor] toggle pin failed:", error.message);
      return { error: "Could not update this conversation." };
    }
    return { error: null };
  });
