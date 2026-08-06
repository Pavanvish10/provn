import { motion } from "framer-motion";
import { ClipboardPaste, Sparkles } from "lucide-react";

import type { SampleJobDescription } from "@/services/job/JobDescriptionParser";
import { cn } from "@/lib/utils";

export interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  samples: SampleJobDescription[];
  selectedSampleId: string | null;
  onSelectSample: (sample: SampleJobDescription) => void;
}

export function JobDescriptionInput({
  value,
  onChange,
  samples,
  selectedSampleId,
  onSelectSample,
}: JobDescriptionInputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ClipboardPaste className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        Paste a Job Description
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste the full job description here — responsibilities, required skills, experience, etc."
        rows={10}
        className="mt-3 w-full resize-y rounded-xl border border-white/20 bg-white/70 p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 dark:bg-white/5"
      />

      <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Or choose a sample job description
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {samples.map((sample) => (
          <button
            key={sample.id}
            type="button"
            onClick={() => onSelectSample(sample)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
              selectedSampleId === sample.id
                ? "border-violet-400/60 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                : "border-white/20 bg-white/50 text-muted-foreground hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10",
            )}
          >
            {sample.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
