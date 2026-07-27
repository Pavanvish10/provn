import { createFileRoute } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { BusinessShell } from "@/components/BusinessNav";
import { requireBusinessAccount } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useMyCompany } from "@/lib/company-client";
import { useBusinessAnalytics } from "@/lib/business-analytics-client";

export const Route = createFileRoute("/business/analytics")({
  beforeLoad: requireBusinessAccount,
  head: () => ({ meta: [{ title: "Analytics · Provn Business" }] }),
  component: BusinessAnalyticsPage,
});

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#64748b"];

function BusinessAnalyticsPage() {
  const { data: user } = useCurrentUser();
  const { data: membership } = useMyCompany(user?.id);
  const companyId = membership?.company.id;
  const { data, isLoading } = useBusinessAnalytics(companyId);

  return (
    <BusinessShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real numbers from your postings and pipeline.
        </p>
      </div>

      {isLoading || !data ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Jobs posted" value={data.totalJobs} />
            <StatTile label="Open roles" value={data.openJobs} />
            <StatTile label="Applicants" value={data.totalApplicants} />
            <StatTile label="Followers" value={data.followers} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 font-display text-lg">Hiring funnel</div>
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
                      <YAxis type="category" dataKey="stage" tick={{ fontSize: 12 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 font-display text-lg">Jobs by work mode</div>
              {data.totalJobs === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No jobs posted yet.
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.jobsByWorkMode}
                        dataKey="count"
                        nameKey="mode"
                        outerRadius={100}
                        label
                      >
                        {data.jobsByWorkMode.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </BusinessShell>
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
