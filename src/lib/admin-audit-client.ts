import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ADMIN_PAGE_SIZE } from "@/lib/admin-shared";

export type AdminActionLogRow = {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  notes: string | null;
  created_at: string;
  admin: { full_name: string | null; email: string | null } | null;
};

export function useAdminActionLog(params: { search: string; page: number }) {
  return useQuery({
    queryKey: ["admin", "audit", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from("admin_actions")
        .select(
          "id, action, target_type, target_id, notes, created_at, admin:profiles(full_name, email)",
          {
            count: "exact",
          },
        );

      const q = params.search.trim().replace(/[,()%]/g, "");
      if (q) query = query.or(`action.ilike.%${q}%,target_type.ilike.%${q}%,notes.ilike.%${q}%`);

      const from = params.page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AdminActionLogRow[], count: count ?? 0 };
    },
  });
}
