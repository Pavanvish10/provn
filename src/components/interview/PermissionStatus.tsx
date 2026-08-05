import { motion } from "framer-motion";
import { Camera, CheckCircle2, Circle, Mic, Volume2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface PermissionStatusProps {
  camera: boolean;
  microphone: boolean;
  speaker: boolean;
}

function PermissionRow({
  icon: Icon,
  label,
  granted,
}: {
  icon: LucideIcon;
  label: string;
  granted: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/5 px-4 py-3 dark:bg-white/5">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      {granted ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Allowed
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Circle className="h-4 w-4" />
          Pending
        </span>
      )}
    </div>
  );
}

export function PermissionStatus({ camera, microphone, speaker }: PermissionStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.25 }}
      className={cn(
        "rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:bg-white/5 sm:p-6",
      )}
    >
      <h2 className="mb-4 font-display text-base font-semibold text-foreground">
        Permission Status
      </h2>
      <div className="space-y-2.5">
        <PermissionRow icon={Camera} label="Camera" granted={camera} />
        <PermissionRow icon={Mic} label="Microphone" granted={microphone} />
        <PermissionRow icon={Volume2} label="Speaker" granted={speaker} />
      </div>
    </motion.div>
  );
}
