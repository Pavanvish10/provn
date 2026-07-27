import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function premiumQueryKey(profileId: string | undefined) {
  return ["premium", profileId] as const;
}

export function usePremiumStatus(profileId: string | undefined) {
  return useQuery({
    queryKey: premiumQueryKey(profileId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("premium_subscriptions")
        .select("plan, status, current_period_end")
        .eq("profile_id", profileId!)
        .maybeSingle();
      if (error) throw error;
      const isPremium =
        !!data &&
        data.plan === "premium" &&
        data.status === "active" &&
        (!data.current_period_end || new Date(data.current_period_end) > new Date());
      return { isPremium, subscription: data };
    },
    enabled: !!profileId,
  });
}
