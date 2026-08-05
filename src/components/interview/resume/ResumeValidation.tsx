import { CheckCircle2, FileType, HardDrive } from "lucide-react";

// A small, always-visible reminder of what's accepted — the actual
// pass/fail feedback for a specific file shows up as a ResumeErrorCard
// instead, so this stays purely informational.

const RULES = [
  { icon: FileType, text: "PDF, DOCX, or TXT format" },
  { icon: HardDrive, text: "Maximum size 10MB" },
];

export function ResumeValidation() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/20 bg-white/50 p-4 backdrop-blur-xl dark:bg-white/5 sm:flex-row sm:items-center sm:gap-6">
      {RULES.map((rule) => {
        const Icon = rule.icon;
        return (
          <div key={rule.text} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <Icon className="h-4 w-4" />
            {rule.text}
          </div>
        );
      })}
    </div>
  );
}
