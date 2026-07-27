import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { Flame, Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { useLeaderboard } from "@/lib/challenges-client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/leaderboard")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Leaderboard · Provn" },
      { name: "description", content: "Real XP and streaks — ranked across every Provn user." },
      { property: "og:title", content: "Leaderboard · Provn" },
      { property: "og:description", content: "XP compounds. See who's compounding hardest." },
    ],
  }),
  component: LB,
});

function LB() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useLeaderboard(page);
  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / 25));
  const top3 = page === 0 ? rows.slice(0, 3) : [];
  const rest = page === 0 ? rows.slice(3) : rows;

  return (
    <AppShell>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">XP leaderboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Solve challenges, verify skills, and climb — ranked by real XP.
          </p>
        </div>
        <Trophy className="h-8 w-8 text-brand" />
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No one has earned XP yet — be the first.
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {top3.map((u, i) => (
                <div
                  key={u.id}
                  className={`relative overflow-hidden rounded-2xl border p-6 ${i === 0 ? "border-brand bg-brand-soft" : "border-border bg-card"}`}
                >
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    #{i + 1}
                  </div>
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      className="mt-3 h-14 w-14 rounded-full bg-muted object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="mt-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted font-display text-lg">
                      {(u.full_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="mt-3 font-display text-2xl">
                    {u.full_name || u.username || "Anonymous"}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="text-brand">{u.xp} XP</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Flame className="h-4 w-4 text-brand" /> {u.streak}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid grid-cols-[40px_1fr_80px_80px] border-b border-border p-3 text-xs uppercase tracking-widest text-muted-foreground">
              <div>#</div>
              <div>User</div>
              <div className="text-right">XP</div>
              <div className="text-right">Streak</div>
            </div>
            {rest.map((u, i) => (
              <div
                key={u.id}
                className="grid grid-cols-[40px_1fr_80px_80px] items-center border-b border-border p-3 last:border-b-0 hover:bg-muted"
              >
                <div className="text-sm text-muted-foreground">
                  {page === 0 ? i + 4 : page * 25 + i + 1}
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      className="h-8 w-8 rounded-full bg-muted object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs">
                      {(u.full_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate text-sm">
                    {u.full_name || u.username || "Anonymous"}
                  </span>
                </div>
                <div className="text-right text-sm font-medium">{u.xp}</div>
                <div className="text-right text-sm text-muted-foreground">{u.streak}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
