import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type NotificationPreferences =
  Database["public"]["Tables"]["notification_preferences"]["Row"];

const DEFAULTS: Omit<NotificationPreferences, "profile_id" | "updated_at"> = {
  social: true,
  jobs: true,
  placements: true,
  learning: true,
  email_notifications: true,
};

export function notificationPreferencesQueryKey(userId: string | undefined) {
  return ["notification-preferences", userId] as const;
}

/** Returns sensible defaults (all on) when no row exists yet — a user's
 * preferences are only ever persisted once they change something. */
export function useNotificationPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: notificationPreferencesQueryKey(userId),
    queryFn: async (): Promise<NotificationPreferences> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("profile_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? { profile_id: userId!, updated_at: new Date().toISOString(), ...DEFAULTS };
    },
    enabled: !!userId,
  });
}

export function useUpdateNotificationPreferences(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Partial<Omit<NotificationPreferences, "profile_id" | "updated_at">>,
    ) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { profile_id: userId!, ...DEFAULTS, ...patch, updated_at: new Date().toISOString() },
          { onConflict: "profile_id" },
        );
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: notificationPreferencesQueryKey(userId) });
      const previous = queryClient.getQueryData<NotificationPreferences>(
        notificationPreferencesQueryKey(userId),
      );
      queryClient.setQueryData<NotificationPreferences>(
        notificationPreferencesQueryKey(userId),
        (old) => ({ ...(old ?? { profile_id: userId!, updated_at: "", ...DEFAULTS }), ...patch }),
      );
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationPreferencesQueryKey(userId), context.previous);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: notificationPreferencesQueryKey(userId) }),
  });
}
