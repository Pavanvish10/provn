import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";

import { useCurrentUser } from "@/lib/auth-client";
import { useSendChatMessage, type ChatMessage } from "@/lib/ai-chat-client";
import { cn } from "@/lib/utils";

const GREETING: ChatMessage = {
  role: "model",
  text: "Hi! I'm your Provn AI assistant. Ask me about your resume, interview prep, career roadmap, or anything on the platform.",
};

/** Global floating chat bubble, mounted once in the root layout so it's
 * available from every page. Renders nothing for logged-out visitors —
 * chatting with a career assistant only makes sense once you have an
 * account. Conversation lives in component state (not persisted), which
 * survives client-side navigation since this stays mounted in the root
 * layout, and simply resets on a full page reload. */
export function AiChatWidget() {
  // Renders null until after the client has mounted, so the server render
  // and the client's first (pre-hydration) render are always identical
  // (both "nothing") regardless of whether the auth query has resolved yet.
  // Gating on `user` alone caused a real hydration mismatch (React #418):
  // SSR had `user` already loaded via beforeLoad, but the client's very
  // first paint briefly saw it as undefined, so the server sent a button
  // the client didn't expect — React's mismatch recovery left a stray
  // duplicate copy of the widget in the DOM instead of cleanly reconciling.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sendMessage = useSendChatMessage();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sendMessage.isPending]);

  if (!mounted || !user) return null;

  const onSend = async () => {
    const text = input.trim();
    if (!text || sendMessage.isPending) return;
    setError(null);
    setInput("");
    const history = messages.slice(1); // exclude the greeting, it's UI-only
    setMessages((prev) => [...prev, { role: "user", text }]);
    const res = await sendMessage.mutateAsync({ history, message: text });
    if (res.error) {
      setError(res.error);
      return;
    }
    setMessages((prev) => [...prev, { role: "model", text: res.reply! }]);
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 sm:right-6">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-brand-soft/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">Provn AI Assistant</div>
                <div className="text-xs text-muted-foreground">Career help, on demand</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-brand text-brand-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSend();
            }}
            className="flex items-end gap-2 border-t border-border p-3"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="Ask about your resume, interview, career path…"
              rows={1}
              className="max-h-24 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={!input.trim() || sendMessage.isPending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-xl transition hover:opacity-90 sm:right-6"
        aria-label={open ? "Close AI chat" : "Open AI chat"}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </>
  );
}
