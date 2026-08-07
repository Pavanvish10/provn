import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Sparkles,
  Loader2,
  Download,
  Share2,
  Copy,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Gauge,
  ThumbsUp,
  ThumbsDown,
  Target,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useAnalyticsDashboard,
  useGenerateAnalyticsInsights,
  useCreateShareLink,
  useRevokeShareLink,
  type AnalyticsDashboard,
  type AnalyticsAlert,
  type InterviewComparison,
} from "@/lib/analytics-client";

export const Route = createFileRoute("/analytics")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Analytics · Provn" },
      {
        name: "description",
        content:
          "Your unified AI interview analytics dashboard — consolidated scores, trends, and insights across every prep sprint.",
      },
    ],
  }),
  component: AnalyticsPage,
});

type Range = "30" | "90" | "all";

function withinRange(dateStr: string, range: Range): boolean {
  if (range === "all") return true;
  const days = range === "30" ? 30 : 90;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(dateStr).getTime() >= cutoff;
}

function AnalyticsPage() {
  const { data: user } = useCurrentUser();
  // Deliberately not branching visible structure on `isLoading` — matches
  // eligibility.tsx/career-roadmap.tsx's convention of keying structure only
  // to `data` presence, which stays consistent between the SSR pass and the
  // client's first hydration render. Keying structure to `isLoading` instead
  // caused a hydration mismatch: the query can resolve between the server
  // flush and the client's first paint.
  const { data, error } = useAnalyticsDashboard(user?.id);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight">Analytics.</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              A unified, AI-driven performance center — every score, trend, and insight from your
              prep journey in one place.
            </p>
          </div>
          {data && <ReportActions profileId={user?.id} dashboard={data} />}
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {data && <AnalyticsDashboardView profileId={user?.id} dashboard={data} />}
      </div>
    </AppShell>
  );
}

