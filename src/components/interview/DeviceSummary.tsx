import { motion } from "framer-motion";
import {
  Building2,
  Camera,
  Check,
  ClipboardList,
  Languages,
  Mic,
  Timer,
  Volume2,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { InternetQuality } from "@/components/interview/InternetStatus";

export interface DeviceSummarySetup {
  company: string;
  role: string;
  duration: number;
  language: string;
}

export interface DeviceSummaryProps {
  cameraReady: boolean;
  cameraSkipped: boolean;
  microphoneReady: boolean;
  speakerReady: boolean;
  internetQuality: InternetQuality;
  setup: DeviceSummarySetup;
}

function StatusRow({
  icon: Icon,
  label,
  ok,
  okLabel,
}: {
  icon: LucideIcon;
  label: string;
  ok: boolean;
  okLabel: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span
        className={cn(
          "flex items-center gap-1 font-medium",
          ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60",
        )}
      >
        {ok ? okLabel : "Not ready"}
        {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </span>
    </div>
  );
}

const INTERNET_LABEL: Record<InternetQuality, string> = {
  excellent: "Excellent",
  good: "Good",
  poor: "Poor",
};

export function DeviceSummary({
  cameraReady,
  cameraSkipped,
  microphoneReady,
  speakerReady,
  internetQuality,
  setup,
}: DeviceSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:bg-white/5"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-sm">
          <ClipboardList className="h-4.5 w-4.5" />
        </span>
        <div className="font-display text-base font-semibold text-foreground">
          Readiness Summary
        </div>
      </div>

      <div className="mt-4 space-y-2.5 border-b border-white/10 pb-4">
        <StatusRow
          icon={Camera}
          label="Camera"
          ok={cameraReady || cameraSkipped}
          okLabel={cameraReady ? "Ready" : "Skipped"}
        />
        <StatusRow icon={Mic} label="Microphone" ok={microphoneReady} okLabel="Ready" />
        <StatusRow icon={Volume2} label="Speaker" ok={speakerReady} okLabel="Ready" />
        <StatusRow
          icon={Timer}
          label="Internet"
          ok={internetQuality !== "poor"}
          okLabel={INTERNET_LABEL[internetQuality]}
        />
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            Company
          </span>
          <span className="font-medium text-foreground">{setup.company}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            Role
          </span>
          <span className="font-medium text-foreground">{setup.role}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Timer className="h-4 w-4" />
            Duration
          </span>
          <span className="font-medium text-foreground">{setup.duration} minutes</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Languages className="h-4 w-4" />
            Language
          </span>
          <span className="font-medium text-foreground">{setup.language}</span>
        </div>
      </div>
    </motion.div>
  );
}
