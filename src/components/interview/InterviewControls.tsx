import { motion } from "framer-motion";
import { Mic, MicOff, Pause, PhoneOff, Play, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

export interface InterviewControlsProps {
  micMuted: boolean;
  onToggleMic: () => void;
  paused: boolean;
  onTogglePause: () => void;
  onEnd: () => void;
  onSettings: () => void;
}

function SideButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full border transition",
        active
          ? "border-blue-400/40 bg-blue-500/20 text-blue-200"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

export function InterviewControls({
  micMuted,
  onToggleMic,
  paused,
  onTogglePause,
  onEnd,
  onSettings,
}: InterviewControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 border-t border-white/10 bg-black/30 px-4 py-5 backdrop-blur-xl sm:gap-5">
      <SideButton onClick={onSettings} label="Settings">
        <Settings className="h-5 w-5" />
      </SideButton>

      <SideButton onClick={onToggleMic} active={micMuted} label={micMuted ? "Unmute" : "Mute"}>
        {micMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </SideButton>

      <motion.button
        type="button"
        onClick={onToggleMic}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full shadow-xl transition sm:h-[4.5rem] sm:w-[4.5rem]",
          micMuted
            ? "bg-white/10 text-white/60 shadow-none"
            : "bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-blue-500/40",
        )}
      >
        {micMuted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
      </motion.button>

      <SideButton onClick={onTogglePause} active={paused} label={paused ? "Resume" : "Pause"}>
        {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
      </SideButton>

      <button
        type="button"
        onClick={onEnd}
        aria-label="End interview"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white transition hover:bg-rose-500"
      >
        <PhoneOff className="h-5 w-5" />
      </button>
    </div>
  );
}
