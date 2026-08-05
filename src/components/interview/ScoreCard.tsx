import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function toneFor(score: number) {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function ScoreCard({
  icon,
  label,
  score,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  score: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 transition hover:border-foreground/20 hover:shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
            {icon}
          </span>
          {label}
        </div>
        <span className={cn("font-display text-lg font-bold tabular-nums", toneFor(score))}>
          {score}
        </span>
      </div>
      <Progress value={score} className="mt-3" />
    </div>
  );
}
