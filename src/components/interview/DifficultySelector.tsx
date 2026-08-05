import { motion } from "framer-motion";
import { Flame, Gauge, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

const DIFFICULTIES = [
  {
    id: "Easy",
    description: "Warm-up questions, gentle pacing",
    icon: Gauge,
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    id: "Medium",
    description: "Balanced mix, real interview pace",
    icon: Zap,
    gradient: "from-amber-500 to-orange-400",
  },
  {
    id: "Hard",
    description: "High pressure, senior-level depth",
    icon: Flame,
    gradient: "from-rose-500 to-red-500",
  },
] as const;

export interface DifficultySelectorProps {
  value: string | null;
  onChange: (difficulty: string) => void;
}

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {DIFFICULTIES.map((difficulty, index) => {
        const Icon = difficulty.icon;
        const selected = value === difficulty.id;
        return (
          <motion.button
            key={difficulty.id}
            type="button"
            onClick={() => onChange(difficulty.id)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            aria-pressed={selected}
            className={cn(
              "flex flex-col items-start gap-3 rounded-2xl border p-5 text-left shadow-sm backdrop-blur-xl transition-colors",
              selected
                ? "border-violet-400/60 bg-white/80 ring-2 ring-violet-400/50 dark:bg-white/10"
                : "border-white/20 bg-white/60 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10",
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
                difficulty.gradient,
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <div className="font-display text-base font-semibold text-foreground">
                {difficulty.id}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{difficulty.description}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
