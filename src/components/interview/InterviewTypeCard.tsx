import { motion } from "framer-motion";
import { Check, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface InterviewTypeCardProps {
  label: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  selected: boolean;
  onSelect: () => void;
}

export function InterviewTypeCard({
  label,
  description,
  icon: Icon,
  gradient,
  selected,
  onSelect,
}: InterviewTypeCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col items-start overflow-hidden rounded-2xl border p-5 text-left shadow-sm backdrop-blur-xl transition-colors",
        selected
          ? "border-violet-400/60 bg-white/80 ring-2 ring-violet-400/50 dark:bg-white/10"
          : "border-white/20 bg-white/60 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10",
      )}
    >
      {selected && (
        <motion.div
          layoutId="interview-type-check"
          className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-md"
        >
          <Check className="h-3.5 w-3.5" />
        </motion.div>
      )}
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform group-hover:scale-105",
          gradient,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 font-display text-base font-semibold text-foreground">{label}</div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </motion.button>
  );
}
