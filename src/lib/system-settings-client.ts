import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { logAdminAction } from "@/lib/admin-shared";

// system_settings is public-read (see migration 20260929000000) so both
// the admin Launch Command Center AND the app-wide banner in __root.tsx
// read through this one hook — no duplicate query logic for the same
// two rows.
export type MaintenanceModeValue = { enabled: boolean; message: string };
export type AnnouncementValue = { active: boolean; message: string };

export const systemSettingsQueryKey = ["system-settings"] as const;

export function useSystemSettings() {
  return useQuery({
    queryKey: systemSettingsQueryKey,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from("system_settings").select("key, value");
      if (error) throw error;
      const maintenance = (data?.find((r) => r.key === "maintenance_mode")?.value ?? {
        enabled: false,
        message: "",
      }) as MaintenanceModeValue;
      const announcement = (data?.find((r) => r.key === "announcement")?.value ?? {
        active: false,
        message: "",
      }) as AnnouncementValue;
      return { maintenance, announcement };
    },
    staleTime: 30 * 1000,
  });
}

export function useUpdateMaintenanceMode(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (value: MaintenanceModeValue) => {
      if (!adminId) throw new Error("Not signed in.");
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("system_settings")
        .update({ value, updated_by: adminId, updated_at: new Date().toISOString() })
        .eq("key", "maintenance_mode");
      if (error) throw error;
      await logAdminAction(supabase, {
        adminId,
        action: value.enabled ? "enable_maintenance_mode" : "disable_maintenance_mode",
        targetType: "system_settings",
        notes: value.message || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemSettingsQueryKey });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not update maintenance mode."),
  });
}

export function useUpdateAnnouncement(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (value: AnnouncementValue) => {
      if (!adminId) throw new Error("Not signed in.");
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("system_settings")
        .update({ value, updated_by: adminId, updated_at: new Date().toISOString() })
        .eq("key", "announcement");
      if (error) throw error;
      await logAdminAction(supabase, {
        adminId,
        action: value.active ? "set_announcement" : "clear_announcement",
        targetType: "system_settings",
        notes: value.message || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemSettingsQueryKey });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not update the announcement."),
  });
}
