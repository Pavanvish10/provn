import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, CheckCircle2, Circle, Mic, Sun, Wifi, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: ChecklistItem[] = [
  { id: "quiet-room", label: "Quiet Room", icon: Sun },
  { id: "lighting", label: "Good Lighting", icon: Sun },
  { id: "internet", label: "Stable Internet", icon: Wifi },
  { id: "camera-position", label: "Camera Position", icon: Camera },
  { id: "mic-working", label: "Microphone Working", icon: Mic },
];

export function EnvironmentChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ITEMS.map((item) => [item.id, true])),
  );

  function toggle(id: string) {
    setChecked((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
      className="rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:bg-white/5 sm:p-6"
    >
      <h2 className="mb-4 font-display text-base font-semibold text-foreground">
        Environment Checklist
      </h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {ITEMS.map((item) => {
          const isChecked = checked[item.id];
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              aria-pressed={isChecked}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                isChecked
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-white/10 bg-black/5 text-muted-foreground dark:bg-white/5",
              )}
            >
              {isChecked ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 shrink-0" />
              )}
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span className="flex-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
