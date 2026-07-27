import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type Education = Database["public"]["Tables"]["education"]["Row"];
export type Experience = Database["public"]["Tables"]["experience"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Achievement = Database["public"]["Tables"]["achievements"]["Row"];
export type Skill = Database["public"]["Tables"]["skills"]["Row"];

function sectionKey(table: string, profileId: string | undefined) {
  return [table, profileId] as const;
}

export function useEducation(profileId: string | undefined) {
  return useQuery({
    queryKey: sectionKey("education", profileId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("education")
        .select("*")
        .eq("profile_id", profileId!)
        .order("start_year", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useAddEducation(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      entry: Omit<Database["public"]["Tables"]["education"]["Insert"], "profile_id">,
    ) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("education")
        .insert({ ...entry, profile_id: profileId! });
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sectionKey("education", profileId) }),
  });
}

export function useDeleteEducation(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("education").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sectionKey("education", profileId) }),
  });
}

export function useExperience(profileId: string | undefined) {
  return useQuery({
    queryKey: sectionKey("experience", profileId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("experience")
        .select("*")
        .eq("profile_id", profileId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useAddExperience(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      entry: Omit<Database["public"]["Tables"]["experience"]["Insert"], "profile_id">,
    ) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("experience")
        .insert({ ...entry, profile_id: profileId! });
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sectionKey("experience", profileId) }),
  });
}

export function useDeleteExperience(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("experience").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sectionKey("experience", profileId) }),
  });
}

export function useProjects(profileId: string | undefined) {
  return useQuery({
    queryKey: sectionKey("projects", profileId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("profile_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useAddProject(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      entry: Omit<Database["public"]["Tables"]["projects"]["Insert"], "profile_id">,
    ) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("projects")
        .insert({ ...entry, profile_id: profileId! });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKey("projects", profileId) }),
  });
}

export function useDeleteProject(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKey("projects", profileId) }),
  });
}

export function useAchievements(profileId: string | undefined) {
  return useQuery({
    queryKey: sectionKey("achievements", profileId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .eq("profile_id", profileId!)
        .order("achieved_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useSkills(profileId: string | undefined) {
  return useQuery({
    queryKey: sectionKey("skills", profileId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("profile_id", profileId!)
        .order("verified", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useAddSkill(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (skillName: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("skills")
        .insert({ profile_id: profileId!, skill_name: skillName.trim(), source: "manual" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKey("skills", profileId) }),
  });
}

export function useDeleteSkill(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("skills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKey("skills", profileId) }),
  });
}

export function useLeaderboardRank(profileId: string | undefined, xp: number | undefined) {
  return useQuery({
    queryKey: ["leaderboard-rank", profileId, xp],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("xp", xp ?? 0);
      if (error) throw error;
      return (count ?? 0) + 1;
    },
    enabled: !!profileId && xp !== undefined,
  });
}
