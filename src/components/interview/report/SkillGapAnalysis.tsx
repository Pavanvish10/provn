import { motion } from "framer-motion";
import { Check, ListChecks, X } from "lucide-react";

export interface SkillGapAnalysisProps {
  matchedSkills: string[];
  missingSkills: string[];
}

export function SkillGapAnalysis({ matchedSkills, missingSkills }: SkillGapAnalysisProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-blue-950/30 backdrop-blur-xl sm:p-8">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-sm">
          <ListChecks className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Skill Gap Analysis</h2>
          <p className="text-sm text-white/50">
            Resume skills matched against this role's requirements.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300/80">
            Matched
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {matchedSkills.length === 0 && <span className="text-sm text-white/40">None yet.</span>}
            {matchedSkills.map((skill, index) => (
              <motion.span
                key={skill}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
              >
                <Check className="h-3 w-3" /> {skill}
              </motion.span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-rose-300/80">
            Missing
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {missingSkills.length === 0 && (
              <span className="text-sm text-white/40">No gaps detected.</span>
            )}
            {missingSkills.map((skill, index) => (
              <motion.span
                key={skill}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300"
              >
                <X className="h-3 w-3" /> {skill}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
