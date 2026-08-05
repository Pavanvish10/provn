import { motion } from "framer-motion";
import { CalendarClock, GraduationCap, Target } from "lucide-react";

export interface NextStepsCardProps {
  learningTopics: string[];
  nextInterviewDate: string;
  companyReadiness: number;
  companyName: string | null;
}

function readinessColor(value: number) {
  if (value >= 75) return "from-emerald-500 to-teal-400";
  if (value >= 50) return "from-amber-500 to-orange-400";
  return "from-rose-500 to-red-400";
}

export function NextStepsCard({
  learningTopics,
  nextInterviewDate,
  companyReadiness,
  companyName,
}: NextStepsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-blue-950/30 backdrop-blur-xl sm:p-8"
    >
      <h2 className="font-display text-lg font-semibold text-white">Next Steps</h2>

      <div className="mt-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-white/80">
            <Target className="h-4 w-4 text-blue-300" />
            Estimated Readiness{companyName ? ` for ${companyName}` : ""}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${companyReadiness}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full bg-gradient-to-r ${readinessColor(companyReadiness)}`}
            />
          </div>
          <div className="mt-1 text-right text-xs font-semibold text-white/50">
            {companyReadiness}%
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-white/80">
            <GraduationCap className="h-4 w-4 text-violet-300" />
            Recommended Learning Topics
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {learningTopics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <CalendarClock className="h-5 w-5 text-cyan-300" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Suggested Next Interview
            </div>
            <div className="text-sm font-medium text-white/85">{nextInterviewDate}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
