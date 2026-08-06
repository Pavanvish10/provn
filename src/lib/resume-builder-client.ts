import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import {
  createResumeVersionFn,
  deleteResumeVersionFn,
  optimizeResumeVersionFn,
  applyResumeOptimizationFn,
  type ResumeBuilderContent,
  type ResumeType,
} from "@/lib/resume-builder.server";

export type ResumeVersion = Database["public"]["Tables"]["resume_versions"]["Row"];
export type ResumeOptimization = Database["public"]["Tables"]["resume_optimizations"]["Row"];
export type { ResumeBuilderContent, ResumeType };

export function useResumeVersions(profileId: string | undefined) {
  return useQuery({
    queryKey: ["resume-versions", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("resume_versions")
        .select("*")
        .eq("profile_id", profileId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useResumeVersion(versionId: string | undefined) {
  return useQuery({
    queryKey: ["resume-version", versionId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("resume_versions")
        .select("*")
        .eq("id", versionId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!versionId,
  });
}

export function useResumeOptimizations(versionId: string | undefined) {
  return useQuery({
    queryKey: ["resume-optimizations", versionId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("resume_optimizations")
        .select("*")
        .eq("resume_version_id", versionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!versionId,
  });
}

export function useCreateResumeVersion(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      title: string;
      resumeType: ResumeType;
      targetCompany?: string;
      targetRole?: string;
      jobDescriptionText?: string;
      seedFromResume: boolean;
    }) => createResumeVersionFn({ data: vars }),
    onSuccess: (result) => {
      if (!result.error)
        queryClient.invalidateQueries({ queryKey: ["resume-versions", profileId] });
    },
  });
}

export function useUpdateResumeVersionContent(versionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { title?: string; content: ResumeBuilderContent }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("resume_versions")
        .update({
          ...(vars.title ? { title: vars.title } : {}),
          content: vars.content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", versionId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resume-version", versionId] });
    },
  });
}

export function useDeleteResumeVersion(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => deleteResumeVersionFn({ data: { versionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resume-versions", profileId] });
    },
  });
}

export function useOptimizeResumeVersion(versionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      versionId: string;
      targetCompany?: string;
      targetRole?: string;
      jobDescriptionText?: string;
    }) => optimizeResumeVersionFn({ data: vars }),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["resume-optimizations", versionId] });
        queryClient.invalidateQueries({ queryKey: ["resume-version", versionId] });
      }
    },
  });
}

export function useApplyResumeOptimization(versionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (optimizationId: string) =>
      applyResumeOptimizationFn({ data: { optimizationId } }),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["resume-version", versionId] });
        queryClient.invalidateQueries({ queryKey: ["resume-optimizations", versionId] });
      }
    },
  });
}
