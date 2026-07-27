import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type RoadmapTemplate = Database["public"]["Tables"]["roadmap_templates"]["Row"];
export type RoadmapStep = Database["public"]["Tables"]["roadmap_steps"]["Row"];
export type UserRoadmap = Database["public"]["Tables"]["user_roadmaps"]["Row"];
export type UserRoadmapProgress = Database["public"]["Tables"]["user_roadmap_progress"]["Row"];

export function useRoadmapTemplates() {
  return useQuery({
    queryKey: ["roadmap-templates"],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("roadmap_templates")
        .select("*")
        .order("role", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useRoadmapSteps(roadmapId: string | undefined) {
  return useQuery({
    queryKey: ["roadmap-steps", roadmapId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("roadmap_steps")
        .select("*")
        .eq("roadmap_id", roadmapId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roadmapId,
  });
}

export function useUserRoadmap(profileId: string | undefined, roadmapId: string | undefined) {
  return useQuery({
    queryKey: ["user-roadmap", profileId, roadmapId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("user_roadmaps")
        .select("*")
        .eq("profile_id", profileId!)
        .eq("roadmap_id", roadmapId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profileId && !!roadmapId,
  });
}

export function useStartRoadmap(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roadmapId: string) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("user_roadmaps")
        .upsert(
          { profile_id: profileId!, roadmap_id: roadmapId },
          { onConflict: "profile_id,roadmap_id", ignoreDuplicates: true },
        )
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (data) return data;
      // Row already existed (ignoreDuplicates skipped the insert) — fetch it.
      const { data: existing, error: fetchError } = await supabase
        .from("user_roadmaps")
        .select("*")
        .eq("profile_id", profileId!)
        .eq("roadmap_id", roadmapId)
        .single();
      if (fetchError) throw fetchError;
      return existing;
    },
    onSuccess: (_data, roadmapId) => {
      queryClient.invalidateQueries({ queryKey: ["user-roadmap", profileId, roadmapId] });
    },
  });
}

export function useUserRoadmapProgress(userRoadmapId: string | undefined) {
  return useQuery({
    queryKey: ["user-roadmap-progress", userRoadmapId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("user_roadmap_progress")
        .select("*")
        .eq("user_roadmap_id", userRoadmapId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userRoadmapId,
  });
}

export function useToggleStepProgress(userRoadmapId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ stepId, completed }: { stepId: string; completed: boolean }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("user_roadmap_progress").upsert(
        {
          user_roadmap_id: userRoadmapId!,
          step_id: stepId,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: "user_roadmap_id,step_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roadmap-progress", userRoadmapId] });
    },
  });
}
