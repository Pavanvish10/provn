import { Mic, MicOff, Pause, Play, PhoneOff } from "lucide-react";

import { cn } from "@/lib/utils";

function ControlButton({
  onClick,
  active,
  danger,
  label,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:w-14",
        danger
          ? "bg-rose-600 text-white hover:bg-rose-500"
          : active
            ? "bg-white text-slate-900 hover:bg-white/90"
            : "bg-white/10 text-white hover:bg-white/20",
      )}
    >
      {children}
    </button>
  );
}

export function LiveInterviewControls({
  micMuted,
  onToggleMic,
  paused,
  onTogglePause,
  onEnd,
}: {
  micMuted: boolean;
  onToggleMic: () => void;
  paused: boolean;
  onTogglePause: () => void;
  onEnd: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4 border-t border-white/10 bg-black/30 px-4 py-5 backdrop-blur-md">
      <ControlButton onClick={onToggleMic} active={micMuted} label={micMuted ? "Unmute" : "Mute"}>
        {micMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </ControlButton>
      <ControlButton onClick={onTogglePause} active={paused} label={paused ? "Resume" : "Pause"}>
        {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
      </ControlButton>
      <ControlButton onClick={onEnd} danger label="End interview">
        <PhoneOff className="h-5 w-5" />
      </ControlButton>
    </div>
  );
}
