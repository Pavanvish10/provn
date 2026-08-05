import { motion } from "framer-motion";
import { Timer } from "lucide-react";

import { cn } from "@/lib/utils";

const DURATIONS = [15, 30, 45, 60] as const;

export interface DurationSelectorProps {
  value: number | null;
  onChange: (duration: number) => void;
}

export function DurationSelector({ value, onChange }: DurationSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {DURATIONS.map((duration, index) => {
        const selected = value === duration;
        return (
          <motion.button
            key={duration}
            type="button"
            onClick={() => onChange(duration)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            aria-pressed={selected}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border p-5 shadow-sm backdrop-blur-xl transition-colors",
              selected
                ? "border-violet-400/60 bg-white/80 ring-2 ring-violet-400/50 dark:bg-white/10"
                : "border-white/20 bg-white/60 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10",
            )}
          >
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
                selected ? "from-violet-500 to-indigo-500" : "from-slate-400 to-slate-500",
              )}
            >
              <Timer className="h-4.5 w-4.5" />
            </span>
            <div className="font-display text-xl font-bold text-foreground">{duration}</div>
            <div className="text-xs text-muted-foreground">minutes</div>
          </motion.button>
        );
      })}
    </div>
  );
}
