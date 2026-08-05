import { motion } from "framer-motion";
import { LineChart } from "lucide-react";

import type { EvaluationSnapshot } from "@/ai/evaluation/EvaluationTypes";

export interface PerformanceTimelineProps {
  timeline: EvaluationSnapshot[];
}

const WIDTH = 600;
const HEIGHT = 160;
const PADDING = 20;

function toPoint(index: number, score: number, count: number) {
  const x = count > 1 ? PADDING + (index / (count - 1)) * (WIDTH - PADDING * 2) : WIDTH / 2;
  const y = HEIGHT - PADDING - (score / 100) * (HEIGHT - PADDING * 2);
  return { x, y };
}

export function PerformanceTimeline({ timeline }: PerformanceTimelineProps) {
  if (timeline.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-blue-950/30 backdrop-blur-xl sm:p-8">
        <h2 className="font-display text-lg font-semibold text-white">Performance Timeline</h2>
        <p className="mt-4 text-sm text-white/40">No responses evaluated yet.</p>
      </div>
    );
  }

  const points = timeline.map((snapshot, index) =>
    toPoint(index, snapshot.overallScore, timeline.length),
  );
  const linePath = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = `${PADDING},${HEIGHT - PADDING} ${linePath} ${WIDTH - PADDING},${HEIGHT - PADDING}`;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-blue-950/30 backdrop-blur-xl sm:p-8">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-sm">
          <LineChart className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Performance Timeline</h2>
          <p className="text-sm text-white/50">
            How the overall score moved through the interview.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-40 w-full min-w-[420px]">
          <defs>
            <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((mark) => {
            const y = HEIGHT - PADDING - (mark / 100) * (HEIGHT - PADDING * 2);
            return (
              <line
                key={mark}
                x1={PADDING}
                x2={WIDTH - PADDING}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
            );
          })}

          <motion.polygon
            points={areaPath}
            fill="url(#timelineFill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
          <motion.polyline
            points={linePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          {points.map((point, index) => (
            <motion.circle
              key={timeline[index].turnIndex}
              cx={point.x}
              cy={point.y}
              r={4.5}
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth={2}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.6 + index * 0.08 }}
            />
          ))}
        </svg>

        <div
          className="grid text-center text-xs text-white/40"
          style={{ gridTemplateColumns: `repeat(${timeline.length}, minmax(0, 1fr))` }}
        >
          {timeline.map((snapshot) => (
            <div key={snapshot.turnIndex}>
              Q{snapshot.turnIndex + 1}
              <span className="ml-1 font-semibold text-white/60">{snapshot.overallScore}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
