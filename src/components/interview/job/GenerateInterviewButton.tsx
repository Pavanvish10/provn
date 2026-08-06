import { motion } from "framer-motion";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export interface GenerateInterviewButtonProps {
  disabled?: boolean;
  loading?: boolean;
  onGenerate: () => void;
}

export function GenerateInterviewButton({
  disabled,
  loading,
  onGenerate,
}: GenerateInterviewButtonProps) {
  const inactive = disabled || loading;

  return (
    <motion.button
      type="button"
      onClick={onGenerate}
      disabled={inactive}
      whileHover={inactive ? undefined : { scale: 1.02 }}
      whileTap={inactive ? undefined : { scale: 0.98 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-semibold shadow-lg transition-all",
        inactive
          ? "cursor-not-allowed bg-muted text-muted-foreground shadow-none"
          : "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 text-white shadow-fuchsia-500/25 hover:opacity-95",
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      Generate Interview
      {!loading && <ArrowRight className="h-4 w-4" />}
    </motion.button>
  );
}
