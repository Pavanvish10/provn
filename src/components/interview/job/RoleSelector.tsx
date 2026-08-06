import { useMemo } from "react";
import { motion } from "framer-motion";
import { Briefcase, Check } from "lucide-react";

import { RoleKnowledgeBase } from "@/services/job/RoleKnowledgeBase";
import { cn } from "@/lib/utils";

export interface RoleSelectorProps {
  value: string | null;
  onChange: (roleId: string) => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  const roles = useMemo(() => RoleKnowledgeBase.list(), []);

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((role, index) => {
        const selected = value === role.id;
        return (
          <motion.button
            key={role.id}
            type="button"
            onClick={() => onChange(role.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.03, ease: "easeOut" }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            aria-pressed={selected}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3.5 text-left shadow-sm backdrop-blur-xl transition-colors",
              selected
                ? "border-violet-400/60 bg-white/80 ring-2 ring-violet-400/50 dark:bg-white/10"
                : "border-white/20 bg-white/60 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10",
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
              <Briefcase className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">{role.label}</span>
            {selected && (
              <Check className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
