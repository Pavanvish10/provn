import { motion } from "framer-motion";
import { Check, Languages } from "lucide-react";

import { cn } from "@/lib/utils";

const LANGUAGES = [
  { id: "English", native: "English" },
  { id: "Hindi", native: "हिन्दी" },
  { id: "Hinglish", native: "Hindi + English" },
] as const;

export interface LanguageSelectorProps {
  value: string | null;
  onChange: (language: string) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {LANGUAGES.map((language, index) => {
        const selected = value === language.id;
        return (
          <motion.button
            key={language.id}
            type="button"
            onClick={() => onChange(language.id)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            aria-pressed={selected}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-4 text-left shadow-sm backdrop-blur-xl transition-colors",
              selected
                ? "border-violet-400/60 bg-white/80 ring-2 ring-violet-400/50 dark:bg-white/10"
                : "border-white/20 bg-white/60 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10",
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-sm">
              <Languages className="h-4.5 w-4.5" />
            </span>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{language.id}</div>
              <div className="text-xs text-muted-foreground">{language.native}</div>
            </div>
            {selected && (
              <Check className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
