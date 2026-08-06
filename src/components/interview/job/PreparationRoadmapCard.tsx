import { motion } from "framer-motion";
import { Route } from "lucide-react";

import type { RoadmapStep } from "@/services/job/PreparationRoadmapGenerator";

export interface PreparationRoadmapCardProps {
  roadmap: RoadmapStep[];
}

export function PreparationRoadmapCard({ roadmap }: PreparationRoadmapCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
      className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Route className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        Preparation Roadmap
      </div>

      <ol className="mt-4 space-y-4">
        {roadmap.map((step, index) => (
          <li key={step.order} className="relative flex gap-3 pl-1">
            <div className="flex flex-col items-center">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-[11px] font-bold text-white">
                {step.order}
              </span>
              {index < roadmap.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-white/20 dark:bg-white/10" />
              )}
            </div>
            <div className="pb-1">
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}
