import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { analyzeResumeFn } from "@/lib/resume.server";

export type Resume = Database["public"]["Tables"]["resumes"]["Row"];

// Mirrors the `resumes` storage bucket's allowed_mime_types exactly
// (supabase/migrations/20260727000300_storage_buckets.sql) so callers
// never accept a file the bucket would actually reject.
export const ACCEPTED_RESUME_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function currentResumeQueryKey(profileId: string | undefined) {
  return ["resume", "current", profileId] as const;
}

export function useCurrentResume(profileId: string | undefined) {
  return useQuery({
    queryKey: currentResumeQueryKey(profileId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("profile_id", profileId!)
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      return data as Resume | null;
    },
    enabled: !!profileId,
  });
}

export async function getSignedResumeUrl(storagePath: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from("resumes")
    .createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export function useUploadResume(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!profileId) throw new Error("Not signed in.");
      const supabase = getSupabaseBrowserClient();
      const path = `${profileId}/resume-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

      const { data: existing } = await supabase
        .from("resumes")
        .select("id, version")
        .eq("profile_id", profileId)
        .eq("is_current", true)
        .maybeSingle();

      const { error: uploadError } = await supabase.storage.from("resumes").upload(path, file);
      if (uploadError) throw uploadError;

      if (existing) {
        await supabase.from("resumes").update({ is_current: false }).eq("id", existing.id);
      }

      const { data: inserted, error: insertError } = await supabase
        .from("resumes")
        .insert({
          profile_id: profileId,
          storage_path: path,
          resume_url: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          version: (existing?.version ?? 0) + 1,
          is_current: true,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      const result = await analyzeResumeFn({ data: { resumeId: inserted.id } });
      return { resume: inserted as Resume, analysisError: result.error };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentResumeQueryKey(profileId) });
    },
  });
}

export function useDeleteResume(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (resume: Resume) => {
      const supabase = getSupabaseBrowserClient();
      if (resume.storage_path) {
        await supabase.storage.from("resumes").remove([resume.storage_path]);
      }
      const { error } = await supabase.from("resumes").delete().eq("id", resume.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentResumeQueryKey(profileId) });
    },
  });
}
