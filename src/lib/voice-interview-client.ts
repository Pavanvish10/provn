import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import {
  startVoiceInterviewFn,
  respondToVoiceInterviewFn,
  finishVoiceInterviewFn,
  abandonVoiceInterviewFn,
  deleteVoiceInterviewFn,
} from "@/lib/voice-interview.server";

export type VoiceInterviewSession = Database["public"]["Tables"]["voice_interview_sessions"]["Row"];

export function useStartVoiceInterview() {
  return useMutation({
    mutationFn: (vars: {
      interviewType: "hr" | "technical" | "manager" | "startup" | "faang";
      company?: string;
      role: string;
      difficulty: "easy" | "medium" | "hard";
      durationMinutes: 15 | 30 | 45 | 60;
      language: "english" | "hindi" | "hinglish";
      voiceGender: "male" | "female";
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
