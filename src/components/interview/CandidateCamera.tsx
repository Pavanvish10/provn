import { motion } from "framer-motion";
import { MicOff, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CandidateCameraProps {
  micMuted: boolean;
  label?: string;
  className?: string;
}

export function CandidateCamera({ micMuted, label = "You", className }: CandidateCameraProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "relative aspect-[4/5] w-full max-w-[220px] overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/60 via-cyan-400/40 to-indigo-500/60 p-[1.5px] shadow-xl shadow-blue-950/40",
        className,
      )}
    >
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-slate-900/90 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.15),transparent_60%)]" />

        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
          <UserRound className="h-8 w-8 text-white/50" />
        </div>

        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-md">
          {micMuted && <MicOff className="h-3 w-3 text-rose-400" />}
          <span className="text-[10px] font-semibold text-white/85">{label}</span>
        </div>

        <div className="absolute right-2.5 top-2.5 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/60 backdrop-blur-md">
          Preview
        </div>
      </div>
    </motion.div>
  );
}
