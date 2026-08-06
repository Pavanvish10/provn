import { motion } from "framer-motion";
import { Target } from "lucide-react";

import type { InterviewPlan } from "@/services/job/InterviewPlanGenerator";

export interface InterviewFocusCardProps {
  plan: InterviewPlan;
}

export function InterviewFocusCard({ plan }: InterviewFocusCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
      className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        Interview Focus Areas
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {plan.focusAreas.length === 0 && (
          <span className="text-sm text-muted-foreground">
            No specific focus areas detected — expect a well-rounded interview.
          </span>
        )}
        {plan.focusAreas.map((area) => (
          <span
            key={area}
            className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-600 dark:text-violet-400"
          >
            {area}
          </span>
        ))}
      </div>

      <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Question Categories
      </div>
      <ul className="mt-2 space-y-1.5">
        {plan.questionCategories.map((category) => (
          <li key={category} className="flex items-center gap-2 text-sm text-foreground">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500" />
            {category}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
