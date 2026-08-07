import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Sparkles, ThumbsUp, ThumbsDown, Gauge, ArrowRight } from "lucide-react";

import { Wordmark } from "@/components/Logo";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useSharedAnalyticsReport } from "@/lib/analytics-client";
import type { AnalyticsMetrics } from "@/lib/analytics-client";

export const Route = createFileRoute("/analytics_/shared/$token")({
  head: () => ({ meta: [{ title: "Shared analytics report · Provn" }] }),
  component: SharedAnalyticsReportPage,
});

const METRIC_TILES: { key: keyof AnalyticsMetrics; label: string; suffix?: string }[] = [
  { key: "overallInterviewScore", label: "Overall Interview Score" },
  { key: "codingScore", label: "Coding Score" },
  { key: "hrScore", label: "HR Score" },
  { key: "communicationScore", label: "Communication Score" },
  { key: "problemSolvingScore", label: "Problem Solving Score" },
  { key: "confidenceScore", label: "Confidence Score" },
  { key: "atsScore", label: "ATS Score" },
  { key: "companyReadinessScore", label: "Company Readiness Score" },
  { key: "skillCompletionPercent", label: "Skill Completion", suffix: "%" },
  { key: "roadmapCompletionPercent", label: "Roadmap Completion", suffix: "%" },
];

function SharedAnalyticsReportPage() {
  const { token } = Route.useParams();
  const { data: report, isLoading, error } = useSharedAnalyticsReport(token);

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <Wordmark />

        {isLoading && (
          <div className="mt-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading report…
          </div>
        )}

        {error && (
          <div className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {report && (
          <div className="mt-8 space-y-6">
            <div>
              <h1 className="font-display text-3xl tracking-tight">
                Interview performance report.
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Generated{" "}
                {new Date(report.generatedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {METRIC_TILES.map((tile) => {
                const value = report.metrics[tile.key];
                return (
                  <div key={tile.key} className="rounded-2xl border border-border bg-card p-4">
                    <div className="text-xs text-muted-foreground">{tile.label}</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">
                      {value != null ? `${value}${tile.suffix ?? ""}` : "—"}
                    </div>
                    <Progress value={value ?? 0} className="mt-2" />
                  </div>
                );
              })}
            </div>

            {report.insights ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-brand" /> AI insights
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Gauge className="h-5 w-5 text-brand" />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Estimated interview success probability
                      </div>
                      <div className="text-xl font-semibold">
                        {report.insights.estimatedSuccessProbability}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ArrowRight className="h-5 w-5 text-brand" />
                    <div>
                      <div className="text-xs text-muted-foreground">Recommended next action</div>
                      <div className="text-sm font-medium">
                        {report.insights.recommendedNextAction}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <ThumbsUp className="h-3.5 w-3.5" /> Top strengths
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {report.insights.topStrengths.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px]">
                            {i + 1}
                          </Badge>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <ThumbsDown className="h-3.5 w-3.5" /> Top weaknesses
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {report.insights.topWeaknesses.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <Badge variant="destructive" className="h-5 shrink-0 px-1.5 text-[10px]">
                            {i + 1}
                          </Badge>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This candidate hasn't generated AI insights yet.
              </p>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Built with Provn — AI-powered interview prep.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
