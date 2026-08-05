import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export interface ContinueInterviewButtonProps {
  canContinue: boolean;
  onBack: () => void;
  onContinue?: () => void;
}

export function ContinueInterviewButton({
  canContinue,
  onBack,
  onContinue,
}: ContinueInterviewButtonProps) {
  function handleContinue() {
    if (!canContinue) return;
    onContinue?.();
    toast.success("Everything looks ready — see you in the interview room.");
  }

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/50 px-5 py-2.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-md transition hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <motion.button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue}
        whileHover={canContinue ? { scale: 1.02 } : undefined}
        whileTap={canContinue ? { scale: 0.98 } : undefined}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold shadow-md transition",
          canContinue
            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-500/25 hover:opacity-95"
            : "cursor-not-allowed bg-muted text-muted-foreground shadow-none",
        )}
      >
        Continue
        <ArrowRight className="h-4 w-4" />
      </motion.button>
    </div>
  );
}
