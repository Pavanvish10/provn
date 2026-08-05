import { motion } from "framer-motion";
import { Circle } from "lucide-react";

import { cn } from "@/lib/utils";

export interface RecordingIndicatorProps {
  recording: boolean;
  elapsedSeconds: number;
  className?: string;
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function RecordingIndicator({
  recording,
  elapsedSeconds,
  className,
}: RecordingIndicatorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-md",
        recording
          ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
          : "border-white/10 bg-white/5 text-white/40",
        className,
      )}
    >
      {recording ? (
        <motion.span
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Circle className="h-2.5 w-2.5 fill-rose-500 text-rose-500" />
        </motion.span>
      ) : (
        <Circle className="h-2.5 w-2.5" />
      )}
      {recording ? `REC ${formatElapsed(elapsedSeconds)}` : "Not recording"}
    </div>
  );
}
