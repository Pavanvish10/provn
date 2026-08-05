import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type VoiceWaveMode = "ai-speaking" | "user-speaking" | "listening" | "idle";

const MODE_STYLES: Record<VoiceWaveMode, string> = {
  "ai-speaking": "bg-gradient-to-t from-blue-500 to-cyan-300",
  "user-speaking": "bg-gradient-to-t from-emerald-500 to-teal-300",
  listening: "bg-gradient-to-t from-cyan-500/70 to-cyan-200/70",
  idle: "bg-white/15",
};

const MODE_ACTIVE: Record<VoiceWaveMode, boolean> = {
  "ai-speaking": true,
  "user-speaking": true,
  listening: true,
  idle: false,
};

export interface VoiceWaveAnimationProps {
  mode: VoiceWaveMode;
  barCount?: number;
  className?: string;
}

export function VoiceWaveAnimation({ mode, barCount = 20, className }: VoiceWaveAnimationProps) {
  const active = MODE_ACTIVE[mode];
  const [levels, setLevels] = useState<number[]>(() => Array(barCount).fill(14));

  useEffect(() => {
    if (!active) {
      setLevels(Array(barCount).fill(14));
      return;
    }
    const amplitude = mode === "listening" ? 24 : 42;
    const speed = mode === "listening" ? 260 : 130;
    const interval = setInterval(() => {
      setLevels((current) =>
        current.map((_, index) => {
          const wave = Math.sin(Date.now() / speed + index * 0.55) * 0.5 + 0.5;
          return 10 + Math.round(wave * amplitude + Math.random() * (amplitude * 0.3));
        }),
      );
    }, 110);
    return () => clearInterval(interval);
  }, [active, mode, barCount]);

  return (
    <div className={cn("flex h-full items-end justify-center gap-1", className)}>
      {levels.map((height, index) => (
        <motion.span
          key={index}
          animate={{ height: `${height}%` }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          className={cn("w-1 rounded-full", MODE_STYLES[mode])}
        />
      ))}
    </div>
  );
}
