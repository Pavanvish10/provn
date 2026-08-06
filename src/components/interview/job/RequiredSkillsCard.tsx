import { motion } from "framer-motion";
import { CheckCircle2, ListChecks } from "lucide-react";

import type { JobDescriptionAnalysis } from "@/ai/resume/JobDescriptionAnalyzer";
import type { SkillMatchResult } from "@/services/job/SkillMatcher";

export interface RequiredSkillsCardProps {
  jobDescription: JobDescriptionAnalysis;
  skillMatch: SkillMatchResult;
}

export function RequiredSkillsCard({ jobDescription, skillMatch }: RequiredSkillsCardProps) {
  const matchedSet = new Set(skillMatch.matched.map((skill) => skill.toLowerCase()));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
      className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ListChecks className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        Required Skills
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {jobDescription.requiredSkills.length === 0 && (
          <span className="text-sm text-muted-foreground">
            None detected in the job description.
          </span>
        )}
        {jobDescription.requiredSkills.map((skill) => {
          const matched = matchedSet.has(skill.toLowerCase());
          return (
            <span
              key={skill}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                matched
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-black/5 text-muted-foreground dark:bg-white/10"
              }`}
            >
              {matched && <CheckCircle2 className="h-3 w-3" />}
              {skill}
            </span>
          );
        })}
      </div>

      {jobDescription.preferredSkills.length > 0 && (
        <>
          <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Preferred Skills
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {jobDescription.preferredSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400"
              >
                {skill}
              </span>
            ))}
          </div>
        </>
      )}

      {jobDescription.technologies.length > 0 && (
        <>
          <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Technologies
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {jobDescription.technologies.map((tech) => (
              <span
                key={tech}
                className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-600 dark:text-violet-400"
              >
                {tech}
              </span>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
