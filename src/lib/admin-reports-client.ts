import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ADMIN_PAGE_SIZE, logAdminAction } from "@/lib/admin-shared";

export type AdminReport = Database["public"]["Tables"]["reports"]["Row"] & {
  reporter: Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name" | "email"> | null;
};
export type ReportStatus = Database["public"]["Tables"]["reports"]["Row"]["status"];

export function useAdminReports(params: { status: ReportStatus | "all"; page: number }) {
  return useQuery({
    queryKey: ["admin", "reports", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from("reports")
        .select("*, reporter:profiles!reports_reporter_id_fkey(full_name, email)", {
          count: "exact",
        });
      if (params.status !== "all") query = query.eq("status", params.status);

      const from = params.page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AdminReport[], count: count ?? 0 };
    },
  });
}

export function useReportedContent(targetType: string, targetId: string) {
  return useQuery({
    queryKey: ["admin", "reports", "content", targetType, targetId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      if (targetType === "post") {
        const { data } = await supabase
          .from("posts")
          .select("id, content, author_id, created_at")
          .eq("id", targetId)
          .maybeSingle();
        return data;
      }
      if (targetType === "comment") {
        const { data } = await supabase
          .from("post_comments")
          .select("id, content, author_id, post_id, created_at")
          .eq("id", targetId)
          .maybeSingle();
        return data;
      }
      if (targetType === "user") {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email, is_banned")
          .eq("id", targetId)
          .maybeSingle();
        return data;
      }
      if (targetType === "company") {
        const { data } = await supabase
          .from("companies")
          .select("id, company_name, verified")
          .eq("id", targetId)
          .maybeSingle();
        return data;
      }
      if (targetType === "job") {
        const { data } = await supabase
          .from("jobs")
          .select("id, title, status")
          .eq("id", targetId)
          .maybeSingle();
        return data;
      }
      return null;
    },
    enabled: !!targetId,
  });
}

export function useUpdateReportStatus(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReportStatus }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("reports")
        .update({ status, reviewed_by: adminId ?? null, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: `report_${status}`,
          targetType: "report",
          targetId: id,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
  });
}

export function useDeleteReportedPost(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, reportId }: { postId: string; reportId: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
      await supabase
        .from("reports")
        .update({
          status: "actioned",
          reviewed_by: adminId ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "delete_post",
          targetType: "post",
          targetId: postId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
  });
}

export function useDeleteReportedComment(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, reportId }: { commentId: string; reportId: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
      if (error) throw error;
      await supabase
        .from("reports")
        .update({
          status: "actioned",
          reviewed_by: adminId ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "delete_comment",
          targetType: "comment",
          targetId: commentId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
  });
}
