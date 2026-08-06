import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";

import { DashboardHeader } from "@/components/interview/DashboardHeader";
import { StatsCards } from "@/components/interview/StatsCards";
import { QuickActions } from "@/components/interview/QuickActions";
import { RecentInterviews } from "@/components/interview/RecentInterviews";
import { UpcomingInterview } from "@/components/interview/UpcomingInterview";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/interview/")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "AI Interview Dashboard · Provn" },
      {
        name: "description",
        content: "Track your AI interview performance, streaks, and upcoming sessions.",
      },
    ],
  }),
  component: InterviewDashboardPage,
});

function InterviewDashboardPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-violet-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/40">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-64 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative">
        <DashboardHeader />

        <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Welcome back, Alex 👋
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Here's how your interview prep is going.
            </p>
          </motion.div>

          <StatsCards />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentInterviews />
            </div>
            <UpcomingInterview />
          </div>

          <QuickActions />
        </main>
      </div>
    </div>
  );
}
