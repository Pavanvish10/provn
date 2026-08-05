import { motion } from "framer-motion";
import {
  BookOpen,
  Briefcase,
  Code2,
  Ear,
  MessageCircle,
  Puzzle,
  ShieldCheck,
  SpellCheck2,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { CategoryScore, EvaluationCategory } from "@/ai/evaluation/EvaluationTypes";
import { CATEGORY_LABELS } from "@/ai/evaluation/EvaluationModels";

export interface ScoreBreakdownProps {
  categories: CategoryScore[];
}

const CATEGORY_ICONS: Record<EvaluationCategory, LucideIcon> = {
  communication: MessageCircle,
  confidence: ShieldCheck,
  grammar: SpellCheck2,
  vocabulary: BookOpen,
  fluency: Waves,
  technicalKnowledge: Code2,
  problemSolving: Puzzle,
  leadership: Users,
  listening: Ear,
  professionalism: Briefcase,
};

function bandFor(score: number) {
  if (score >= 75) return { text: "text-emerald-300", bar: "from-emerald-500 to-teal-400" };
  if (score >= 50) return { text: "text-amber-300", bar: "from-amber-500 to-orange-400" };
  return { text: "text-rose-300", bar: "from-rose-500 to-red-400" };
}

export function ScoreBreakdown({ categories }: ScoreBreakdownProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-blue-950/30 backdrop-blur-xl sm:p-8">
      <h2 className="font-display text-lg font-semibold text-white">Score Breakdown</h2>
      <p className="mt-1 text-sm text-white/50">Performance across every evaluated category.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {categories.map((entry, index) => {
          const Icon = CATEGORY_ICONS[entry.category];
          const band = bandFor(entry.score);
          return (
            <motion.div
              key={entry.category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/70">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-white/80">
                    {CATEGORY_LABELS[entry.category]}
                  </span>
                </div>
                <span className={cn("font-display text-sm font-bold", band.text)}>
                  {entry.score}
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${entry.score}%` }}
                  transition={{ duration: 0.8, delay: index * 0.04, ease: "easeOut" }}
                  className={cn("h-full rounded-full bg-gradient-to-r", band.bar)}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
