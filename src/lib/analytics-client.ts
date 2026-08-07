import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getAnalyticsDashboardFn,
  generateAnalyticsInsightsFn,
  createShareLinkFn,
  revokeShareLinkFn,
  getSharedAnalyticsReportFn,
  type AnalyticsDashboard,
} from "@/lib/analytics.server";

export type {
  AnalyticsDashboard,
  AnalyticsMetrics,
  AnalyticsCharts,
  AnalyticsAlert,
  InterviewComparison,
  AnalyticsInsights,
  ScoreTrendPoint,
  WeeklyActivityPoint,
  TopicPerformancePoint,
  CompanyReadinessPoint,
  SkillGapTrendPoint,
} from "@/lib/analytics.server";

export function useAnalyticsDashboard(profileId: string | undefined) {
  return useQuery({
    queryKey: ["analytics-dashboard", profileId],
    queryFn: async (): Promise<AnalyticsDashboard> => {
      const result = await getAnalyticsDashboardFn();
      if (result.error || !result.data)
        throw new Error(result.error ?? "Could not load analytics.");
      return result.data;
    },
    enabled: !!profileId,
  });
}

export function useGenerateAnalyticsInsights(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => generateAnalyticsInsightsFn(),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["analytics-dashboard", profileId] });
      }
    },
  });
}

export function useCreateShareLink(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => createShareLinkFn(),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["analytics-dashboard", profileId] });
      }
    },
  });
}

export function useRevokeShareLink(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => revokeShareLinkFn(),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["analytics-dashboard", profileId] });
      }
    },
  });
}

export function useSharedAnalyticsReport(token: string | undefined) {
  return useQuery({
    queryKey: ["analytics-shared-report", token],
    queryFn: async () => {
      const result = await getSharedAnalyticsReportFn({ data: { token: token! } });
      if (result.error || !result.report) throw new Error(result.error ?? "Report not found.");
      return result.report;
    },
    enabled: !!token,
    retry: false,
  });
}
