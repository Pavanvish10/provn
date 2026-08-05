import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export interface ImprovementRoadmapProps {
  improvementAreas: string[];
}

export function ImprovementRoadmap({ improvementAreas }: ImprovementRoadmapProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-blue-950/30 backdrop-blur-xl sm:p-8">
      <h2 className="font-display text-lg font-semibold text-white">Improvement Roadmap</h2>
      <p className="mt-1 text-sm text-white/50">
        The most impactful things to work on before your next interview.
      </p>

      {improvementAreas.length === 0 ? (
        <p className="mt-6 text-sm text-white/40">
          No major gaps found — keep reinforcing what's already working well.
        </p>
      ) : (
        <ol className="mt-6 space-y-3">
          {improvementAreas.map((tip, index) => (
            <motion.li
              key={tip}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-xs font-bold text-white">
                {index + 1}
              </span>
              <p className="flex-1 text-sm text-white/75">{tip}</p>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-white/30" />
            </motion.li>
          ))}
        </ol>
      )}
    </div>
  );
}
