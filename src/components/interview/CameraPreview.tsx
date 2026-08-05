import { AnimatePresence, motion } from "framer-motion";
import { Camera, CameraOff, CheckCircle2, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface CameraPreviewProps {
  enabled: boolean;
  loading: boolean;
  detected: boolean;
  skipped: boolean;
  onEnable: () => void;
  onSkip: () => void;
}

export function CameraPreview({
  enabled,
  loading,
  detected,
  skipped,
  onEnable,
  onSkip,
}: CameraPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:bg-white/5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-sm">
            <Camera className="h-4.5 w-4.5" />
          </span>
          <h2 className="font-display text-base font-semibold text-foreground">Camera</h2>
        </div>
        {detected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Camera detected
          </span>
        )}
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6"
            >
              <Skeleton className="h-16 w-16 rounded-full bg-white/10" />
              <Skeleton className="h-3 w-32 bg-white/10" />
              <p className="text-xs text-white/60">Starting camera preview…</p>
            </motion.div>
          ) : enabled ? (
            <motion.div
              key="enabled"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30"
              >
                <UserRound className="h-12 w-12 text-white/70" />
              </motion.div>
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-md">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-white/80">
                  Live preview
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="disabled"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/50"
            >
              <CameraOff className="h-10 w-10" />
              <p className="text-xs">Camera preview will appear here</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <motion.button
          type="button"
          onClick={onEnable}
          disabled={loading || enabled}
          whileHover={loading || enabled ? undefined : { scale: 1.02 }}
          whileTap={loading || enabled ? undefined : { scale: 0.98 }}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition",
            enabled
              ? "cursor-default bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : loading
                ? "cursor-wait bg-muted text-muted-foreground"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-500/25 hover:opacity-95",
          )}
        >
          <Camera className="h-4 w-4" />
          {enabled ? "Camera Enabled" : loading ? "Enabling…" : "Enable Camera"}
        </motion.button>

        {!enabled && (
          <button
            type="button"
            onClick={onSkip}
            className={cn(
              "text-sm font-medium underline-offset-4 transition hover:underline",
              skipped ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
            )}
          >
            {skipped ? "Camera skipped" : "Skip for now"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
