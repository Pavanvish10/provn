import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ADMIN_PAGE_SIZE, logAdminAction } from "@/lib/admin-shared";

export type AdminSubscription = Database["public"]["Tables"]["premium_subscriptions"]["Row"] & {
  profile: Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "id" | "full_name" | "email" | "username"
  > | null;
};

export function useAdminPremiumSubscribers(params: { search: string; page: number }) {
  return useQuery({
    queryKey: ["admin", "premium", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const query = supabase
        .from("premium_subscriptions")
        .select("*, profile:profiles(id, full_name, email, username)", { count: "exact" })
        .eq("plan", "premium")
        .eq("status", "active");

      const from = params.page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order("started_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AdminSubscription[], count: count ?? 0 };
    },
  });
}

export function useSearchProfileByEmail(email: string) {
  return useQuery({
    queryKey: ["admin", "premium", "search-profile", email],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, username")
        .or(
          `email.ilike.%${email.replace(/[,()]/g, "")}%,username.ilike.%${email.replace(/[,()]/g, "")}%`,
        )
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: email.trim().length >= 2,
  });
}

export function useGrantPremium(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, days }: { profileId: string; days: number | null }) => {
      const supabase = getSupabaseBrowserClient();
      const currentPeriodEnd = days
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null;
      const { error } = await supabase.from("premium_subscriptions").upsert(
        {
          profile_id: profileId,
          plan: "premium",
          status: "active",
          current_period_end: currentPeriodEnd,
          payment_provider: "manual_admin_grant",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" },
      );
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "grant_premium",
          targetType: "user",
          targetId: profileId,
          notes: days ? `${days} days` : "no expiry",
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "premium"] }),
  });
}

export function useRevokePremium(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("premium_subscriptions")
        .update({ plan: "free", status: "canceled", updated_at: new Date().toISOString() })
        .eq("profile_id", profileId);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "revoke_premium",
          targetType: "user",
          targetId: profileId,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "premium"] }),
  });
}
