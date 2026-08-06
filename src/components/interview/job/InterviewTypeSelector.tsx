import { motion } from "framer-motion";
import { Check, type LucideIcon, Briefcase, Building2, Code2, Rocket, Users } from "lucide-react";

import { INTERVIEW_TYPE_LABELS, type InterviewType } from "@/ai/InterviewContext";
import { cn } from "@/lib/utils";

export interface InterviewTypeSelectorProps {
  value: string | null;
  onChange: (interviewType: InterviewType) => void;
}

const ICONS: Record<InterviewType, LucideIcon> = {
  hr: Users,
  technical: Code2,
  startup: Rocket,
  faang: Building2,
  managerial: Briefcase,
};

const TYPES = Object.keys(INTERVIEW_TYPE_LABELS) as InterviewType[];

export function InterviewTypeSelector({ value, onChange }: InterviewTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {TYPES.map((type, index) => {
        const Icon = ICONS[type];
        const selected = value === type;
        return (
          <motion.button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            aria-pressed={selected}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 text-center shadow-sm backdrop-blur-xl transition-colors",
              selected
                ? "border-violet-400/60 bg-white/80 ring-2 ring-violet-400/50 dark:bg-white/10"
                : "border-white/20 bg-white/60 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10",
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-medium text-foreground">
              {INTERVIEW_TYPE_LABELS[type]}
            </span>
            {selected && <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />}
          </motion.button>
        );
      })}
    </div>
  );
}
