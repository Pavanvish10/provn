import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Check } from "lucide-react";
import { AVATARS, FRIEND_SUGGESTIONS } from "@/lib/mock-data";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/friends")({
  head: () => ({
    meta: [
      { title: "Friends · Provn" },
      { name: "description", content: "Find and add friends by user ID on Provn." },
      { property: "og:title", content: "Friends · Provn" },
      { property: "og:description", content: "Grow your circle of makers." },
    ],
  }),
  component: FriendsPage,
});

const ALL_USERS = [
  ...FRIEND_SUGGESTIONS,
  { id: "u_9111", name: "Tanvi Sinha", role: "Data Engineer", avatar: AVATARS[0] },
  { id: "u_9112", name: "Arjun Bansal", role: "iOS · Swift", avatar: AVATARS[3] },
  { id: "u_9113", name: "Kavya Suresh", role: "PM Intern", avatar: AVATARS[6] },
  { id: "u_9114", name: "Neel Doshi", role: "Founder · SaaS", avatar: AVATARS[1] },
];

function FriendsPage() {
  const [q, setQ] = useState("");
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const filtered = useMemo(
    () => ALL_USERS.filter((u) =>
      !q ||
      u.id.toLowerCase().includes(q.toLowerCase()) ||
      u.name.toLowerCase().includes(q.toLowerCase()),
    ),
    [q],
  );
  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-tight">Find your people.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Search by user ID (e.g. <code className="rounded bg-muted px-1">u_9021</code>) or name.</p>
      </div>
      <div className="relative mb-6 max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="u_9021 or a name…" className="h-11 pl-10" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((u) => {
          const isAdded = added[u.id];
          return (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <img src={u.avatar} className="h-12 w-12 rounded-full bg-muted" alt="" />
              <div className="min-w-0">
                <div className="truncate font-medium">{u.name}</div>
                <div className="truncate text-xs text-muted-foreground">{u.role} · <span className="font-mono">{u.id}</span></div>
              </div>
              <Button
                size="sm"
                variant={isAdded ? "outline" : "default"}
                className="ml-auto"
                onClick={() => setAdded((v) => ({ ...v, [u.id]: !v[u.id] }))}
              >
                {isAdded ? <><Check className="mr-1 h-3.5 w-3.5" /> Added</> : <><UserPlus className="mr-1 h-3.5 w-3.5" /> Add</>}
              </Button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
