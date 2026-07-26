import { Moon, Sun } from "lucide-react";
import { toggleDark, useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";

export function DarkModeToggle({ className }: { className?: string }) {
  const { darkMode } = useAppState();
  return (
    <button
      onClick={toggleDark}
      aria-label="Toggle dark mode"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/60 text-foreground/70 backdrop-blur transition hover:text-foreground hover:bg-card",
        className,
      )}
    >
      {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
