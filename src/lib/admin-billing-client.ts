import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ADMIN_PAGE_SIZE } from "@/lib/admin-shared";

export type AdminSubscriptionRow = {
  id: string;
  status: string;
  current_period_end: string | null;
  payment_provider: string;
  created_at: string;
  plan: { name: string; audience: string } | null;
  profile: { full_name: string | null; email: string | null } | null;
};

export function useAdminSubscriptions(page: number) {
  return useQuery({
    queryKey: ["admin", "billing", "subscriptions", page],
    queryFn: async (): Promise<{ rows: AdminSubscriptionRow[]; count: number }> => {
      const supabase = getSupabaseBrowserClient();
      const from = page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("subscriptions")
        .select(
          "id, status, current_period_end, payment_provider, created_at, plan:subscription_plans(name, audience), profile:profiles(full_name, email)",
          {
            count: "exact",
          },
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AdminSubscriptionRow[], count: count ?? 0 };
    },
  });
}

export type AdminPaymentRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  description: string | null;
  provider: string;
  created_at: string;
  profile: { full_name: string | null; email: string | null } | null;
};

export function useAdminPayments(page: number) {
  return useQuery({
    queryKey: ["admin", "billing", "payments", page],
    queryFn: async (): Promise<{ rows: AdminPaymentRow[]; count: number }> => {
      const supabase = getSupabaseBrowserClient();
      const from = page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("payments")
        .select(
          "id, amount_cents, currency, status, description, provider, created_at, profile:profiles(full_name, email)",
          {
            count: "exact",
          },
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AdminPaymentRow[], count: count ?? 0 };
    },
  });
}
