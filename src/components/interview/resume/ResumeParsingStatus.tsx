import { motion } from "framer-motion";
import { Check, FileSearch, ListChecks, Loader2, ScanText } from "lucide-react";

import { cn } from "@/lib/utils";

export type ParsingStage = "reading" | "extracting" | "analyzing" | "done";

const STAGES: { id: ParsingStage; label: string; icon: typeof FileSearch }[] = [
  { id: "reading", label: "Reading file", icon: FileSearch },
  { id: "extracting", label: "Extracting text", icon: ScanText },
  { id: "analyzing", label: "Identifying skills & experience", icon: ListChecks },
  { id: "done", label: "Done", icon: Check },
];

export interface ResumeParsingStatusProps {
  stage: ParsingStage;
}

export function ResumeParsingStatus({ stage }: ResumeParsingStatusProps) {
  const currentIndex = STAGES.findIndex((s) => s.id === stage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5"
    >
      <h3 className="font-display text-sm font-semibold text-foreground">Parsing your resume…</h3>
      <div className="mt-4 space-y-3">
        {STAGES.filter((s) => s.id !== "done").map((s, index) => {
          const Icon = s.icon;
          const isComplete = index < currentIndex;
          const isActive = index === currentIndex;
          return (
            <div key={s.id} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                  isComplete
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : isActive
                      ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                      : "bg-black/5 text-muted-foreground dark:bg-white/10",
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>
              <span
                className={cn(
                  "text-sm",
                  isComplete || isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
