import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ADMIN_PAGE_SIZE, logAdminAction } from "@/lib/admin-shared";

export type AdminCreditBalance = {
  profile_id: string;
  balance: number;
  updated_at: string;
  profile: { full_name: string | null; email: string | null } | null;
};

export function useAdminCreditBalances(params: { page: number }) {
  return useQuery({
    queryKey: ["admin", "credits", "balances", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const from = params.page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("ai_credit_balances")
        .select("profile_id, balance, updated_at, profile:profiles(full_name, email)", {
          count: "exact",
        })
        .order("balance", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AdminCreditBalance[], count: count ?? 0 };
    },
  });
}

export type AdminCreditTransaction = {
  id: string;
  delta: number;
  reason: string;
  balance_after: number;
  created_at: string;
  profile: { full_name: string | null; email: string | null } | null;
};

export function useAdminCreditTransactions(params: { page: number }) {
  return useQuery({
    queryKey: ["admin", "credits", "transactions", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const from = params.page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("ai_credit_transactions")
        .select(
          "id, delta, reason, balance_after, created_at, profile:profiles(full_name, email)",
          {
            count: "exact",
          },
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AdminCreditTransaction[], count: count ?? 0 };
    },
  });
}

export function useSearchProfileForCredits(query: string) {
  return useQuery({
    queryKey: ["admin", "credits", "search-profile", query],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, username")
        .or(
          `email.ilike.%${query.replace(/[,()]/g, "")}%,username.ilike.%${query.replace(/[,()]/g, "")}%`,
        )
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: query.trim().length >= 2,
  });
}

export function useAdminGrantCredits(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, amount }: { profileId: string; amount: number }) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("grant_ai_credits", {
        p_profile_id: profileId,
        p_amount: amount,
        p_reason: "admin_grant",
      });
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "grant_ai_credits",
          targetType: "user",
          targetId: profileId,
          notes: `+${amount} credits (new balance: ${data})`,
        });
      }
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "credits"] });
    },
  });
}
