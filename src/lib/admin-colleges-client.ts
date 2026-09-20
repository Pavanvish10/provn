import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ADMIN_PAGE_SIZE, logAdminAction } from "@/lib/admin-shared";

export type AdminCollege = Database["public"]["Tables"]["colleges"]["Row"] & {
  creator: { full_name: string | null; email: string | null } | null;
};

export function useAdminColleges(params: {
  search: string;
  verifiedOnly: "all" | "verified" | "unverified";
  page: number;
}) {
  return useQuery({
    queryKey: ["admin", "colleges", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from("colleges")
        .select("*, creator:profiles!colleges_created_by_fkey(full_name, email)", {
          count: "exact",
        });

      const q = params.search.trim().replace(/[,()%]/g, "");
      if (q) query = query.ilike("name", `%${q}%`);
      if (params.verifiedOnly === "verified") query = query.eq("verified", true);
      if (params.verifiedOnly === "unverified") query = query.eq("verified", false);

      const from = params.page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AdminCollege[], count: count ?? 0 };
    },
  });
}

export function useToggleCollegeVerified(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ collegeId, verified }: { collegeId: string; verified: boolean }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("colleges").update({ verified }).eq("id", collegeId);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: verified ? "verify_college" : "unverify_college",
          targetType: "college",
          targetId: collegeId,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "colleges"] }),
  });
}

/**
 * The schema has no `colleges.suspended` column, so "suspend a college" is
 * implemented the same way admin-companies-client.ts suspends a company:
 * close every draft/published/paused placement drive it owns. Returns how
 * many drives were closed.
 */
export function useSuspendCollegeDrives(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ collegeId }: { collegeId: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("placement_drives")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("college_id", collegeId)
        .in("status", ["draft", "published", "paused"])
        .select("id");
      if (error) throw error;
      const closedCount = data?.length ?? 0;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "suspend_college_drives",
          targetType: "college",
          targetId: collegeId,
          notes: `Closed ${closedCount} placement drive(s) as a college suspension`,
        });
      }
      return closedCount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "colleges"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "drives"] });
    },
  });
}
