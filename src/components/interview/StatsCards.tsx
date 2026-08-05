import { motion } from "framer-motion";
import { Flame, Sparkles, Target, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import type { InterviewStat } from "@/types/interview";

const STATS: InterviewStat[] = [
  {
    id: "total",
    label: "Total Interviews",
    value: "27",
    delta: "+4 this month",
    trend: "up",
    icon: Target,
    gradient: "from-violet-500 to-indigo-500",
  },
  {
    id: "avg-score",
    label: "Average Score",
    value: "84%",
    delta: "+6% vs last month",
    trend: "up",
    icon: Trophy,
    gradient: "from-fuchsia-500 to-pink-500",
  },
  {
    id: "streak",
    label: "Current Streak",
    value: "12 days",
    delta: "Personal best",
    trend: "up",
    icon: Flame,
    gradient: "from-orange-500 to-amber-400",
  },
  {
    id: "xp",
    label: "XP Points",
    value: "3,420",
    delta: "+180 this week",
    trend: "up",
    icon: Sparkles,
    gradient: "from-emerald-500 to-teal-400",
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STATS.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-lg dark:bg-white/5"
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-opacity group-hover:opacity-30",
                stat.gradient,
              )}
            />
            <div className="relative flex items-start justify-between">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
                  stat.gradient,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="relative mt-4">
              <div className="font-display text-3xl font-bold tracking-tight text-foreground">
                {stat.value}
              </div>
              <div className="mt-1 text-sm font-medium text-muted-foreground">{stat.label}</div>
              {stat.delta && (
                <div className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {stat.delta}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
