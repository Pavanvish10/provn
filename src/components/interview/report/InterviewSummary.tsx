import { motion } from "framer-motion";
import { Building2, Layers, NotebookText, UserRound } from "lucide-react";

export interface InterviewSummaryProps {
  role: string;
  company: string | null;
  interviewType: string;
  questionCount: number;
  aiNotes: string[];
}

export function InterviewSummary({
  role,
  company,
  interviewType,
  questionCount,
  aiNotes,
}: InterviewSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-blue-950/30 backdrop-blur-xl sm:p-8"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-sm">
          <NotebookText className="h-4.5 w-4.5" />
        </span>
        <h2 className="font-display text-lg font-semibold text-white">Interview Summary</h2>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
          <Layers className="h-3.5 w-3.5" /> {interviewType}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
          <UserRound className="h-3.5 w-3.5" /> {role}
        </span>
        {company && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
            <Building2 className="h-3.5 w-3.5" /> {company}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
          {questionCount} question{questionCount === 1 ? "" : "s"} answered
        </span>
      </div>

      <ul className="mt-5 space-y-2.5 border-t border-white/10 pt-5">
        {aiNotes.map((note) => (
          <li key={note} className="flex items-start gap-2.5 text-sm text-white/70">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
            {note}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
