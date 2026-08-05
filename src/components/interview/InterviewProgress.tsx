import { motion } from "framer-motion";
import { Timer } from "lucide-react";

export interface InterviewProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  secondsRemaining: number;
  totalSeconds: number;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function ProgressBlock({
  label,
  value,
  percent,
  gradient,
}: {
  label: string;
  value: string;
  percent: number;
  gradient: string;
}) {
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
        />
      </div>
    </div>
  );
}

export function InterviewProgress({
  currentQuestion,
  totalQuestions,
  secondsRemaining,
  totalSeconds,
}: InterviewProgressProps) {
  const questionPercent = Math.min(100, Math.round((currentQuestion / totalQuestions) * 100));
  const overallPercent = Math.min(
    100,
    Math.round(((totalSeconds - secondsRemaining) / totalSeconds) * 100),
  );
  const timePercent = Math.max(0, Math.round((secondsRemaining / totalSeconds) * 100));

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-6 sm:p-5">
      <ProgressBlock
        label="Question Progress"
        value={`${currentQuestion} / ${totalQuestions}`}
        percent={questionPercent}
        gradient="from-blue-500 to-cyan-400"
      />
      <ProgressBlock
        label="Overall Progress"
        value={`${overallPercent}%`}
        percent={overallPercent}
        gradient="from-indigo-500 to-blue-400"
      />
      <ProgressBlock
        label="Time Remaining"
        value={formatDuration(secondsRemaining)}
        percent={timePercent}
        gradient={timePercent < 20 ? "from-rose-500 to-orange-400" : "from-cyan-500 to-teal-400"}
      />
      <div className="hidden items-center gap-1.5 text-xs text-white/40 sm:flex">
        <Timer className="h-3.5 w-3.5" />
        of {formatDuration(totalSeconds)}
      </div>
    </div>
  );
}
