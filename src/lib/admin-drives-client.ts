import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ADMIN_PAGE_SIZE, logAdminAction } from "@/lib/admin-shared";

export type DriveStatus = "draft" | "published" | "paused" | "closed";
export type AdminDrive = Database["public"]["Tables"]["placement_drives"]["Row"] & {
  college: { name: string | null } | null;
};

export function useAdminDrives(params: {
  search: string;
  status: DriveStatus | "all";
  page: number;
}) {
  return useQuery({
    queryKey: ["admin", "drives", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from("placement_drives")
        .select("*, college:colleges(name)", { count: "exact" });

      const q = params.search.trim().replace(/[,()%]/g, "");
      if (q) query = query.ilike("role", `%${q}%`);
      if (params.status !== "all") query = query.eq("status", params.status);

      const from = params.page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AdminDrive[], count: count ?? 0 };
    },
  });
}

export function useSetDriveStatus(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ driveId, status }: { driveId: string; status: DriveStatus }) => {
      const supabase = getSupabaseBrowserClient();
      const patch: Database["public"]["Tables"]["placement_drives"]["Update"] = { status };
      if (status === "closed") patch.closed_at = new Date().toISOString();
      const { error } = await supabase.from("placement_drives").update(patch).eq("id", driveId);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: `set_drive_status_${status}`,
          targetType: "placement_drive",
          targetId: driveId,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "drives"] }),
  });
}
