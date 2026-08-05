import { motion } from "framer-motion";
import { CheckCircle2, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type SpeakerStatus = "idle" | "testing" | "ready";

export interface SpeakerTestProps {
  status: SpeakerStatus;
  onTest: () => void;
}

export function SpeakerTest({ status, onTest }: SpeakerTestProps) {
  const testing = status === "testing";
  const ready = status === "ready";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
      className="rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:bg-white/5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-sm">
            <Volume2 className="h-4.5 w-4.5" />
          </span>
          <h2 className="font-display text-base font-semibold text-foreground">Speaker</h2>
        </div>
        {ready && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Speaker ready
          </span>
        )}
      </div>

      <div className="flex h-20 items-center justify-center rounded-xl border border-white/10 bg-black/5 dark:bg-white/5">
        <div className="relative flex h-14 w-14 items-center justify-center">
          {testing && (
            <>
              <motion.span
                animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-emerald-400/40"
              />
              <motion.span
                animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                className="absolute inset-0 rounded-full bg-emerald-400/40"
              />
            </>
          )}
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full text-white shadow-md",
              ready
                ? "bg-gradient-to-br from-emerald-500 to-teal-400"
                : "bg-gradient-to-br from-slate-400 to-slate-500",
            )}
          >
            <Volume2 className="h-5 w-5" />
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <motion.button
          type="button"
          onClick={onTest}
          disabled={testing}
          whileHover={testing ? undefined : { scale: 1.02 }}
          whileTap={testing ? undefined : { scale: 0.98 }}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition",
            testing
              ? "cursor-wait bg-muted text-muted-foreground"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/25 hover:opacity-95",
          )}
        >
          <Volume2 className="h-4 w-4" />
          {testing ? "Playing…" : "Test Speaker"}
        </motion.button>
        <p className="text-xs text-muted-foreground">
          {testing ? "You should hear a short chime." : "We'll play a quick test sound."}
        </p>
      </div>
    </motion.div>
  );
}
