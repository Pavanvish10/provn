import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Mic } from "lucide-react";

import { cn } from "@/lib/utils";

const BAR_COUNT = 28;

export interface MicrophoneTestProps {
  testing: boolean;
  detected: boolean;
  onTest: () => void;
}

export function MicrophoneTest({ testing, detected, onTest }: MicrophoneTestProps) {
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(6));

  useEffect(() => {
    if (!testing) {
      setLevels(Array(BAR_COUNT).fill(6));
      return;
    }
    const interval = setInterval(() => {
      setLevels((current) =>
        current.map((_, index) => {
          const wave = Math.sin(Date.now() / 180 + index * 0.6) * 0.5 + 0.5;
          return 8 + Math.round(wave * 32 + Math.random() * 16);
        }),
      );
    }, 120);
    return () => clearInterval(interval);
  }, [testing]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
      className="rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:bg-white/5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white shadow-sm">
            <Mic className="h-4.5 w-4.5" />
          </span>
          <h2 className="font-display text-base font-semibold text-foreground">Microphone</h2>
        </div>
        {detected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Microphone detected
          </span>
        )}
      </div>

      <div className="flex h-20 items-end justify-center gap-1 rounded-xl border border-white/10 bg-black/5 px-4 py-3 dark:bg-white/5">
        {levels.map((height, index) => (
          <motion.span
            key={index}
            animate={{ height: `${height}%` }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={cn(
              "w-1.5 rounded-full",
              testing
                ? "bg-gradient-to-t from-fuchsia-500 to-violet-400"
                : "bg-muted-foreground/20",
            )}
          />
        ))}
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
              : "bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-fuchsia-500/25 hover:opacity-95",
          )}
        >
          <Mic className="h-4 w-4" />
          {testing ? "Listening…" : "Test Microphone"}
        </motion.button>
        <p className="text-xs text-muted-foreground">
          {testing ? "Say a few words out loud." : "We'll check your mic picks up sound."}
        </p>
      </div>
    </motion.div>
  );
}
