import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

const PAGE_SIZE = 20;

export function notificationsQueryKey(userId: string | undefined) {
  return ["notifications", "feed", userId] as const;
}

export function unreadCountQueryKey(userId: string | undefined) {
  return ["notifications", "unread-count", userId] as const;
}

export function useNotifications(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: notificationsQueryKey(userId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const supabase = getSupabaseBrowserClient();
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId!)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      const items = (data ?? []) as Notification[];
      return {
        items,
        nextPage: items.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!userId,
  });
}

/** Unread notification count for the current user — usable anywhere (e.g. a future AppNav bell badge). */
export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: unreadCountQueryKey(userId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId!)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

function invalidateNotifications(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string | undefined,
) {
  queryClient.invalidateQueries({ queryKey: notificationsQueryKey(userId) });
  queryClient.invalidateQueries({ queryKey: unreadCountQueryKey(userId) });
}

export function useMarkNotificationRead(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateNotifications(queryClient, userId),
  });
}

export function useMarkAllNotificationsRead(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", userId!)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => invalidateNotifications(queryClient, userId),
  });
}

export function useDeleteNotification(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateNotifications(queryClient, userId),
  });
}

/** Subscribes to realtime INSERTs on `notifications` for this user so the feed updates live. */
export function useNotificationsRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          invalidateNotifications(queryClient, userId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
