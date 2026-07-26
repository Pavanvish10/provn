import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { useState } from "react";
import { Heart, MessageCircle, Share2, ImagePlus, Video, Code2, Send, Flame, TrendingUp, Trophy, ShieldCheck, Briefcase, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AVATARS, FEED_POSTS, LEADERBOARD, FRIEND_SUGGESTIONS } from "@/lib/mock-data";
import { useAppState } from "@/lib/store";


export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home · Provn" },
      { name: "description", content: "Your feed: projects, streaks, and posts from the Provn community." },
      { property: "og:title", content: "Home · Provn" },
      { property: "og:description", content: "The feed for people who prove their work." },
    ],
  }),
  component: Home,
});

function Home() {
  const state = useAppState();
  const [draft, setDraft] = useState("");
  const [posts, setPosts] = useState(FEED_POSTS);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const post = () => {
    if (!draft.trim()) return;
    setPosts([
      { id: `me-${Date.now()}`, author: state.name || "You", handle: "@you", avatar: AVATARS[0], time: "now", kind: "daily", content: draft, tags: ["Streak"], likes: 0, comments: 0 },
      ...posts,
    ]);
    setDraft("");
  };

  return (
    <AppShell>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr_300px]">
        {/* Left rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <MiniProfile />
            <Card title="Your streak" icon={<Flame className="h-4 w-4 text-brand" />}>
              <div className="font-display text-4xl">{state.streak}</div>
              <div className="text-xs text-muted-foreground">days · solve 2 today to keep it alive</div>
              <div className="mt-3 grid grid-cols-7 gap-1">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i} className={`h-4 rounded-sm ${i < 12 ? "bg-brand" : "bg-muted"}`} />
                ))}
              </div>
            </Card>
          </div>
        </aside>

        {/* Feed */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex gap-3">
              <img src={AVATARS[0]} alt="" className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1">
                <Textarea
                  placeholder="Share what you shipped today…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-[80px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted hover:text-foreground"><ImagePlus className="h-4 w-4" /> Image</button>
                    <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted hover:text-foreground"><Video className="h-4 w-4" /> Video</button>
                    <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted hover:text-foreground"><Code2 className="h-4 w-4" /> Code</button>
                  </div>
                  <Button size="sm" onClick={post} disabled={!draft.trim()}>
                    <Send className="mr-1.5 h-3.5 w-3.5" /> Post
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {posts.map((p) => {
            const isLiked = liked[p.id];
            return (
              <article key={p.id} className="rounded-2xl border border-border bg-card p-5">
                <header className="flex items-center gap-3">
                  <img src={p.avatar} className="h-10 w-10 rounded-full bg-muted" alt="" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.author}</span>
                      {p.kind === "project" && <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3 text-brand" /> Verified project</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.handle} · {p.time}</div>
                  </div>
                </header>
                <p className="mt-4 text-[15px] leading-relaxed">{p.content}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">#{t}</span>
                  ))}
                </div>
                <footer className="mt-4 flex items-center gap-1 border-t border-border pt-3 text-muted-foreground">
                  <button
                    onClick={() => setLiked((v) => ({ ...v, [p.id]: !v[p.id] }))}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted hover:text-foreground ${isLiked ? "text-brand" : ""}`}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} /> {p.likes + (isLiked ? 1 : 0)}
                  </button>
                  <button className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted hover:text-foreground">
                    <MessageCircle className="h-4 w-4" /> {p.comments}
                  </button>
                  <button className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted hover:text-foreground">
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                </footer>
              </article>
            );
          })}
        </div>

        {/* Right rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <Link
              to="/business"
              className="group block rounded-2xl border border-border bg-gradient-to-br from-brand-soft to-card p-4 transition hover:border-brand/60"
            >
              <div className="flex items-center gap-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">For companies</div>
              </div>
              <div className="mt-3 font-display text-lg leading-tight">Business</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Post jobs, hire from a verified pool, and reach the Provn community.
              </p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand">
                Open Business Hub <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
            <Card title="Streak leaderboard" icon={<Trophy className="h-4 w-4 text-brand" />}>
              <ul className="space-y-2">
                {LEADERBOARD.slice(0, 5).map((u, i) => (
                  <li key={u.name} className="flex items-center gap-3 text-sm">
                    <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                    <img src={u.avatar} className="h-7 w-7 rounded-full bg-muted" alt="" />
                    <span className="truncate">{u.name}</span>
                    <span className="ml-auto inline-flex items-center gap-0.5 text-xs text-brand"><Flame className="h-3 w-3" /> {u.streak}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="People to follow" icon={<TrendingUp className="h-4 w-4 text-brand" />}>
              <ul className="space-y-3">
                {FRIEND_SUGGESTIONS.slice(0, 3).map((u) => (
                  <li key={u.id} className="flex items-center gap-3">
                    <img src={u.avatar} className="h-8 w-8 rounded-full bg-muted" alt="" />
                    <div className="min-w-0">
                      <div className="truncate text-sm">{u.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{u.role}</div>
                    </div>
                    <Button size="sm" variant="outline" className="ml-auto h-7">Follow</Button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function MiniProfile() {
  const s = useAppState();
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <img src={AVATARS[0]} className="h-11 w-11 rounded-full bg-muted" alt="" />
        <div className="min-w-0">
          <div className="truncate font-medium">{s.name || "You"}</div>
          <div className="truncate text-xs text-muted-foreground">{s.location || "—"}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat k={String(s.verifiedSkills.length)} v="Verified" />
        <Stat k={String(s.streak)} v="Streak" />
        <Stat k={s.plan === "pro" ? "Pro" : "Free"} v="Plan" />
      </div>
    </div>
  );
}
function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-muted p-2">
      <div className="font-display text-lg leading-none">{k}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{v}</div>
    </div>
  );
}
