import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

import type { CategoryScore } from "@/ai/evaluation/EvaluationTypes";
import { CATEGORY_LABELS } from "@/ai/evaluation/EvaluationModels";

export interface StrengthCardProps {
  item: CategoryScore;
}

export function StrengthCard({ item }: StrengthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-4"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
        <TrendingUp className="h-4.5 w-4.5" />
      </span>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{CATEGORY_LABELS[item.category]}</span>
          <span className="font-display text-xs font-bold text-emerald-300">{item.score}/100</span>
        </div>
        <p className="mt-1 text-sm text-white/60">{item.rationale}</p>
      </div>
    </motion.div>
  );
}