function ReportActions({
  profileId,
  dashboard,
}: {
  profileId: string | undefined;
  dashboard: AnalyticsDashboard;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={() => window.print()}>
        <Download className="mr-2 h-4 w-4" /> Download PDF
      </Button>
      <Button variant="outline" onClick={() => setShareOpen(true)}>
        <Share2 className="mr-2 h-4 w-4" /> Share report
      </Button>
      {shareOpen && (
        <SharePanel
          profileId={profileId}
          dashboard={dashboard}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

function SharePanel({
  profileId,
  dashboard,
  onClose,
}: {
  profileId: string | undefined;
  dashboard: AnalyticsDashboard;
  onClose: () => void;
}) {
  const createLink = useCreateShareLink(profileId);
  const revokeLink = useRevokeShareLink(profileId);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    dashboard.isPublic && dashboard.shareToken
      ? `${window.location.origin}/analytics/shared/${dashboard.shareToken}`
      : null;

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Shareable report link</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Anyone with this link can view a read-only summary of your metrics and AI insights — no
          account required.
        </p>

        {shareUrl ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2.5">
              <span className="flex-1 truncate text-xs">{shareUrl}</span>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => revokeLink.mutate()}
              disabled={revokeLink.isPending}
            >
              {revokeLink.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Revoke link
            </Button>
          </div>
        ) : (
          <div className="mt-4">
            <Button
              className="w-full"
              onClick={() => createLink.mutate()}
              disabled={createLink.isPending}
            >
              {createLink.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              Generate share link
            </Button>
            {createLink.data?.error && (
              <p className="mt-2 text-xs text-destructive">{createLink.data.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const METRIC_TILES: { key: keyof AnalyticsDashboard["metrics"]; label: string; suffix?: string }[] =
  [
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

function AnalyticsDashboardView({
  profileId,
  dashboard,
}: {
  profileId: string | undefined;
  dashboard: AnalyticsDashboard;
}) {
  const [range, setRange] = useState<Range>("90");
  const generateInsights = useGenerateAnalyticsInsights(profileId);

  const scoreTrend = useMemo(
    () => dashboard.charts.scoreTrend.filter((p) => withinRange(p.date, range)),
    [dashboard.charts.scoreTrend, range],
  );
  const weeklyActivity = useMemo(
    () => dashboard.charts.weeklyActivity.filter((p) => withinRange(p.weekStart, range)),
    [dashboard.charts.weeklyActivity, range],
  );
  const skillGapTrend = useMemo(
    () => dashboard.charts.skillGapTrend.filter((p) => withinRange(p.date, range)),
    [dashboard.charts.skillGapTrend, range],
  );

  if (!dashboard.hasAnyData) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <Gauge className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No analytics yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete a resume analysis, a coding or HR mock interview, or generate a career roadmap to
          start seeing your consolidated performance here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {METRIC_TILES.map((tile) => (
          <MetricTile
            key={tile.key}
            label={tile.label}
            value={dashboard.metrics[tile.key]}
            suffix={tile.suffix}
          />
        ))}
      </div>

      <AlertsPanel alerts={dashboard.alerts} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {dashboard.comparisons.map((c) => (
          <ComparisonCard key={c.label} comparison={c} />
        ))}
      </div>

      <div className="no-print flex items-center gap-1.5">
        {(["30", "90", "all"] as Range[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              range === r
                ? "bg-brand text-brand-foreground"
                : "border border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {r === "all" ? "All time" : `Last ${r} days`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Score trend over time">
          {scoreTrend.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTrend} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="codingScore"
                  name="Coding"
                  stroke="#6366f1"
                  connectNulls
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="hrScore"
                  name="HR"
                  stroke="#22c55e"
                  connectNulls
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Weekly practice activity">
          {weeklyActivity.every(
            (w) => !w.codingPractice && !w.codingInterviews && !w.hrInterviews,
          ) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivity} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="codingPractice" name="Coding practice" stackId="a" fill="#6366f1" />
                <Bar
                  dataKey="codingInterviews"
                  name="Coding interviews"
                  stackId="a"
                  fill="#f59e0b"
                />
                <Bar dataKey="hrInterviews" name="HR interviews" stackId="a" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Topic-wise performance">
          {dashboard.charts.topicPerformance.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboard.charts.topicPerformance}
                layout="vertical"
                margin={{ left: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="topic" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="score" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Company-wise readiness">
          {dashboard.charts.companyReadiness.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboard.charts.companyReadiness}
                layout="vertical"
                margin={{ left: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="company" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="readiness" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Skill-gap reduction trend" className="lg:col-span-2">
          {skillGapTrend.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={skillGapTrend} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(v: string) => new Date(v).toLocaleDateString()} />
                <Line
                  type="monotone"
                  dataKey="skillMatchPercent"
                  name="Skill match %"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <InsightsPanel
        dashboard={dashboard}
        onGenerate={() => generateInsights.mutate()}
        isGenerating={generateInsights.isPending}
        generateError={generateInsights.data?.error ?? null}
      />
    </div>
  );
}

function MetricTile({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">
        {value != null ? `${value}${suffix ?? ""}` : "—"}
      </div>
      <Progress value={value ?? 0} className="mt-2" />
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3 h-64">{children}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Not enough data yet.
    </div>
  );
}

function ComparisonCard({ comparison }: { comparison: InterviewComparison }) {
  const { label, current, previous, delta } = comparison;
  const trendIcon =
    delta == null ? (
      <Minus className="h-4 w-4 text-muted-foreground" />
    ) : delta > 0 ? (
      <TrendingUp className="h-4 w-4 text-emerald-600" />
    ) : delta < 0 ? (
      <TrendingDown className="h-4 w-4 text-destructive" />
    ) : (
      <Minus className="h-4 w-4 text-muted-foreground" />
    );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>{label} interview — last vs current</span>
        {trendIcon}
      </div>
      {!current ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No {label.toLowerCase()} interviews yet.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Previous</div>
            <div className="text-xl font-semibold">{previous?.overallScore ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Current</div>
            <div className="text-xl font-semibold">
              {current.overallScore ?? "—"}
              {delta != null && (
                <span
                  className={`ml-2 text-xs font-medium ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ALERT_ICON: Record<AnalyticsAlert["severity"], typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
};
const ALERT_CLASS: Record<AnalyticsAlert["severity"], string> = {
  info: "border-border bg-muted/30 text-foreground",
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
  critical: "border-destructive/30 bg-destructive/5 text-destructive",
};

function AlertsPanel({ alerts }: { alerts: AnalyticsAlert[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Bell className="h-4 w-4 text-brand" /> Notifications
      </div>
      {alerts.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing needs your attention right now — you're on track.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {alerts.map((a, i) => {
            const Icon = ALERT_ICON[a.severity];
            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm ${ALERT_CLASS[a.severity]}`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{a.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InsightsPanel({
  dashboard,
  onGenerate,
  isGenerating,
  generateError,
}: {
  dashboard: AnalyticsDashboard;
  onGenerate: () => void;
  isGenerating: boolean;
  generateError: string | null;
}) {
  const insights = dashboard.cachedInsights;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-brand" /> AI insights
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
          className="no-print"
        >
          {isGenerating ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-3.5 w-3.5" />
          )}
          {insights ? "Refresh insights" : "Generate insights"}
        </Button>
      </div>

      {generateError && <p className="mt-3 text-sm text-destructive">{generateError}</p>}

      {!insights ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Generate AI insights to see your top strengths, weaknesses, and a recommended next action
          based on everything in your dashboard above.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Gauge className="h-5 w-5 text-brand" />
              <div>
                <div className="text-xs text-muted-foreground">
                  Estimated interview success probability
                </div>
                <div className="text-xl font-semibold">{insights.estimatedSuccessProbability}%</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ArrowRight className="h-5 w-5 text-brand" />
              <div>
                <div className="text-xs text-muted-foreground">Recommended next action</div>
                <div className="text-sm font-medium">{insights.recommendedNextAction}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <ThumbsUp className="h-3.5 w-3.5" /> Top strengths
              </div>
              <ul className="mt-2 space-y-1.5">
                {insights.topStrengths.map((s, i) => (
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
                {insights.topWeaknesses.map((s, i) => (
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Most improved
                </div>
                <p className="mt-0.5 text-sm">{insights.mostImprovedArea}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-destructive">
                  Highest risk
                </div>
                <p className="mt-0.5 text-sm">{insights.highestRiskArea}</p>
              </div>
            </div>
          </div>

          {dashboard.insightsGeneratedAt && (
            <p className="text-xs text-muted-foreground">
              Generated {new Date(dashboard.insightsGeneratedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
