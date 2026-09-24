import { createFileRoute } from "@tanstack/react-router";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

import { CollegeShell } from "@/components/CollegeNav";
import { requireCollegeAccount } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useMyCollege } from "@/lib/college-client";
import { useCollegeAnalytics } from "@/lib/college-analytics-client";

export const Route = createFileRoute("/college-analytics")({
  beforeLoad: requireCollegeAccount,
  head: () => ({ meta: [{ title: "Analytics · Provn College" }] }),
  component: CollegeAnalyticsPage,
});

function CollegeAnalyticsPage() {
  const { data: user } = useCurrentUser();
  const { data: membership } = useMyCollege(user?.id);
  const collegeId = membership?.college.id;
  const { data, isLoading } = useCollegeAnalytics(collegeId);

  return (
    <CollegeShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real numbers from your placement drives and student pipeline.
        </p>
      </div>

      {isLoading || !data ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Drives created" value={data.totalDrives} />
            <StatTile label="Published drives" value={data.publishedDrives} />
            <StatTile label="Applicants" value={data.totalApplicants} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 font-display text-lg">Placement funnel</div>
              {data.totalApplicants === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No applicants yet.
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.funnel} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-1 font-display text-lg">Pipeline conversion</div>
              <p className="mb-3 text-xs text-muted-foreground">
                % of all applications that have ever reached this stage or beyond.
              </p>
              {data.totalApplicants === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No applicants yet.
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.conversion} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis type="category" dataKey="stage" tick={{ fontSize: 12 }} width={80} />
                      <Tooltip
                        formatter={(value: number, _name, item) => [
                          `${value}% (${item.payload.reached} applications)`,
                          "Conversion",
                        ]}
                      />
                      <Bar dataKey="rate" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-5">
            <div className="mb-1 font-display text-lg">Time to stage</div>
            <p className="mb-3 text-xs text-muted-foreground">
              Average days from application to first reaching each stage.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {data.avgDaysToStage.map((s) => (
                <div
                  key={s.stage}
                  className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5"
                >
                  <span className="text-sm capitalize">{s.stage}</span>
                  {s.days == null ? (
                    <span className="text-xs text-muted-foreground">Not enough data yet</span>
                  ) : (
                    <span className="font-display text-lg text-brand">
                      {s.days} day{s.days === 1 ? "" : "s"}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({s.sampleSize})
                      </span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </CollegeShell>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="font-display text-2xl">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
