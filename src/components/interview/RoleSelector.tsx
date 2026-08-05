import { motion } from "framer-motion";
import {
  Boxes,
  Brain,
  Check,
  Cloud,
  Code2,
  LineChart,
  Palette,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface Role {
  name: string;
  icon: LucideIcon;
}

const ROLES: Role[] = [
  { name: "Frontend Developer", icon: Palette },
  { name: "Backend Developer", icon: Code2 },
  { name: "Full Stack Developer", icon: Boxes },
  { name: "AI Engineer", icon: Brain },
  { name: "Data Scientist", icon: LineChart },
  { name: "DevOps Engineer", icon: Cloud },
  { name: "Product Manager", icon: Boxes },
];

export interface RoleSelectorProps {
  value: string | null;
  onChange: (role: string) => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ROLES.map((role, index) => {
        const Icon = role.icon;
        const selected = value === role.name;
        return (
          <motion.button
            key={role.name}
            type="button"
            onClick={() => onChange(role.name)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
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
              <Icon className="h-4.5 w-4.5" />
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">{role.name}</span>
            {selected && (
              <Check className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
