import { useEffect, useState } from "react";
import { animate, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export interface OverallScoreCardProps {
  score: number;
  label?: string;
}

const RADIUS = 72;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function bandFor(score: number) {
  if (score >= 75) return { text: "text-emerald-300", ring: "#34d399", label: "Excellent" };
  if (score >= 50) return { text: "text-amber-300", ring: "#fbbf24", label: "Good" };
  return { text: "text-rose-300", ring: "#fb7185", label: "Needs Work" };
}

export function OverallScoreCard({ score, label = "Overall Score" }: OverallScoreCardProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const band = bandFor(score);

  useEffect(() => {
    const controls = animate(0, score, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (value) => setDisplayScore(Math.round(value)),
    });
    return () => controls.stop();
  }, [score]);

  const offset = CIRCUMFERENCE - (Math.max(0, Math.min(100, score)) / 100) * CIRCUMFERENCE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl shadow-blue-950/40 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />

      <span className="relative inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-300">
        <Sparkles className="h-3.5 w-3.5" />
        AI Interview Report
      </span>

      <div className="relative mt-6 flex h-44 w-44 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="12"
          />
          <motion.circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            stroke={band.ring}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display text-5xl font-bold text-white">{displayScore}</span>
          <span className="text-xs font-medium text-white/40">/ 100</span>
        </div>
      </div>

      <div className="relative mt-5">
        <div className={cn("font-display text-lg font-semibold", band.text)}>{band.label}</div>
        <p className="mt-1 text-sm text-white/50">{label}</p>
      </div>
    </motion.div>
  );
}
