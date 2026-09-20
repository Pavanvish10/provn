import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Mic,
  History,
  FileBarChart,
  Dumbbell,
  Building2,
  Flame,
  Star,
  Trophy,
  Target,
  ArrowRight,
  Briefcase,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useProfile } from "@/lib/profile-client";
import { useMyVoiceInterviewStats } from "@/lib/voice-interview-client";

export const Route = createFileRoute("/interview-voice")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "AI Voice Interview · Provn" },
      {
        name: "description",
        content:
          "Practice real, spoken interviews with an AI interviewer and get a full performance report.",
      },
    ],
  }),
  component: InterviewDashboard,
});

const PACKS = [
  { company: "Google", role: "Software Engineer", type: "faang" as const },
  { company: "Amazon", role: "SDE II", type: "faang" as const },
  { company: "Meta", role: "Product Manager", type: "faang" as const },
  { company: "", role: "Founding Engineer", type: "startup" as const },
];

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1.5 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function DashboardCard({
  to,
  search,
  icon,
  title,
  description,
}: {
  to: string;
  search?: Record<string, string>;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link to={to} search={search}>
      <motion.div
        whileHover={{ y: -3 }}
        className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition hover:border-brand/40 hover:shadow-lg"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand transition group-hover:scale-105">
          {icon}
        </div>
        <div className="mt-4 font-display text-lg font-semibold">{title}</div>
        <p className="mt-1 flex-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 flex items-center gap-1 text-sm font-medium text-brand">
          Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </div>
      </motion.div>
    </Link>
  );
}

function InterviewDashboard() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const { data: stats } = useMyVoiceInterviewStats(user?.id);

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">AI Voice Interview</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Practice real, spoken interviews with an AI interviewer — then get a detailed, honest
            performance report.
          </p>
        </div>
        <Link
          to="/interview/setup"
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/20 transition hover:opacity-90"
        >
          <Mic className="h-4 w-4" /> Start AI Interview
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          icon={<Target className="h-3.5 w-3.5" />}
          label="Upcoming"
          value={stats?.totalInterviews ? "None" : "Start now"}
        />
        <StatTile
          icon={<Trophy className="h-3.5 w-3.5" />}
          label="Avg Score"
          value={stats?.averageScore != null ? stats.averageScore : "—"}
        />
        <StatTile
          icon={<History className="h-3.5 w-3.5" />}
          label="Interviews"
          value={stats?.totalInterviews ?? 0}
        />
        <StatTile
          icon={<Flame className="h-3.5 w-3.5" />}
          label="Streak"
          value={`${profile?.streak ?? 0}d`}
        />
        <StatTile icon={<Star className="h-3.5 w-3.5" />} label="XP" value={profile?.xp ?? 0} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          to="/interview/setup"
          icon={<Mic className="h-5 w-5" />}
          title="Start AI Interview"
          description="Configure type, role, difficulty and go live with a spoken AI interviewer."
        />
        <DashboardCard
          to="/interview/report"
          icon={<History className="h-5 w-5" />}
          title="Interview History"
          description="Review every past session, its score, and reopen the full report."
        />
        <DashboardCard
          to="/interview/report"
          icon={<FileBarChart className="h-5 w-5" />}
          title="AI Reports"
          description="Deep performance breakdowns across communication, confidence and more."
        />
        <DashboardCard
          to="/interview/setup"
          icon={<Dumbbell className="h-5 w-5" />}
          title="Practice Mode"
          description="Low-pressure practice with easier questions — repeat as often as you like."
        />
        <DashboardCard
          to="/interview/setup"
          icon={<Building2 className="h-5 w-5" />}
          title="Company Interview Packs"
          description="Curated FAANG and startup interview presets, ready to launch instantly."
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent Reports</h2>
          <Link to="/interview/report" className="text-sm font-medium text-brand hover:underline">
            View all
          </Link>
        </div>
        {stats?.recent && stats.recent.length > 0 ? (
          <div className="space-y-2">
            {stats.recent.map((session) => (
              <Link
                key={session.id}
                to="/interview/report"
                className="flex items-center justify-between rounded-xl border border-border p-3 transition hover:border-foreground/20"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {session.role}
                      {session.company ? ` · ${session.company}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="font-display text-lg font-bold text-brand">
                  {session.overall_score ?? "—"}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No reports yet — complete your first AI interview to see it here.
          </p>
        )}
      </div>
    </AppShell>
  );
}

// Referenced by the Company Interview Packs card's destination page.
export const INTERVIEW_PACKS = PACKS;
