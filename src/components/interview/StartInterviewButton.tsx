import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export interface StartInterviewButtonProps {
  disabled?: boolean;
  onStart?: () => void;
}

export function StartInterviewButton({ disabled, onStart }: StartInterviewButtonProps) {
  function handleClick() {
    if (disabled) return;
    onStart?.();
    toast.success("Setup complete! Your AI interview is ready to launch.");
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-semibold shadow-lg transition-all",
        disabled
          ? "cursor-not-allowed bg-muted text-muted-foreground shadow-none"
          : "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 text-white shadow-fuchsia-500/25 hover:opacity-95",
      )}
    >
      <Sparkles className="h-4 w-4" />
      Start Interview
    </motion.button>
  );
}
