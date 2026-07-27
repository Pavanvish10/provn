import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ADMIN_PAGE_SIZE, logAdminAction } from "@/lib/admin-shared";

export function useSearchProfiles(query: string) {
  return useQuery({
    queryKey: ["admin", "notifications", "search-profile", query],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const q = query.replace(/[,()]/g, "");
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, username")
        .or(`email.ilike.%${q}%,username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: query.trim().length >= 2,
  });
}

export function useSendSystemNotification(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ recipientId, message }: { recipientId: string; message: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("notifications").insert({
        recipient_id: recipientId,
        actor_id: adminId ?? null,
        type: "system",
        message,
      });
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "send_system_notification",
          targetType: "user",
          targetId: recipientId,
          notes: message,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "sent-notifications"] }),
  });
}

export type SentSystemNotification = {
  id: string;
  message: string;
  created_at: string;
  recipient: { full_name: string | null; email: string | null; username: string | null } | null;
};

export function useRecentSystemNotifications(page: number) {
  return useQuery({
    queryKey: ["admin", "sent-notifications", page],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const from = page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("notifications")
        .select(
          "*, recipient:profiles!notifications_recipient_id_fkey(full_name, email, username)",
          {
            count: "exact",
          },
        )
        .eq("type", "system")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as SentSystemNotification[], count: count ?? 0 };
    },
  });
}
