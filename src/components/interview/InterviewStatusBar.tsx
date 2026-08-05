import { motion } from "framer-motion";
import { Brain, Clock, Ear, Volume2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type InterviewStatus = "listening" | "thinking" | "speaking" | "waiting";

const STATUS_CONFIG: Record<
  InterviewStatus,
  { label: string; icon: LucideIcon; dot: string; text: string; ring: string }
> = {
  listening: {
    label: "Listening",
    icon: Ear,
    dot: "bg-cyan-400",
    text: "text-cyan-300",
    ring: "ring-cyan-400/30",
  },
  thinking: {
    label: "Thinking",
    icon: Brain,
    dot: "bg-amber-400",
    text: "text-amber-300",
    ring: "ring-amber-400/30",
  },
  speaking: {
    label: "Speaking",
    icon: Volume2,
    dot: "bg-blue-400",
    text: "text-blue-300",
    ring: "ring-blue-400/30",
  },
  waiting: {
    label: "Waiting",
    icon: Clock,
    dot: "bg-slate-400",
    text: "text-slate-300",
    ring: "ring-slate-400/30",
  },
};

export interface InterviewStatusBarProps {
  status: InterviewStatus;
  className?: string;
}

export function InterviewStatusBar({ status, className }: InterviewStatusBarProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 shadow-inner ring-1 backdrop-blur-md",
        config.ring,
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        <motion.span
          animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut" }}
          className={cn("absolute inline-flex h-full w-full rounded-full", config.dot)}
        />
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", config.dot)} />
      </span>
      <Icon className={cn("h-3.5 w-3.5", config.text)} />
      <span className={cn("text-xs font-semibold", config.text)}>{config.label}</span>
    </motion.div>
  );
}
