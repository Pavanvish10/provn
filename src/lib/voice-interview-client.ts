import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import {
  startVoiceInterviewFn,
  respondToVoiceInterviewFn,
  finishVoiceInterviewFn,
  abandonVoiceInterviewFn,
  deleteVoiceInterviewFn,
  type VoiceInterviewQA,
  type Difficulty,
  type Language,
  type VoiceGender,
  type InterviewType as VoiceApiInterviewType,
} from "@/lib/voice-interview.server";
import { normalizeInterviewType } from "@/ai/InterviewContext";
import { CATEGORY_LABELS } from "@/ai/evaluation/EvaluationModels";
import type {
  CategoryScore,
  EvaluationCategory,
  EvaluationReport,
  EvaluationSnapshot,
  HiringRecommendation,
} from "@/ai/evaluation/EvaluationTypes";
import type { JobAnalysisResult } from "@/services/job/JobAnalysisEngine";

export type VoiceInterviewSession = Database["public"]["Tables"]["voice_interview_sessions"]["Row"];

// Shared setup-value -> voice-interview-API-value mapping, used by both
// ConversationManager (voice mode, via the realtime pipeline) and
// TextInterviewRoom (text mode, calling these functions directly) so the
// same free-form wizard values ("Manager", "Easy", "Hindi", "Male", ...)
// always map onto the API's lowercase enums the same way in both modes.
export function toVoiceInterviewType(raw: string): VoiceApiInterviewType {
  const normalized = normalizeInterviewType(raw);
  return normalized === "managerial" ? "manager" : normalized;
}

export function toApiDifficulty(raw: string | undefined): Difficulty {
  const value = (raw ?? "medium").toLowerCase();
  return value === "easy" || value === "hard" ? value : "medium";
}

export function toApiLanguage(raw: string | undefined): Language {
  const value = (raw ?? "english").toLowerCase();
  return value === "hindi" || value === "hinglish" ? value : "english";
}

export function toApiVoiceGender(raw: string | undefined): VoiceGender {
  return (raw ?? "").toLowerCase() === "male" ? "male" : "female";
}

export function toApiDuration(raw: number | undefined): 15 | 30 | 45 | 60 {
  return raw === 15 || raw === 45 || raw === 60 ? raw : 30;
}

/** Sprint 14: pulls the Job Description page's analysis (Sprint 12) into
 * the shape startVoiceInterviewFn wants — used by both room.tsx (voice)
 * and TextInterviewRoom (text) so a completed job analysis grounds the
 * interview's questions the same way in either mode. */
export function buildInterviewContextFromJobAnalysis(jobAnalysis: JobAnalysisResult | null): {
  jobDescriptionText: string | null;
  targetSkills: string[] | null;
} {
  if (!jobAnalysis) return { jobDescriptionText: null, targetSkills: null };
  const { jobDescription } = jobAnalysis;
  const textParts = [
    jobDescription.responsibilities.length
      ? `Responsibilities: ${jobDescription.responsibilities.join("; ")}`
      : null,
    jobDescription.experienceRequirement
      ? `Experience: ${jobDescription.experienceRequirement}`
      : null,
  ].filter((part): part is string => !!part);
  const targetSkills = jobDescription.requiredSkills.length
    ? jobDescription.requiredSkills
    : jobDescription.technologies;
  return {
    jobDescriptionText: textParts.length ? textParts.join("\n") : null,
    targetSkills: targetSkills.length ? targetSkills : null,
  };
}

export function useStartVoiceInterview() {
  return useMutation({
    mutationFn: (vars: {
      interviewType: VoiceApiInterviewType;
      company?: string;
      role: string;
      difficulty: "easy" | "medium" | "hard";
      durationMinutes: 15 | 30 | 45 | 60;
      language: "english" | "hindi" | "hinglish";
      voiceGender: "male" | "female";
      jobDescriptionText?: string;
      targetSkills?: string[];
    }) => startVoiceInterviewFn({ data: vars }),
  });
}

export function useRespondToVoiceInterview() {
  return useMutation({
    mutationFn: (vars: { sessionId: string; answer: string }) =>
      respondToVoiceInterviewFn({ data: vars }),
  });
}

export function useFinishVoiceInterview(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { sessionId: string }) => finishVoiceInterviewFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-interview-history", profileId] });
      queryClient.invalidateQueries({ queryKey: ["voice-interview-stats", profileId] });
    },
  });
}

export function useAbandonVoiceInterview() {
  return useMutation({
    mutationFn: (vars: { sessionId: string }) => abandonVoiceInterviewFn({ data: vars }),
  });
}

export function useDeleteVoiceInterview(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { sessionId: string }) => deleteVoiceInterviewFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-interview-history", profileId] });
      queryClient.invalidateQueries({ queryKey: ["voice-interview-stats", profileId] });
    },
  });
}

