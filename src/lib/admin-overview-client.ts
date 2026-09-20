import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AdminOverviewStats = {
  totalUsers: number;
  bannedUsers: number;
  openReports: number;
  unverifiedCompanies: number;
  activeChallenges: number;
  openJobs: number;
  premiumSubscribers: number;
  unverifiedColleges: number;
  publishedDrives: number;
  activeCourses: number;
};

export function useAdminOverviewStats() {
  return useQuery({
    queryKey: ["admin", "overview-stats"],
    queryFn: async (): Promise<AdminOverviewStats> => {
      const supabase = getSupabaseBrowserClient();

      const [
        totalUsers,
        bannedUsers,
        openReports,
        unverifiedCompanies,
        activeChallenges,
        openJobs,
        premiumSubscribers,
        unverifiedColleges,
        publishedDrives,
        activeCourses,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_banned", true),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase
          .from("companies")
          .select("id", { count: "exact", head: true })
          .eq("verified", false),
        supabase
          .from("challenges")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase
          .from("premium_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("plan", "premium")
          .eq("status", "active"),
        supabase
          .from("colleges")
          .select("id", { count: "exact", head: true })
          .eq("verified", false),
        supabase
          .from("placement_drives")
          .select("id", { count: "exact", head: true })
          .eq("status", "published"),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      return {
        totalUsers: totalUsers.count ?? 0,
        bannedUsers: bannedUsers.count ?? 0,
        openReports: openReports.count ?? 0,
        unverifiedCompanies: unverifiedCompanies.count ?? 0,
        activeChallenges: activeChallenges.count ?? 0,
        openJobs: openJobs.count ?? 0,
        premiumSubscribers: premiumSubscribers.count ?? 0,
        unverifiedColleges: unverifiedColleges.count ?? 0,
        publishedDrives: publishedDrives.count ?? 0,
        activeCourses: activeCourses.count ?? 0,
      };
    },
    staleTime: 60 * 1000,
  });
}
