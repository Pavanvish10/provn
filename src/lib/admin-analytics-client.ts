import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AdminAnalytics = {
  totalUsers: number;
  totalPosts: number;
  challengesSolved: number;
  totalCompanies: number;
  verifiedCompanies: number;
  jobsByStatus: { status: string; count: number }[];
  premiumSubscribers: number;
  totalRevenueCents: number;
  monthlyRevenueCents: number;
  weeklySignups: { week: string; count: number }[];
};

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - day);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async (): Promise<AdminAnalytics> => {
      const supabase = getSupabaseBrowserClient();

      const [
        totalUsers,
        totalPosts,
        challengesSolved,
        totalCompanies,
        verifiedCompanies,
        jobsOpen,
        jobsPaused,
        jobsClosed,
        jobsDraft,
        premiumSubscribers,
        signupDates,
        succeededPayments,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase
          .from("challenge_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "passed"),
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase
          .from("companies")
          .select("id", { count: "exact", head: true })
          .eq("verified", true),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "paused"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "closed"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase
          .from("premium_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("plan", "premium")
          .eq("status", "active"),
        supabase
          .from("profiles")
          .select("created_at")
          .order("created_at", { ascending: true })
          .limit(5000),
        // Real revenue (Sprint 27's payments table), not an estimate — same
        // fetch-and-reduce-client-side pattern already used for
        // weeklySignups above, since PostgREST aggregates need either an
        // RPC or this. Capped at 10k rows, generous for this platform's
        // scale.
        supabase
          .from("payments")
          .select("amount_cents, created_at")
          .eq("status", "succeeded")
          .order("created_at", { ascending: false })
          .limit(10000),
      ]);

      const weekBuckets = new Map<string, number>();
      for (const row of signupDates.data ?? []) {
        if (!row.created_at) continue;
        const wk = startOfWeek(new Date(row.created_at)).toISOString().slice(0, 10);
        weekBuckets.set(wk, (weekBuckets.get(wk) ?? 0) + 1);
      }
      const weeklySignups = Array.from(weekBuckets.entries())
        .map(([week, count]) => ({ week, count }))
        .slice(-12);

      const premiumCount = premiumSubscribers.count ?? 0;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let totalRevenueCents = 0;
      let monthlyRevenueCents = 0;
      for (const p of succeededPayments.data ?? []) {
        totalRevenueCents += p.amount_cents;
        if (p.created_at && new Date(p.created_at) >= thirtyDaysAgo) {
          monthlyRevenueCents += p.amount_cents;
        }
      }

      return {
        totalUsers: totalUsers.count ?? 0,
        totalPosts: totalPosts.count ?? 0,
        challengesSolved: challengesSolved.count ?? 0,
        totalCompanies: totalCompanies.count ?? 0,
        verifiedCompanies: verifiedCompanies.count ?? 0,
        jobsByStatus: [
          { status: "Open", count: jobsOpen.count ?? 0 },
          { status: "Paused", count: jobsPaused.count ?? 0 },
          { status: "Closed", count: jobsClosed.count ?? 0 },
          { status: "Draft", count: jobsDraft.count ?? 0 },
        ],
        premiumSubscribers: premiumCount,
        totalRevenueCents,
        monthlyRevenueCents,
        weeklySignups,
      };
    },
    staleTime: 60 * 1000,
  });
}
