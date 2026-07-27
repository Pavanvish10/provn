import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/types";

export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostComment = Database["public"]["Tables"]["post_comments"]["Row"];

export type PostAuthor = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type FeedPost = Post & {
  author: PostAuthor | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

/** Shape of `posts.metadata` for `kind === 'job'` posts (see useCreateJob/useUpdateJob
 * in company-client.ts, which write this when a job is published). */
export type JobPostMetadata = {
  job_id: string;
  company_id: string;
  company_name: string;
  company_logo: string | null;
};

export type CommentWithAuthor = PostComment & {
  author: PostAuthor | null;
};

const PAGE_SIZE = 10;

export function feedQueryKey(userId: string | undefined) {
  return ["posts", "feed", userId] as const;
}

export function useFeed(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: feedQueryKey(userId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const supabase = getSupabaseBrowserClient();
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("posts")
        .select(
          "*, author:profiles!posts_author_id_fkey(id, full_name, username, avatar_url), post_likes(count), post_comments(count)",
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;

      const rows = data ?? [];
      const postIds = rows.map((r) => r.id);

      let likedSet = new Set<string>();
      if (userId && postIds.length > 0) {
        const { data: likes, error: likesError } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("profile_id", userId)
          .in("post_id", postIds);
        if (likesError) throw likesError;
        likedSet = new Set((likes ?? []).map((l) => l.post_id));
      }

      const posts: FeedPost[] = rows.map((row) => {
        const { post_likes, post_comments, author, ...rest } = row as typeof row & {
          post_likes?: { count: number }[];
          post_comments?: { count: number }[];
          author?: PostAuthor | null;
        };
        return {
          ...rest,
          author: author ?? null,
          like_count: post_likes?.[0]?.count ?? 0,
          comment_count: post_comments?.[0]?.count ?? 0,
          liked_by_me: likedSet.has(rest.id),
        };
      });

      return {
        posts,
        nextPage: posts.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: userId !== undefined,
  });
}

export function useCreatePost(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      content: string;
      imageUrls?: string[];
      kind?: Post["kind"];
      metadata?: Json;
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("posts").insert({
        author_id: userId!,
        content: input.content,
        kind: input.kind ?? "text",
        image_urls: input.imageUrls ?? [],
        metadata: input.metadata ?? {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
    },
  });
}

export function useToggleLike(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      const supabase = getSupabaseBrowserClient();
      if (liked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("profile_id", userId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: postId, profile_id: userId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
    },
  });
}

export function commentsQueryKey(postId: string) {
  return ["posts", "comments", postId] as const;
}

export function useComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: commentsQueryKey(postId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("post_comments")
        .select(
          "*, author:profiles!post_comments_author_id_fkey(id, full_name, username, avatar_url)",
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CommentWithAuthor[];
    },
    enabled,
  });
}

export function useAddComment(postId: string, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("post_comments")
        .insert({ post_id: postId, author_id: userId!, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId) });
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
    },
  });
}

export async function uploadPostImage(userId: string, file: File): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  const { data } = supabase.storage.from("post-images").getPublicUrl(path);
  return data.publicUrl;
}

export type TopStreakProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  streak: number;
};

export function useTopStreaks(limit = 5) {
  return useQuery({
    queryKey: ["profiles", "top-streaks", limit],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, streak")
        .gt("streak", 0)
        .order("streak", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as TopStreakProfile[];
    },
  });
}
