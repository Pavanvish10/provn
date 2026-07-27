import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ADMIN_PAGE_SIZE, logAdminAction } from "@/lib/admin-shared";

export type AdminCompany = Database["public"]["Tables"]["companies"]["Row"] & {
  creator: { full_name: string | null; email: string | null } | null;
};

export function useAdminCompanies(params: {
  search: string;
  verifiedOnly: "all" | "verified" | "unverified";
  page: number;
}) {
  return useQuery({
    queryKey: ["admin", "companies", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from("companies")
        .select("*, creator:profiles!companies_created_by_fkey(full_name, email)", {
          count: "exact",
        });

      const q = params.search.trim().replace(/[,()%]/g, "");
      if (q) query = query.ilike("company_name", `%${q}%`);
      if (params.verifiedOnly === "verified") query = query.eq("verified", true);
      if (params.verifiedOnly === "unverified") query = query.eq("verified", false);

      const from = params.page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AdminCompany[], count: count ?? 0 };
    },
  });
}

export function useToggleCompanyVerified(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, verified }: { companyId: string; verified: boolean }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("companies").update({ verified }).eq("id", companyId);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: verified ? "verify_company" : "unverify_company",
          targetType: "company",
          targetId: companyId,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "companies"] }),
  });
}

/**
 * The schema has no `companies.suspended` column, so "suspend a company" is
 * implemented as the real lever that exists: close every open/paused/draft
 * job the company has posted. Returns how many jobs were closed.
 */
export function useSuspendCompanyJobs(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId }: { companyId: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("jobs")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("company_id", companyId)
        .in("status", ["draft", "open", "paused"])
        .select("id");
      if (error) throw error;
      const closedCount = data?.length ?? 0;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "suspend_company_jobs",
          targetType: "company",
          targetId: companyId,
          notes: `Closed ${closedCount} open job(s) as a company suspension`,
        });
      }
      return closedCount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
    },
  });
}
