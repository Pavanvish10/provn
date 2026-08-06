import { motion } from "framer-motion";
import { Brain, FileSearch, ListChecks, Route } from "lucide-react";

export interface AnalysisProgressProps {
  /** 0-3, which step is currently active. */
  step: number;
}

const STEPS = [
  { label: "Parsing job description", icon: FileSearch },
  { label: "Matching skills against the role", icon: ListChecks },
  { label: "Building your interview plan", icon: Brain },
  { label: "Generating your preparation roadmap", icon: Route },
];

export function AnalysisProgress({ step }: AnalysisProgressProps) {
  const clamped = Math.max(0, Math.min(STEPS.length - 1, step));
  const percent = Math.round(((clamped + 1) / STEPS.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="h-5 w-5" />
          </motion.span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Analyzing your job description…</p>
          <p className="text-xs text-muted-foreground">{STEPS[clamped].label}</p>
        </div>
        <span className="font-display text-sm font-bold text-violet-600 dark:text-violet-400">
          {percent}%
        </span>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          const done = index < clamped;
          const active = index === clamped;
          return (
            <span
              key={item.label}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                done
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : active
                    ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                    : "bg-black/5 text-muted-foreground dark:bg-white/10"
              }`}
            >
              <Icon className="h-3 w-3" />
              {item.label}
            </span>
          );
        })}
      </div>
    </motion.div>
  );
}