export function useVoiceInterviewSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["voice-interview-session", sessionId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("voice_interview_sessions")
        .select("*")
        .eq("id", sessionId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useMyVoiceInterviewHistory(profileId: string | undefined) {
  return useQuery({
    queryKey: ["voice-interview-history", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("voice_interview_sessions")
        .select("*")
        .eq("profile_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export type VoiceInterviewStats = {
  totalInterviews: number;
  averageScore: number | null;
  recent: VoiceInterviewSession[];
};

// Sprint 14: maps a real `voice_interview_sessions` row's named score
// columns onto `EvaluationReport`'s `CategoryScore[]` shape, so
// `/interview/report`'s existing cards (ScoreBreakdown, StrengthCard,
// WeaknessCard, PerformanceTimeline...) can keep rendering the same
// `EvaluationReport` contract they always have — only the data source
// changes, from the local EvaluationEngine/DUMMY_EVALUATION_TURNS to a
// real, persisted, Gemini-scored session. There's no `vocabulary`/
// `fluency`/`listening` here (Sprint 14's report doesn't score those
// dimensions) — those three categories just never appear. The
// teamwork/adaptability/cultureFit entries (Sprint 18) are only ever
// non-null for hr/behavioral/manager sessions — flatMap in
// adaptVoiceInterviewReport already drops any null entry, so they simply
// don't appear on technical/startup/faang reports.
const SESSION_CATEGORY_MAP: { key: keyof VoiceInterviewSession; category: EvaluationCategory }[] = [
  { key: "communication_score", category: "communication" },
  { key: "confidence_score", category: "confidence" },
  { key: "grammar_score", category: "grammar" },
  { key: "technical_score", category: "technicalKnowledge" },
  { key: "leadership_score", category: "leadership" },
  { key: "problem_solving_score", category: "problemSolving" },
  { key: "professionalism_score", category: "professionalism" },
  { key: "teamwork_score", category: "teamwork" },
  { key: "adaptability_score", category: "adaptability" },
  { key: "culture_fit_score", category: "cultureFit" },
];

function categoryRationale(category: EvaluationCategory, score: number): string {
  const label = CATEGORY_LABELS[category];
  if (score >= 75) return `Strong ${label.toLowerCase()} throughout the interview.`;
  if (score >= 50) return `Solid ${label.toLowerCase()}, with room to sharpen further.`;
  return `${label} needs focused practice before your next interview.`;
}

const HIRING_RECOMMENDATIONS = new Set<HiringRecommendation>([
  "Strong Hire",
  "Hire",
  "Leaning Hire",
  "Leaning No Hire",
  "No Hire",
]);

export function adaptVoiceInterviewReport(session: VoiceInterviewSession): EvaluationReport {
  const categoryScores: CategoryScore[] = SESSION_CATEGORY_MAP.flatMap(({ key, category }) => {
    const score = session[key] as number | null;
    if (score == null) return [];
    return [{ category, score, rationale: categoryRationale(category, score) }];
  });

  const questions = (session.questions as unknown as VoiceInterviewQA[]) ?? [];
  const timeline: EvaluationSnapshot[] = questions
    .filter((q) => q.answer && q.score != null)
    .map((q, index) => ({
      turnIndex: index,
      timestamp: q.answeredAt ? new Date(q.answeredAt).getTime() : Date.now(),
      categoryScores: [],
      overallScore: q.score ?? 0,
    }));

  const recommendation = HIRING_RECOMMENDATIONS.has(
    session.hiring_recommendation as HiringRecommendation,
  )
    ? (session.hiring_recommendation as HiringRecommendation)
    : "Leaning Hire";

  return {
    overallScore: session.overall_score ?? 0,
    categoryScores,
    strengths: session.strengths ?? [],
    weaknesses: session.weaknesses ?? [],
    improvementAreas: session.improvement_plan ?? [],
    aiNotes: session.summary ? [session.summary] : [],
    hiringRecommendation: recommendation,
    timeline,
  };
}

export function useMyVoiceInterviewStats(profileId: string | undefined) {
  return useQuery({
    queryKey: ["voice-interview-stats", profileId],
    queryFn: async (): Promise<VoiceInterviewStats> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("voice_interview_sessions")
        .select("*")
        .eq("profile_id", profileId!)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const scored = rows.filter((r) => r.overall_score != null);
      const averageScore =
        scored.length > 0
          ? Math.round(scored.reduce((sum, r) => sum + (r.overall_score ?? 0), 0) / scored.length)
          : null;
      return { totalInterviews: rows.length, averageScore, recent: rows.slice(0, 3) };
    },
    enabled: !!profileId,
  });
}
