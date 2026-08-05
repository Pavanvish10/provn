import { motion } from "framer-motion";
import { Wifi } from "lucide-react";

import { cn } from "@/lib/utils";

export type InternetQuality = "excellent" | "good" | "poor";

export interface InternetStatusProps {
  quality: InternetQuality;
  downloadMbps: number;
  pingMs: number;
}

const QUALITY_CONFIG: Record<
  InternetQuality,
  { label: string; gradient: string; text: string; bars: number }
> = {
  excellent: {
    label: "Excellent",
    gradient: "from-emerald-500 to-teal-400",
    text: "text-emerald-600 dark:text-emerald-400",
    bars: 4,
  },
  good: {
    label: "Good",
    gradient: "from-amber-500 to-orange-400",
    text: "text-amber-600 dark:text-amber-400",
    bars: 3,
  },
  poor: {
    label: "Poor",
    gradient: "from-rose-500 to-red-500",
    text: "text-rose-600 dark:text-rose-400",
    bars: 1,
  },
};

export function InternetStatus({ quality, downloadMbps, pingMs }: InternetStatusProps) {
  const config = QUALITY_CONFIG[quality];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
      className="rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:bg-white/5 sm:p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
              config.gradient,
            )}
          >
            <Wifi className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              Internet Status
            </h2>
            <p className="text-xs text-muted-foreground">
              {downloadMbps} Mbps · {pingMs}ms ping
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-end gap-0.5">
            {[1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                style={{ height: `${bar * 4 + 6}px` }}
                className={cn(
                  "w-1.5 rounded-full",
                  bar <= config.bars
                    ? cn("bg-gradient-to-t", config.gradient)
                    : "bg-black/10 dark:bg-white/10",
                )}
              />
            ))}
          </div>
          <span className={cn("text-sm font-semibold", config.text)}>{config.label}</span>
        </div>
      </div>
    </motion.div>
  );
}
