import { motion } from "framer-motion";
import { Building2, Clock, Gauge, Percent, User } from "lucide-react";

import type { JobAnalysisResult } from "@/services/job/JobAnalysisEngine";

export interface JobAnalysisSummaryProps {
  result: JobAnalysisResult;
}

const DIFFICULTY_LABEL: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export function JobAnalysisSummary({ result }: JobAnalysisSummaryProps) {
  const { company, role, interviewType, plan, skillMatch } = result;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5"
    >
      <h3 className="font-display text-base font-semibold text-foreground">Analysis Summary</h3>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat icon={Building2} label="Company" value={company?.name ?? "General"} />
        <SummaryStat icon={User} label="Role" value={role?.label ?? "Not selected"} />
        <SummaryStat icon={Gauge} label="Difficulty" value={DIFFICULTY_LABEL[plan.difficulty]} />
        <SummaryStat icon={Clock} label="Duration" value={`${plan.estimatedDurationMinutes}m`} />
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Percent className="h-3.5 w-3.5" />
        Skill Match — {interviewType} Interview
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${skillMatch.matchPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
          />
        </div>
        <span className="font-display text-sm font-bold text-foreground">
          {skillMatch.matchPercent}%
        </span>
      </div>
    </motion.div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/40 p-3 dark:bg-white/5">
      <Icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
      <div className="mt-1.5 truncate font-display text-sm font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
