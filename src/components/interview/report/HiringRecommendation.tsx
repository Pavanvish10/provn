import { motion } from "framer-motion";
import { Award, CheckCircle2, ThumbsDown, ThumbsUp, XCircle, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { HiringRecommendation as HiringRecommendationValue } from "@/ai/evaluation/EvaluationTypes";

export interface HiringRecommendationProps {
  recommendation: HiringRecommendationValue;
}

const TIER_CONFIG: Record<
  HiringRecommendationValue,
  { icon: LucideIcon; gradient: string; text: string; description: string }
> = {
  "Strong Hire": {
    icon: Award,
    gradient: "from-emerald-500 to-teal-400",
    text: "text-emerald-300",
    description: "Performance was consistently strong across nearly every category.",
  },
  Hire: {
    icon: CheckCircle2,
    gradient: "from-teal-500 to-cyan-400",
    text: "text-teal-300",
    description: "Solid overall performance with only minor gaps.",
  },
  "Leaning Hire": {
    icon: ThumbsUp,
    gradient: "from-amber-500 to-orange-400",
    text: "text-amber-300",
    description: "Promising, but a few areas need more depth before the bar is fully cleared.",
  },
  "Leaning No Hire": {
    icon: ThumbsDown,
    gradient: "from-orange-500 to-rose-400",
    text: "text-orange-300",
    description: "Meaningful gaps showed up in more than one category this round.",
  },
  "No Hire": {
    icon: XCircle,
    gradient: "from-rose-500 to-red-500",
    text: "text-rose-300",
    description: "Significant gaps across most categories — more preparation is needed.",
  },
};

export function HiringRecommendation({ recommendation }: HiringRecommendationProps) {
  const config = TIER_CONFIG[recommendation];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-xl shadow-blue-950/30 backdrop-blur-xl"
    >
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
          config.gradient,
        )}
      >
        <Icon className="h-7 w-7" />
      </span>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
          Hiring Recommendation
        </div>
        <div className={cn("mt-1 font-display text-2xl font-bold", config.text)}>
          {recommendation}
        </div>
        <p className="mt-2 max-w-xs text-sm text-white/50">{config.description}</p>
      </div>
    </motion.div>
  );
}
