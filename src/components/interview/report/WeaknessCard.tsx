import { motion } from "framer-motion";
import { TrendingDown } from "lucide-react";

import type { CategoryScore } from "@/ai/evaluation/EvaluationTypes";
import { CATEGORY_LABELS } from "@/ai/evaluation/EvaluationModels";

export interface WeaknessCardProps {
  item: CategoryScore;
}

export function WeaknessCard({ item }: WeaknessCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] p-4"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
        <TrendingDown className="h-4.5 w-4.5" />
      </span>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{CATEGORY_LABELS[item.category]}</span>
          <span className="font-display text-xs font-bold text-rose-300">{item.score}/100</span>
        </div>
        <p className="mt-1 text-sm text-white/60">{item.rationale}</p>
      </div>
    </motion.div>
  );
}
