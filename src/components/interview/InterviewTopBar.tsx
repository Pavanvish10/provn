import { Mic, MicOff, Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  hr: "HR Interview",
  technical: "Technical Interview",
  manager: "Manager Interview",
  startup: "Startup Interview",
  faang: "FAANG Interview",
};

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function InterviewTopBar({
  secondsRemaining,
  questionNumber,
  totalQuestions,
  interviewType,
  micMuted,
  recording,
}: {
  secondsRemaining: number;
  questionNumber: number;
  totalQuestions: number;
  interviewType: string;
  micMuted: boolean;
  recording: boolean;
}) {
  const low = secondsRemaining <= 60;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-2">
        {recording && (
          <span className="flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
            REC
          </span>
        )}
        <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/10">
          {TYPE_LABEL[interviewType] ?? interviewType}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-sm text-white/80">
        <span>
          Question <span className="font-semibold text-white">{questionNumber}</span> /{" "}
          {totalQuestions}
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 font-mono font-medium",
            low ? "text-rose-300" : "text-white",
          )}
        >
          <Timer className="h-4 w-4" />
          {fmt(secondsRemaining)}
        </span>
        <span
          className={cn("flex items-center gap-1", micMuted ? "text-rose-300" : "text-emerald-300")}
        >
          {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </span>
      </div>
    </div>
  );
}
