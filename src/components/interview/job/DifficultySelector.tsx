import { motion } from "framer-motion";
import { Check } from "lucide-react";

import type { DifficultyLevel } from "@/ai/QuestionDifficulty";
import { cn } from "@/lib/utils";

export interface DifficultySelectorProps {
  value: DifficultyLevel | null;
  recommended: DifficultyLevel | null;
  onChange: (difficulty: DifficultyLevel | null) => void;
}

const LEVELS: { id: DifficultyLevel; label: string; description: string }[] = [
  { id: "easy", label: "Easy", description: "Warm-up pace, foundational questions." },
  { id: "medium", label: "Medium", description: "Balanced depth and pace." },
  { id: "hard", label: "Hard", description: "Bar-raiser pace, deep follow-ups." },
];

export function DifficultySelector({ value, recommended, onChange }: DifficultySelectorProps) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {LEVELS.map((level, index) => {
          const selected = value === level.id;
          return (
            <motion.button
              key={level.id}
              type="button"
              onClick={() => onChange(selected ? null : level.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              aria-pressed={selected}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left shadow-sm backdrop-blur-xl transition-colors",
                selected
                  ? "border-violet-400/60 bg-white/80 ring-2 ring-violet-400/50 dark:bg-white/10"
                  : "border-white/20 bg-white/60 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10",
              )}
            >
              <span className="flex w-full items-center justify-between text-sm font-semibold text-foreground">
                {level.label}
                {selected && <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />}
              </span>
              <span className="text-xs text-muted-foreground">{level.description}</span>
              {recommended === level.id && (
                <span className="mt-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Recommended
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Optional — leave unselected to let the company and your skill match decide.
      </p>
    </div>
  );
}
