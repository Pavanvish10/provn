import { motion, AnimatePresence } from "framer-motion";
import { Bot } from "lucide-react";

import { VoiceWaveform } from "@/components/interview/VoiceWaveform";
import { cn } from "@/lib/utils";

/** The large centered AI interviewer avatar — pulses/glows while the AI is
 * speaking, breathes gently while idle, and shows a "thinking" dot pulse
 * while the next question is being generated. */
export function AiAvatar({
  speaking,
  thinking,
  className,
}: {
  speaking: boolean;
  thinking: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative flex flex-col items-center justify-center", className)}>
      <div className="relative flex h-40 w-40 items-center justify-center sm:h-56 sm:w-56">
        <AnimatePresence>
          {speaking &&
            [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border-2 border-brand/40"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.5 + i * 0.15, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
              />
            ))}
        </AnimatePresence>

        <motion.div
          className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-brand via-brand to-slate-900 shadow-2xl"
          animate={speaking ? { scale: [1, 1.04, 1] } : { scale: [1, 1.015, 1] }}
          transition={{ duration: speaking ? 0.6 : 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Bot className="h-16 w-16 text-white sm:h-24 sm:w-24" strokeWidth={1.5} />
        </motion.div>
      </div>

      <div className="mt-5 flex h-8 items-center text-brand">
        {thinking ? (
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </span>
            Thinking…
          </div>
        ) : speaking ? (
          <VoiceWaveform active barCount={5} />
        ) : (
          <span className="text-sm text-muted-foreground">Listening for your answer…</span>
        )}
      </div>
    </div>
  );
}
