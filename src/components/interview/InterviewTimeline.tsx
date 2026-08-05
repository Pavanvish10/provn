import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STAGES = [
  "Introduction",
  "Background",
  "Technical Q1",
  "Technical Q2",
  "Problem Solving",
  "Behavioral",
  "Wrap-up",
];

export interface InterviewTimelineProps {
  currentIndex: number;
}

export function InterviewTimeline({ currentIndex }: InterviewTimelineProps) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:p-5">
      <div className="flex min-w-max items-center">
        {STAGES.map((stage, index) => {
          const completed = index < currentIndex;
          const current = index === currentIndex;
          return (
            <div key={stage} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  layout
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                    completed
                      ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                      : current
                        ? "border-blue-400/60 bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-md shadow-blue-500/40"
                        : "border-white/10 bg-white/5 text-white/40",
                  )}
                >
                  {completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </motion.div>
                <span
                  className={cn(
                    "max-w-[76px] text-center text-[10px] leading-tight",
                    current ? "font-semibold text-white" : "text-white/40",
                  )}
                >
                  {stage}
                </span>
              </div>
              {index !== STAGES.length - 1 && (
                <div
                  className={cn(
                    "mx-1.5 mb-4 h-0.5 w-8 rounded-full sm:w-12",
                    completed ? "bg-emerald-400/40" : "bg-white/10",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
