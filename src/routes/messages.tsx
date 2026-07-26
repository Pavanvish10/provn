import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { useState } from "react";
import { CONVERSATIONS, AVATARS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages · Provn" },
      { name: "description", content: "Chat with friends, mentors, and recruiters on Provn." },
      { property: "og:title", content: "Messages · Provn" },
      { property: "og:description", content: "Your Provn inbox." },
    ],
  }),
  component: Messages,
});

type Msg = { id: string; from: "me" | "them"; text: string; time: string };
const INITIAL: Record<string, Msg[]> = {
  c1: [
    { id: "m1", from: "them", text: "Hey — sent you the repo link. Take a look when free.", time: "12m" },
    { id: "m2", from: "me", text: "On it. Cloning now.", time: "10m" },
  ],
  c2: [{ id: "m1", from: "them", text: "let's pair on the DP set tonight?", time: "1h" }],
  c3: [{ id: "m1", from: "them", text: "Loved your verified profile. Are you open to a chat?", time: "3h" }],
  c4: [{ id: "m1", from: "them", text: "streak buddy?", time: "1d" }],
};

function Messages() {
  const [active, setActive] = useState(CONVERSATIONS[0].id);
  const [threads, setThreads] = useState<Record<string, Msg[]>>(INITIAL);
  const [draft, setDraft] = useState("");
  const current = CONVERSATIONS.find((c) => c.id === active)!;

  const send = () => {
    if (!draft.trim()) return;
    setThreads((t) => ({
      ...t,
      [active]: [...(t[active] || []), { id: String(Date.now()), from: "me", text: draft, time: "now" }],
    }));
    setDraft("");
  };

  return (
    <AppShell>
      <div className="grid h-[calc(100vh-10rem)] grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[300px_1fr]">
        <div className="border-b border-border md:border-b-0 md:border-r">
          <div className="border-b border-border p-4 text-xs uppercase tracking-widest text-muted-foreground">Conversations</div>
          <div className="overflow-y-auto">
            {CONVERSATIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`flex w-full items-center gap-3 border-b border-border p-3 text-left transition hover:bg-muted ${active === c.id ? "bg-muted" : ""}`}
              >
                <img src={c.avatar} className="h-10 w-10 rounded-full bg-muted" alt="" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{c.name}</span>
                    {c.unread > 0 && <span className="ml-auto rounded-full bg-brand px-1.5 text-[10px] text-brand-foreground">{c.unread}</span>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{c.last} · {c.time}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <img src={current.avatar} className="h-10 w-10 rounded-full bg-muted" alt="" />
            <div>
              <div className="font-medium">{current.name}</div>
              <div className="text-xs text-muted-foreground">Online</div>
            </div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {(threads[active] || []).map((m) => (
              <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.from === "me" ? "bg-brand text-brand-foreground" : "bg-muted text-foreground"}`}>
                  {m.text}
                  <div className={`mt-0.5 text-[10px] ${m.from === "me" ? "text-brand-foreground/70" : "text-muted-foreground"}`}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" className="h-10" />
            <Button type="submit" size="icon" disabled={!draft.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
