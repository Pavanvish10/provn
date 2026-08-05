import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { InterviewScoreBand, RecentInterview } from "@/types/interview";

const RECENT_INTERVIEWS: RecentInterview[] = [
  {
    id: "1",
    company: "Google",
    role: "Software Engineer II",
    logoInitials: "G",
    logoGradient: "from-blue-500 to-sky-400",
    score: 92,
    scoreBand: "excellent",
    date: "Aug 3, 2026",
  },
  {
    id: "2",
    company: "Amazon",
    role: "SDE II",
    logoInitials: "A",
    logoGradient: "from-orange-500 to-amber-400",
    score: 78,
    scoreBand: "good",
    date: "Jul 28, 2026",
  },
  {
    id: "3",
    company: "Meta",
    role: "Product Manager",
    logoInitials: "M",
    logoGradient: "from-indigo-500 to-blue-500",
    score: 65,
    scoreBand: "average",
    date: "Jul 21, 2026",
  },
  {
    id: "4",
    company: "Netflix",
    role: "Frontend Engineer",
    logoInitials: "N",
    logoGradient: "from-rose-500 to-red-500",
    score: 54,
    scoreBand: "needsWork",
    date: "Jul 14, 2026",
  },
  {
    id: "5",
    company: "Stripe",
    role: "Backend Engineer",
    logoInitials: "S",
    logoGradient: "from-violet-500 to-purple-500",
    score: 88,
    scoreBand: "excellent",
    date: "Jul 9, 2026",
  },
];

const SCORE_BAND_STYLES: Record<InterviewScoreBand, string> = {
  excellent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  good: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  average: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  needsWork: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function RecentInterviews() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:bg-white/5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">Recent Interviews</h2>
        <button
          type="button"
          className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
        >
          View all
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-3 font-medium">Company</th>
              <th className="pb-3 font-medium">Role</th>
              <th className="pb-3 font-medium">Score</th>
              <th className="pb-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_INTERVIEWS.map((interview, index) => (
              <motion.tr
                key={interview.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
                className="border-t border-white/10 text-sm transition-colors hover:bg-white/40 dark:hover:bg-white/5"
              >
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-semibold text-white shadow-sm",
                        interview.logoGradient,
                      )}
                    >
                      {interview.logoInitials}
                    </div>
                    <span className="font-medium text-foreground">{interview.company}</span>
                  </div>
                </td>
                <td className="py-3 text-muted-foreground">{interview.role}</td>
                <td className="py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                      SCORE_BAND_STYLES[interview.scoreBand],
                    )}
                  >
                    {interview.score}%
                  </span>
                </td>
                <td className="py-3 text-muted-foreground">{interview.date}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
