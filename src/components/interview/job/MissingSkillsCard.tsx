import { motion } from "framer-motion";
import { AlertTriangle, PartyPopper } from "lucide-react";

import type { SkillMatchResult } from "@/services/job/SkillMatcher";

export interface MissingSkillsCardProps {
  skillMatch: SkillMatchResult;
}

export function MissingSkillsCard({ skillMatch }: MissingSkillsCardProps) {
  const hasGaps = skillMatch.missing.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 }}
      className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {hasGaps ? (
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <PartyPopper className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        )}
        Skill Gaps
      </div>

      {hasGaps ? (
        <>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Skills this role expects that weren't found on your profile — worth reviewing before
            your interview.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skillMatch.missing.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400"
              >
                {skill}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-1.5 text-sm text-muted-foreground">
          No skill gaps detected — you're a strong match for this role's requirements.
        </p>
      )}
    </motion.div>
  );
}
