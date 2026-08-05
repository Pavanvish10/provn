import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw } from "lucide-react";

export interface ResumeErrorCardProps {
  message: string;
  onRetry: () => void;
}

export function ResumeErrorCard({ message, onRetry }: ResumeErrorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col items-center gap-3 rounded-2xl border border-rose-300/40 bg-rose-500/10 p-6 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div>
        <p className="font-display text-sm font-semibold text-rose-700 dark:text-rose-400">
          Couldn't process that file
        </p>
        <p className="mt-1 text-sm text-rose-600/80 dark:text-rose-400/80">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-500"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Try Again
      </button>
    </motion.div>
  );
}
