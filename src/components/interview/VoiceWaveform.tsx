import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Bar-style live waveform. Pass `level` (0..1, from a real mic AnalyserNode)
 * for a reactive candidate-mic visualization, or `active` alone (no level)
 * for a rhythmic synthetic animation — used for the AI's TTS "speaking"
 * indicator, since browsers don't expose synthesis audio levels. */
export function VoiceWaveform({
  level,
  active,
  barCount = 5,
  className,
  barClassName,
}: {
  level?: number;
  active: boolean;
  barCount?: number;
  className?: string;
  barClassName?: string;
}) {
  const bars = Array.from({ length: barCount });
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {bars.map((_, i) => {
        const baseHeight = 6;
        const maxHeight = 28;
        const targetHeight =
          level !== undefined
            ? baseHeight + level * (maxHeight - baseHeight)
            : active
              ? maxHeight
              : baseHeight;
        return (
          <motion.span
            key={i}
            className={cn("w-1 rounded-full bg-current", barClassName)}
            animate={
              level !== undefined
                ? { height: Math.max(baseHeight, targetHeight) }
                : active
                  ? {
                      height: [
                        baseHeight,
                        maxHeight,
                        baseHeight * 1.5,
                        maxHeight * 0.7,
                        baseHeight,
                      ],
                    }
                  : { height: baseHeight }
            }
            transition={
              level !== undefined
                ? { duration: 0.1 }
                : active
                  ? { duration: 0.9 + i * 0.12, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.3 }
            }
          />
        );
      })}
    </div>
  );
}
