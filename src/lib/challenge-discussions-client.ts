import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type DiscussionAuthor = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type ChallengeDiscussionComment =
  Database["public"]["Tables"]["challenge_discussions"]["Row"] & {
    author: DiscussionAuthor | null;
  };

export function discussionsQueryKey(challengeId: string | undefined) {
  return ["challenge-discussions", challengeId] as const;
}

export function useChallengeDiscussions(challengeId: string | undefined) {
  return useQuery({
    queryKey: discussionsQueryKey(challengeId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("challenge_discussions")
        .select(
          "*, author:profiles!challenge_discussions_author_id_fkey(id, full_name, username, avatar_url)",
        )
        .eq("challenge_id", challengeId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ChallengeDiscussionComment[];
    },
    enabled: !!challengeId,
  });
}

export function useAddDiscussionComment(challengeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, authorId }: { content: string; authorId: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("challenge_discussions")
        .insert({ challenge_id: challengeId!, author_id: authorId, content: content.trim() });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: discussionsQueryKey(challengeId) }),
  });
}

export function useDeleteDiscussionComment(challengeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("challenge_discussions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: discussionsQueryKey(challengeId) }),
  });
}
