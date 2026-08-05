import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { VoiceWaveAnimation, type VoiceWaveMode } from "@/components/interview/VoiceWaveAnimation";
import type { InterviewStatus } from "@/components/interview/InterviewStatusBar";

const STATUS_WAVE_MODE: Record<InterviewStatus, VoiceWaveMode> = {
  speaking: "ai-speaking",
  listening: "listening",
  thinking: "idle",
  waiting: "idle",
};

const STATUS_GLOW: Record<InterviewStatus, string> = {
  speaking: "from-blue-500 via-cyan-400 to-blue-600 shadow-blue-500/50",
  listening: "from-cyan-500 via-blue-400 to-indigo-500 shadow-cyan-500/40",
  thinking: "from-amber-500 via-orange-400 to-amber-600 shadow-amber-500/40",
  waiting: "from-slate-600 via-slate-500 to-slate-700 shadow-slate-500/20",
};

const STATUS_CAPTION: Record<InterviewStatus, string> = {
  speaking: "Speaking",
  listening: "Listening to you…",
  thinking: "Thinking",
  waiting: "Waiting",
};

export interface AIInterviewerAvatarProps {
  status: InterviewStatus;
}

export function AIInterviewerAvatar({ status }: AIInterviewerAvatarProps) {
  const speaking = status === "speaking";

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex h-52 w-52 items-center justify-center sm:h-64 sm:w-64">
        <AnimatePresence>
          {speaking &&
            [0, 1, 2].map((ring) => (
              <motion.span
                key={ring}
                className="absolute inset-0 rounded-full border-2 border-blue-400/40"
                initial={{ scale: 1, opacity: 0.55 }}
                animate={{ scale: 1.45 + ring * 0.18, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, delay: ring * 0.45, ease: "easeOut" }}
              />
            ))}
        </AnimatePresence>

        <motion.div
          animate={
            speaking
              ? { scale: [1, 1.05, 1] }
              : status === "thinking"
                ? { scale: [1, 1.02, 1] }
                : { scale: [1, 1.018, 1] }
          }
          transition={{
            duration: speaking ? 0.7 : status === "thinking" ? 1.6 : 3.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={cn(
            "relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br shadow-2xl",
            STATUS_GLOW[status],
          )}
        >
          <div className="absolute inset-3 rounded-full bg-slate-950/20 backdrop-blur-sm" />
          <Sparkles
            className="relative h-20 w-20 text-white drop-shadow-lg sm:h-28 sm:w-28"
            strokeWidth={1.4}
          />
        </motion.div>
      </div>

      <div className="mt-5 flex h-10 flex-col items-center justify-center gap-1.5">
        <p className="text-sm font-medium text-white/70">{STATUS_CAPTION[status]}</p>
        {(status === "speaking" || status === "listening") && (
          <VoiceWaveAnimation mode={STATUS_WAVE_MODE[status]} barCount={9} className="h-5" />
        )}
      </div>
    </div>
  );
}
