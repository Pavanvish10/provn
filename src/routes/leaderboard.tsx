import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { LEADERBOARD } from "@/lib/mock-data";
import { Flame, Trophy } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard · Provn" },
      { name: "description", content: "See who's stacking the longest coding streaks on Provn." },
      { property: "og:title", content: "Leaderboard · Provn" },
      { property: "og:description", content: "Streaks compound. See who's compounding hardest." },
    ],
  }),
  component: LB,
});

function LB() {
  return (
    <AppShell>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Streak leaderboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">Solve 2 challenges daily to climb.</p>
        </div>
        <Trophy className="h-8 w-8 text-brand" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {LEADERBOARD.slice(0, 3).map((u, i) => (
          <div key={u.name} className={`relative overflow-hidden rounded-2xl border p-6 ${i === 0 ? "border-brand bg-brand-soft" : "border-border bg-card"}`}>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">#{i + 1}</div>
            <img src={u.avatar} className="mt-3 h-14 w-14 rounded-full bg-muted" alt="" />
            <div className="mt-3 font-display text-2xl">{u.name}</div>
            <div className="mt-2 inline-flex items-center gap-1 text-sm text-brand">
              <Flame className="h-4 w-4" /> {u.streak} days
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[40px_1fr_100px] border-b border-border p-3 text-xs uppercase tracking-widest text-muted-foreground">
          <div>#</div><div>User</div><div className="text-right">Streak</div>
        </div>
        {LEADERBOARD.map((u, i) => (
          <div key={u.name} className="grid grid-cols-[40px_1fr_100px] items-center border-b border-border p-3 last:border-b-0 hover:bg-muted">
            <div className="text-sm text-muted-foreground">{i + 1}</div>
            <div className="flex items-center gap-3">
              <img src={u.avatar} className="h-8 w-8 rounded-full bg-muted" alt="" />
              <span className="truncate text-sm">{u.name}</span>
            </div>
            <div className="text-right text-sm font-medium">{u.streak}</div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
