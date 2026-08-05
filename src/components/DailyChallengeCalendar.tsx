import { useState } from "react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";

import { useDailyChallengeCalendar } from "@/lib/daily-challenge-client";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateStr(year: number, monthIndex0: number, day: number) {
  const m = String(monthIndex0 + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** Month-view calendar highlighting days the user completed the Daily
 * Challenge — a lightweight glassmorphic heatmap, not a full date picker. */
export function DailyChallengeCalendar({ profileId }: { profileId: string | undefined }) {
  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getUTCFullYear(),
    month: today.getUTCMonth(),
  });
  const { data: completedDates, isLoading } = useDailyChallengeCalendar(
    profileId,
    cursor.year,
    cursor.month,
  );

  const firstWeekday = new Date(Date.UTC(cursor.year, cursor.month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
  const todayStr = today.toISOString().slice(0, 10);

  const cells: { day: number | null; dateStr: string | null }[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: toDateStr(cursor.year, cursor.month, d) });
  }

  const goMonth = (delta: number) => {
    setCursor((c) => {
      const next = new Date(Date.UTC(c.year, c.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-display text-lg">
          <Flame className="h-4 w-4 text-brand" /> {MONTH_NAMES[cursor.month]} {cursor.year}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => goMonth(-1)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => goMonth(1)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>

      <div className={`mt-1.5 grid grid-cols-7 gap-1.5 ${isLoading ? "opacity-50" : ""}`}>
        {cells.map((cell, i) => {
          if (cell.day === null) return <div key={i} />;
          const completed = cell.dateStr && completedDates?.has(cell.dateStr);
          const isToday = cell.dateStr === todayStr;
          return (
            <div
              key={i}
              title={completed ? "Daily Challenge completed" : undefined}
              className={`flex aspect-square items-center justify-center rounded-lg text-xs ${
                completed
                  ? "bg-brand text-brand-foreground font-medium"
                  : isToday
                    ? "border border-brand/50 text-foreground"
                    : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
