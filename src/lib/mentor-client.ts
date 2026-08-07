import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import {
  getMentorDashboardFn,
  sendMentorMessageFn,
  createMentorConversationFn,
  renameMentorConversationFn,
  deleteMentorConversationFn,
  togglePinMentorConversationFn,
  type MentorWidgets,
} from "@/lib/mentor.server";

export type MentorConversation = Database["public"]["Tables"]["mentor_conversations"]["Row"];
export type MentorMessage = Database["public"]["Tables"]["mentor_messages"]["Row"];
export type { MentorWidgets };

export function useMentorConversations(profileId: string | undefined) {
  return useQuery({
    queryKey: ["mentor-conversations", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("mentor_conversations")
        .select("*")
        .eq("profile_id", profileId!)
        .order("is_pinned", { ascending: false })
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useMentorMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["mentor-messages", conversationId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("mentor_messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });
}

export function useMentorDashboard(profileId: string | undefined) {
  return useQuery({
    queryKey: ["mentor-dashboard", profileId],
    queryFn: async (): Promise<MentorWidgets> => {
      const result = await getMentorDashboardFn();
      if (result.error || !result.widgets)
        throw new Error(result.error ?? "Could not load mentor dashboard.");
      return result.widgets;
    },
    enabled: !!profileId,
  });
}

export function useSendMentorMessage(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { conversationId?: string; message: string }) =>
      sendMentorMessageFn({ data: vars }),
    onSuccess: (result) => {
      if (!result.error && result.conversationId) {
        queryClient.invalidateQueries({ queryKey: ["mentor-messages", result.conversationId] });
        queryClient.invalidateQueries({ queryKey: ["mentor-conversations", profileId] });
      }
    },
  });
}

export function useCreateMentorConversation(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => createMentorConversationFn(),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["mentor-conversations", profileId] });
      }
    },
  });
}

export function useRenameMentorConversation(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { conversationId: string; title: string }) =>
      renameMentorConversationFn({ data: vars }),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["mentor-conversations", profileId] });
      }
    },
  });
}

export function useDeleteMentorConversation(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) =>
      deleteMentorConversationFn({ data: { conversationId } }),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["mentor-conversations", profileId] });
      }
    },
  });
}

export function useTogglePinMentorConversation(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { conversationId: string; pinned: boolean }) =>
      togglePinMentorConversationFn({ data: vars }),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["mentor-conversations", profileId] });
      }
    },
  });
}
