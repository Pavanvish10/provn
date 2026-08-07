import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { generateCareerRoadmapFn, archiveCareerRoadmapFn } from "@/lib/career-roadmap.server";

export type CareerRoadmap = Database["public"]["Tables"]["career_roadmaps"]["Row"];
export type CareerRoadmapTask = Database["public"]["Tables"]["career_roadmap_tasks"]["Row"];

export type RoadmapPlanItem = { title: string; detail: string };
export type RoadmapProjectItem = { title: string; description: string; skillsPracticed: string[] };
export type RoadmapSkillGap = { matched: string[]; missing: string[]; priority: string[] };
export type RoadmapMockInterviewEntry = {
  weekNumber: number;
  type: "coding" | "hr";
  title: string;
  description: string;
};

export function useMyCareerRoadmap(profileId: string | undefined) {
  return useQuery({
    queryKey: ["career-roadmap", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("career_roadmaps")
        .select("*")
        .eq("profile_id", profileId!)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

// Sprint 22: surfaces roadmap history — archived rows already existed
// (regenerating always archived the prior active roadmap rather than
// deleting it), this just makes them browsable.
export function useCareerRoadmapHistory(profileId: string | undefined) {
  return useQuery({
    queryKey: ["career-roadmap-history", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("career_roadmaps")
        .select("*")
        .eq("profile_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useCareerRoadmapMonthlyTasks(roadmapId: string | undefined) {
  return useQuery({
    queryKey: ["career-roadmap-tasks", roadmapId, "monthly"],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("career_roadmap_tasks")
        .select("*")
        .eq("roadmap_id", roadmapId!)
        .eq("granularity", "monthly")
        .order("period_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roadmapId,
  });
}

export function useCareerRoadmapWeeklyTasks(roadmapId: string | undefined) {
  return useQuery({
    queryKey: ["career-roadmap-tasks", roadmapId, "weekly"],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("career_roadmap_tasks")
        .select("*")
        .eq("roadmap_id", roadmapId!)
        .eq("granularity", "weekly")
        .order("period_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roadmapId,
  });
}

export function useCareerRoadmapDailyTasks(roadmapId: string | undefined, weekNumber: number) {
  return useQuery({
    queryKey: ["career-roadmap-tasks", roadmapId, "daily", weekNumber],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const from = (weekNumber - 1) * 7;
      const to = weekNumber * 7 - 1;
      const { data, error } = await supabase
        .from("career_roadmap_tasks")
        .select("*")
        .eq("roadmap_id", roadmapId!)
        .eq("granularity", "daily")
        .gte("period_index", from)
        .lte("period_index", to)
        .order("period_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roadmapId && weekNumber >= 1,
  });
}

export function useCareerRoadmapProgress(roadmap: CareerRoadmap | null | undefined) {
  return useQuery({
    queryKey: ["career-roadmap-progress", roadmap?.id],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const [{ count: total }, { count: completed }] = await Promise.all([
        supabase
          .from("career_roadmap_tasks")
          .select("*", { count: "exact", head: true })
          .eq("roadmap_id", roadmap!.id),
        supabase
          .from("career_roadmap_tasks")
          .select("*", { count: "exact", head: true })
          .eq("roadmap_id", roadmap!.id)
          .eq("completed", true),
      ]);

      const totalCount = total ?? 0;
      const completedCount = completed ?? 0;
      const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const startDate = new Date(roadmap!.start_date);
      const targetDate = new Date(startDate);
      targetDate.setMonth(targetDate.getMonth() + roadmap!.duration_months);

      const today = new Date();
      const daysElapsed = Math.max(
        1,
        Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      );
      let estimatedCompletionDate = targetDate;
      if (completedCount > 0 && totalCount > completedCount) {
        const pace = completedCount / daysElapsed;
        const remainingDays = Math.round((totalCount - completedCount) / pace);
        const projected = new Date(today);
        projected.setDate(projected.getDate() + remainingDays);
        estimatedCompletionDate = projected;
      }

      let predictedReadinessDate: Date | null = null;
      if (roadmap!.predicted_readiness_weeks != null) {
        const predicted = new Date(startDate);
        predicted.setDate(predicted.getDate() + roadmap!.predicted_readiness_weeks * 7);
        predictedReadinessDate = predicted;
      }

      return {
        total: totalCount,
        completed: completedCount,
        remaining: totalCount - completedCount,
        percentage: pct,
        targetCompletionDate: targetDate,
        estimatedCompletionDate,
        predictedReadinessDate,
      };
    },
    enabled: !!roadmap?.id,
  });
}

export function useToggleCareerRoadmapTask(roadmapId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("career_roadmap_tasks")
        .update({ completed, completed_at: completed ? new Date().toISOString() : null })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-roadmap-tasks", roadmapId] });
      queryClient.invalidateQueries({ queryKey: ["career-roadmap-progress", roadmapId] });
    },
  });
}

export function useGenerateCareerRoadmap(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      targetRole: string;
      targetCompany?: string;
      jobDescriptionText?: string;
      durationMonths: number;
    }) => generateCareerRoadmapFn({ data: vars }),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["career-roadmap", profileId] });
      }
    },
  });
}

export function useArchiveCareerRoadmap(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roadmapId: string) => archiveCareerRoadmapFn({ data: { roadmapId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-roadmap", profileId] });
    },
  });
}
