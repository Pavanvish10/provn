import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ADMIN_PAGE_SIZE, logAdminAction } from "@/lib/admin-shared";

export type JobStatus = "draft" | "open" | "paused" | "closed";
export type AdminJob = Database["public"]["Tables"]["jobs"]["Row"] & {
  company: { company_name: string | null } | null;
};

export function useAdminJobs(params: { search: string; status: JobStatus | "all"; page: number }) {
  return useQuery({
    queryKey: ["admin", "jobs", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from("jobs")
        .select("*, company:companies(company_name)", { count: "exact" });

      const q = params.search.trim().replace(/[,()%]/g, "");
      if (q) query = query.ilike("title", `%${q}%`);
      if (params.status !== "all") query = query.eq("status", params.status);

      const from = params.page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order("posted_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AdminJob[], count: count ?? 0 };
    },
  });
}

export function useSetJobStatus(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: JobStatus }) => {
      const supabase = getSupabaseBrowserClient();
      const patch: Database["public"]["Tables"]["jobs"]["Update"] = { status };
      if (status === "closed") patch.closed_at = new Date().toISOString();
      const { error } = await supabase.from("jobs").update(patch).eq("id", jobId);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: `set_job_status_${status}`,
          targetType: "job",
          targetId: jobId,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] }),
  });
}

export function useDeleteJob(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, title }: { jobId: string; title: string | null }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("jobs").delete().eq("id", jobId);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "delete_job",
          targetType: "job",
          targetId: jobId,
          notes: title ? `Deleted job "${title}"` : null,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] }),
  });
}
