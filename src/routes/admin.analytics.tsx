import { createFileRoute } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { requireAdmin } from "@/lib/auth-guard";
import { useAdminAnalytics, PREMIUM_PRICE_INR } from "@/lib/admin-analytics-client";

export const Route = createFileRoute("/admin/analytics")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Analytics · Admin · Provn" }] }),
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const { data, isLoading } = useAdminAnalytics();

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real platform-wide counts. Revenue is an estimate (premium subscribers × ₹
          {PREMIUM_PRICE_INR}) — payments aren't wired up yet, so this isn't billed revenue.
        </p>
      </div>

      {isLoading || !data ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Total users" value={data.totalUsers} />
            <StatTile label="Total posts" value={data.totalPosts} />
            <StatTile label="Challenges solved" value={data.challengesSolved} />
            <StatTile
              label="Companies"
              value={`${data.verifiedCompanies}/${data.totalCompanies} verified`}
            />
            <StatTile label="Premium subscribers" value={data.premiumSubscribers} />
            <StatTile
              label="Est. monthly revenue"
              value={`₹${data.estimatedMonthlyRevenue.toLocaleString()}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 font-display text-lg">Jobs by status</div>
              {data.jobsByStatus.every((j) => j.count === 0) ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No jobs posted yet.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.jobsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="var(--color-brand, #6366f1)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 font-display text-lg">Weekly signups</div>
              {data.weeklySignups.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Not enough data yet.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.weeklySignups}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="var(--color-brand, #6366f1)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-xl">{value}</div>
    </div>
  );
}
