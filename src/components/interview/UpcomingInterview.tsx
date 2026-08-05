import { motion } from "framer-motion";
import { Calendar, Clock, Sparkles } from "lucide-react";

import type { UpcomingInterview as UpcomingInterviewType } from "@/types/interview";

const UPCOMING: UpcomingInterviewType = {
  company: "Google",
  role: "Software Engineer II",
  logoInitials: "G",
  logoGradient: "from-blue-500 to-sky-400",
  date: "Aug 10, 2026",
  time: "3:00 PM",
  daysAway: 4,
  interviewType: "Technical + Behavioral",
};

export function UpcomingInterview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-600 p-6 text-white shadow-lg shadow-fuchsia-500/20"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80">
        <Sparkles className="h-3.5 w-3.5" />
        Upcoming Interview
      </div>

      <div className="relative mt-4 flex items-center gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold backdrop-blur-md`}
        >
          {UPCOMING.logoInitials}
        </div>
        <div>
          <div className="font-display text-xl font-bold">{UPCOMING.company}</div>
          <div className="text-sm text-white/80">{UPCOMING.role}</div>
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center gap-4 text-sm text-white/90">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {UPCOMING.date}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {UPCOMING.time}
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-md">
          {UPCOMING.interviewType}
        </span>
      </div>

      <div className="relative mt-6 flex items-center justify-between">
        <div className="text-sm text-white/80">
          In <span className="font-semibold text-white">{UPCOMING.daysAway} days</span>
        </div>
        <button
          type="button"
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-violet-700 shadow-md transition hover:bg-white/90"
        >
          Prepare Now
        </button>
      </div>
    </motion.div>
  );
}
