import { motion } from "framer-motion";
import { FileUp } from "lucide-react";

export interface UploadProgressProps {
  filename: string;
  percent: number;
}

export function UploadProgress({ filename, percent }: UploadProgressProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
          <FileUp className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{filename}</p>
          <p className="text-xs text-muted-foreground">Uploading…</p>
        </div>
        <span className="font-display text-sm font-bold text-violet-600 dark:text-violet-400">
          {clamped}%
        </span>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500"
        />
      </div>
    </motion.div>
  );
}
