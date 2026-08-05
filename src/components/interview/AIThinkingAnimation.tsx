import { motion } from "framer-motion";
import { Brain } from "lucide-react";

export function AIThinkingAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="inline-flex items-center gap-2.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-4 py-2 shadow-lg shadow-amber-950/20 backdrop-blur-xl"
    >
      <motion.span
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-300"
      >
        <Brain className="h-3.5 w-3.5" />
      </motion.span>
      <span className="text-sm font-medium text-amber-200">AI is analysing your answer</span>
      <span className="flex gap-1">
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
            className="h-1.5 w-1.5 rounded-full bg-amber-300"
          />
        ))}
      </span>
    </motion.div>
  );
}
