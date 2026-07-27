import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ADMIN_PAGE_SIZE, logAdminAction } from "@/lib/admin-shared";

export type AdminProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileRole = "user" | "recruiter" | "company_admin" | "admin";

function sanitizeSearch(raw: string) {
  // PostgREST's `.or()` filter syntax uses commas/parens as separators —
  // strip them out of free-text search so a stray character can't break
  // the query string.
  return raw.trim().replace(/[,()]/g, "");
}

export function useAdminUsers(params: { search: string; role: ProfileRole | "all"; page: number }) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase.from("profiles").select("*", { count: "exact" });

      const q = sanitizeSearch(params.search);
      if (q) {
        query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,username.ilike.%${q}%`);
      }
      if (params.role !== "all") {
        query = query.eq("role", params.role);
      }

      const from = params.page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as AdminProfile[], count: count ?? 0 };
    },
  });
}

export function useToggleUserBan(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, ban }: { profileId: string; ban: boolean }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: ban })
        .eq("id", profileId);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: ban ? "ban_user" : "unban_user",
          targetType: "user",
          targetId: profileId,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useChangeUserRole(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      profileId,
      role,
      previousRole,
    }: {
      profileId: string;
      role: ProfileRole;
      previousRole: string;
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "change_role",
          targetType: "user",
          targetId: profileId,
          notes: `${previousRole} -> ${role}`,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}
