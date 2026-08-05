import { motion } from "framer-motion";
import { FileText, Sparkles, Timer } from "lucide-react";

import { cn } from "@/lib/utils";
import { RecordingIndicator } from "@/components/interview/RecordingIndicator";

export interface InterviewHeaderProps {
  interviewType: string;
  company: string;
  role: string;
  questionNumber: number;
  totalQuestions: number;
  secondsRemaining: number;
  recording: boolean;
  elapsedSeconds: number;
  transcriptOpen: boolean;
  onToggleTranscript: () => void;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function InterviewHeader({
  interviewType,
  company,
  role,
  questionNumber,
  totalQuestions,
  secondsRemaining,
  recording,
  elapsedSeconds,
  transcriptOpen,
  onToggleTranscript,
}: InterviewHeaderProps) {
  const timeLow = secondsRemaining <= 60;

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-4 py-3 backdrop-blur-xl sm:px-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/30">
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <div>
          <div className="font-display text-sm font-bold text-white sm:text-base">
            Provn AI Interview
          </div>
          <div className="text-xs text-white/50">
            {interviewType} · {company} · {role}
          </div>
        </div>
        <RecordingIndicator
          recording={recording}
          elapsedSeconds={elapsedSeconds}
          className="ml-2 hidden sm:inline-flex"
        />
      </div>

      <div className="flex items-center gap-3 text-sm text-white/80">
        <span className="hidden items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium sm:inline-flex">
          Question <span className="font-semibold text-white">{questionNumber}</span>&nbsp;/&nbsp;
          {totalQuestions}
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 font-mono text-xs font-semibold",
            timeLow ? "text-rose-300" : "text-white",
          )}
        >
          <Timer className="h-3.5 w-3.5" />
          {formatTime(secondsRemaining)}
        </span>
        <button
          type="button"
          onClick={onToggleTranscript}
          aria-pressed={transcriptOpen}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border transition",
            transcriptOpen
              ? "border-blue-400/40 bg-blue-500/20 text-blue-300"
              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
          )}
          aria-label="Toggle live transcript"
        >
          <FileText className="h-4 w-4" />
        </button>
      </div>
    </motion.header>
  );
}
