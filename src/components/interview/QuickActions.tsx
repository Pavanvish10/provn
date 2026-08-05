import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, History, Mic, PlayCircle, Dumbbell } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { QuickAction } from "@/types/interview";
import { InterviewFlowController } from "@/store/InterviewFlowController";
import { INTERVIEW_ROUTES } from "@/store/InterviewNavigation";

const ACTIONS: QuickAction[] = [
  {
    id: "start",
    title: "Start AI Interview",
    description: "Jump into a fresh, fully simulated interview session.",
    icon: Mic,
    gradient: "from-violet-500 to-indigo-500",
  },
  {
    id: "resume",
    title: "Resume Interview",
    description: "Pick up right where you left off on your last session.",
    icon: PlayCircle,
    gradient: "from-fuchsia-500 to-pink-500",
  },
  {
    id: "practice",
    title: "Practice Mode",
    description: "Low-pressure reps on questions you want to master.",
    icon: Dumbbell,
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    id: "history",
    title: "Interview History",
    description: "Revisit past sessions, scores, and feedback.",
    icon: History,
    gradient: "from-orange-500 to-amber-400",
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  function handleActionClick(id: string) {
    if (id === "start") {
      InterviewFlowController.resetInterview();
      navigate({ to: INTERVIEW_ROUTES.setup });
      return;
    }
    if (id === "resume") {
      navigate({ to: InterviewFlowController.resumeInterview() });
      return;
    }
    toast.info("Coming soon");
  }

  return (
    <div>
      <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Quick Actions</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              type="button"
              onClick={() => handleActionClick(action.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex flex-col items-start overflow-hidden rounded-2xl border border-white/20 bg-white/60 p-5 text-left shadow-sm backdrop-blur-xl transition-shadow hover:shadow-lg dark:bg-white/5"
            >
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform group-hover:scale-105",
                  action.gradient,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-display text-base font-semibold text-foreground">
                {action.title}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400">
                Go{" "}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
