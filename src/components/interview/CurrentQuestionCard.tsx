import { AnimatePresence, motion } from "framer-motion";
import { Clock, MessageCircleQuestion } from "lucide-react";

export interface CurrentQuestionCardProps {
  question: string;
  questionNumber: number;
  totalQuestions: number;
  estimatedSeconds: number;
}

function formatEstimate(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes <= 1 ? "~1 min" : `~${minutes} min`;
}

export function CurrentQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  estimatedSeconds,
}: CurrentQuestionCardProps) {
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-blue-950/30 backdrop-blur-xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-300">
          <MessageCircleQuestion className="h-3.5 w-3.5" />
          Question {questionNumber} of {totalQuestions}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50">
          <Clock className="h-3.5 w-3.5" />
          Est. answer time {formatEstimate(estimatedSeconds)}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={question}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mt-4 font-display text-lg font-semibold leading-snug text-white sm:text-xl"
        >
          {question}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
