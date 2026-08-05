import { motion } from "framer-motion";
import { Check } from "lucide-react";

const VOICES = [
  { id: "Male", gradient: "from-sky-500 to-blue-500", emoji: "🧑" },
  { id: "Female", gradient: "from-fuchsia-500 to-pink-500", emoji: "👩" },
] as const;

export interface VoiceSelectorProps {
  value: string | null;
  onChange: (voice: string) => void;
}

export function VoiceSelector({ value, onChange }: VoiceSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {VOICES.map((voice, index) => {
        const selected = value === voice.id;
        return (
          <motion.button
            key={voice.id}
            type="button"
            onClick={() => onChange(voice.id)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08, ease: "easeOut" }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            aria-pressed={selected}
            className={`relative flex items-center gap-4 overflow-hidden rounded-2xl border p-5 text-left shadow-sm backdrop-blur-xl transition-colors ${
              selected
                ? "border-violet-400/60 bg-white/80 ring-2 ring-violet-400/50 dark:bg-white/10"
                : "border-white/20 bg-white/60 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
            }`}
          >
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-md ${voice.gradient}`}
            >
              {voice.emoji}
            </span>
            <div className="flex-1">
              <div className="font-display text-base font-semibold text-foreground">
                {voice.id} Voice
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">AI interviewer voice</p>
            </div>
            {selected && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-md">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
