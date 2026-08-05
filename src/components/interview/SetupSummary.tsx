import { motion } from "framer-motion";
import { Check, ClipboardList } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SetupSummaryData {
  interviewType: string | null;
  company: string | null;
  role: string | null;
  difficulty: string | null;
  duration: number | null;
  language: string | null;
  voice: string | null;
}

export interface SetupSummaryProps {
  data: SetupSummaryData;
}

export function SetupSummary({ data }: SetupSummaryProps) {
  const rows: { label: string; value: string | null }[] = [
    { label: "Interview Type", value: data.interviewType },
    { label: "Company", value: data.company },
    { label: "Role", value: data.role },
    { label: "Difficulty", value: data.difficulty },
    { label: "Duration", value: data.duration ? `${data.duration} minutes` : null },
    { label: "Language", value: data.language },
    { label: "AI Voice", value: data.voice },
  ];
  const filledCount = rows.filter((row) => row.value).length;
  const progress = Math.round((filledCount / rows.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:bg-white/5"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-sm">
          <ClipboardList className="h-4.5 w-4.5" />
        </span>
        <div>
          <div className="font-display text-base font-semibold text-foreground">Your Setup</div>
          <div className="text-xs text-muted-foreground">
            {filledCount} of {rows.length} selected
          </div>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <motion.div
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500"
        />
      </div>

      <ul className="mt-5 space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span
              className={cn(
                "flex items-center gap-1.5 font-medium",
                row.value ? "text-foreground" : "text-muted-foreground/60",
              )}
            >
              {row.value ?? "Not selected"}
              {row.value && <Check className="h-3.5 w-3.5 text-emerald-500" />}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
