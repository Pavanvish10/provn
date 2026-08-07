import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Sparkles,
  Send,
  Plus,
  Search,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  MoreVertical,
  Loader2,
  Target,
  CalendarClock,
  TrendingDown,
  FolderKanban,
  Gauge,
  Bot,
  User,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useMentorConversations,
  useMentorMessages,
  useMentorDashboard,
  useSendMentorMessage,
  useCreateMentorConversation,
  useRenameMentorConversation,
  useDeleteMentorConversation,
  useTogglePinMentorConversation,
  type MentorConversation,
} from "@/lib/mentor-client";

export const Route = createFileRoute("/mentor")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Mentor · Provn" },
      {
        name: "description",
        content:
          "Your persistent AI career mentor — context-aware guidance from your resume, roadmap, and interview history.",
      },
    ],
  }),
  component: MentorPage,
});

const QUICK_ACTIONS = [
  {
    label: "Improve my resume",
    prompt:
      "Review my resume and suggest specific improvements based on my current ATS score and target role.",
  },
  {
    label: "What should I study today?",
    prompt: "What should I study today, given my current roadmap and skill gaps?",
  },
  {
    label: "Generate interview questions",
    prompt:
      "Generate 5 interview questions tailored to my target role and company, based on my current readiness.",
  },
  {
    label: "Suggest a project",
    prompt: "Suggest a project I should build next to close my biggest skill gap.",
  },
  {
    label: "Explain a weak topic",
    prompt:
      "Pick my weakest skill or topic right now and explain it clearly, with a short practice exercise.",
  },
  {
    label: "Prepare me for Google",
    prompt: "How should I prepare specifically for a Google interview, given my current profile?",
  },
  {
    label: "Prepare me for Amazon",
    prompt: "How should I prepare specifically for an Amazon interview, given my current profile?",
  },
];

function MentorPage() {
  const { data: user } = useCurrentUser();
  const { data: conversations } = useMentorConversations(user?.id);
  const { data: widgets } = useMentorDashboard(user?.id);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, search]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="font-display text-4xl tracking-tight">Mentor.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Your persistent AI career coach — grounded in your resume, roadmap, and interview
            history.
          </p>
        </div>

        <MentorWidgetsRow widgets={widgets} />

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <ConversationSidebar
            profileId={user?.id}
            conversations={filteredConversations}
            activeId={activeConversationId}
            onSelect={setActiveConversationId}
            search={search}
            onSearchChange={setSearch}
          />
          <ChatPanel
            profileId={user?.id}
            conversationId={activeConversationId}
            onConversationCreated={setActiveConversationId}
          />
        </div>
      </div>
    </AppShell>
  );
}

function MentorWidgetsRow({ widgets }: { widgets: ReturnType<typeof useMentorDashboard>["data"] }) {
  const tiles = [
    {
      icon: Target,
      label: "Today's priority",
      value: widgets?.todaysPriority ?? "—",
    },
    {
      icon: CalendarClock,
      label: "Next interview",
      value: widgets?.nextInterview
        ? `${widgets.nextInterview.title} · ${new Date(widgets.nextInterview.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : "None scheduled",
    },
    {
      icon: TrendingDown,
      label: "Weakest skill",
      value: widgets?.weakestSkill ?? "No gaps found",
    },
    {
      icon: FolderKanban,
      label: "Recommended project",
      value: widgets?.recommendedProject ?? "—",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm font-medium">{t.value}</p>
        </div>
      ))}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" /> Estimated readiness
        </div>
        <p className="mt-1 text-2xl font-semibold">
          {widgets?.estimatedReadiness != null ? `${widgets.estimatedReadiness}%` : "—"}
        </p>
        <Progress value={widgets?.estimatedReadiness ?? 0} className="mt-1.5" />
      </div>
    </div>
  );
}

function ConversationSidebar({
  profileId,
  conversations,
  activeId,
  onSelect,
  search,
  onSearchChange,
}: {
  profileId: string | undefined;
  conversations: MentorConversation[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const createConversation = useCreateMentorConversation(profileId);
  const renameConversation = useRenameMentorConversation(profileId);
  const deleteConversation = useDeleteMentorConversation(profileId);
  const togglePin = useTogglePinMentorConversation(profileId);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function handleNewChat() {
    const result = await createConversation.mutateAsync();
    if (!result.error && result.conversationId) onSelect(result.conversationId);
  }

  function startRename(c: MentorConversation) {
    setRenamingId(c.id);
    setRenameValue(c.title);
  }

  async function commitRename(id: string) {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    await renameConversation.mutateAsync({ conversationId: id, title });
  }

  async function handleDelete(c: MentorConversation) {
    if (!window.confirm(`Delete "${c.title}"? This can't be undone.`)) return;
    await deleteConversation.mutateAsync(c.id);
    if (activeId === c.id) onSelect(null);
  }

  const pinned = conversations.filter((c) => c.is_pinned);
  const recent = conversations.filter((c) => !c.is_pinned);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-3">
      <Button
        size="sm"
        className="w-full justify-start"
        onClick={handleNewChat}
        disabled={createConversation.isPending}
      >
        {createConversation.isPending ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="mr-2 h-3.5 w-3.5" />
        )}
        New chat
      </Button>

      <div className="relative mt-3">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search chats…"
          className="h-8 pl-8 text-sm"
        />
      </div>

      <div className="mt-3 max-h-[28rem] space-y-4 overflow-y-auto pr-1">
        {pinned.length > 0 && (
          <div>
            <div className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Pinned
            </div>
            <div className="mt-1 space-y-0.5">
              {pinned.map((c) => (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  active={c.id === activeId}
                  onSelect={() => onSelect(c.id)}
                  renaming={renamingId === c.id}
                  renameValue={renameValue}
                  onRenameChange={setRenameValue}
                  onStartRename={() => startRename(c)}
                  onCommitRename={() => commitRename(c.id)}
                  onTogglePin={() =>
                    togglePin.mutate({ conversationId: c.id, pinned: !c.is_pinned })
                  }
                  onDelete={() => handleDelete(c)}
                />
              ))}
            </div>
          </div>
        )}
        <div>
          {pinned.length > 0 && (
            <div className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Recent
            </div>
          )}
          <div className="mt-1 space-y-0.5">
            {recent.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                onSelect={() => onSelect(c.id)}
                renaming={renamingId === c.id}
                renameValue={renameValue}
                onRenameChange={setRenameValue}
                onStartRename={() => startRename(c)}
                onCommitRename={() => commitRename(c.id)}
                onTogglePin={() => togglePin.mutate({ conversationId: c.id, pinned: !c.is_pinned })}
                onDelete={() => handleDelete(c)}
              />
            ))}
            {conversations.length === 0 && (
              <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                {search ? "No chats match your search." : "No chats yet — start one above."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  onSelect,
  renaming,
  renameValue,
  onRenameChange,
  onStartRename,
  onCommitRename,
  onTogglePin,
  onDelete,
}: {
  conversation: MentorConversation;
  active: boolean;
  onSelect: () => void;
  renaming: boolean;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  if (renaming) {
    return (
      <Input
        autoFocus
        value={renameValue}
        onChange={(e) => onRenameChange(e.target.value)}
        onBlur={onCommitRename}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommitRename();
          if (e.key === "Escape") onCommitRename();
        }}
        className="h-8 text-sm"
      />
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition ${
        active ? "bg-brand-soft/50 text-foreground" : "hover:bg-muted/50"
      }`}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left">
        {conversation.is_pinned && <Pin className="mr-1 inline h-3 w-3 text-brand" />}
        {conversation.title}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onTogglePin}>
            {conversation.is_pinned ? (
              <>
                <PinOff className="mr-2 h-3.5 w-3.5" /> Unpin
              </>
            ) : (
              <>
                <Pin className="mr-2 h-3.5 w-3.5" /> Pin
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onStartRename}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ChatPanel({
  profileId,
  conversationId,
  onConversationCreated,
}: {
  profileId: string | undefined;
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}) {
  const { data: messages } = useMentorMessages(conversationId ?? undefined);
  const sendMessage = useSendMentorMessage(profileId);
  const [input, setInput] = useState("");
  const [optimisticUserText, setOptimisticUserText] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, optimisticUserText]);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;
    setInput("");
    setSendError(null);
    setOptimisticUserText(trimmed);
    const result = await sendMessage.mutateAsync({
      conversationId: conversationId ?? undefined,
      message: trimmed,
    });
    setOptimisticUserText(null);
    if (result.error) {
      setSendError(result.error);
      return;
    }
    if (result.conversationId && !conversationId) {
      onConversationCreated(result.conversationId);
    }
  }

  return (
    <div className="flex h-[36rem] flex-col rounded-2xl border border-border bg-card">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {!conversationId && (messages ?? []).length === 0 && !optimisticUserText && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="h-8 w-8 text-brand" />
            <p className="mt-3 text-sm font-medium">Ask your mentor anything.</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Grounded in your resume, roadmap, and interview history — try a quick action below.
            </p>
          </div>
        )}

        {(messages ?? []).map((m) => (
          <ChatBubble key={m.id} role={m.role as "user" | "model"} content={m.content} />
        ))}
        {optimisticUserText && <ChatBubble role="user" content={optimisticUserText} />}
        {sendMessage.isPending && <ChatBubble role="model" content="…" pending />}
      </div>

      {sendError && (
        <div className="mx-5 mb-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {sendError}
        </div>
      )}

      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              type="button"
              onClick={() => handleSend(qa.prompt)}
              disabled={sendMessage.isPending}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-muted/50 disabled:opacity-50"
            >
              {qa.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="Ask your mentor…"
            rows={1}
            className="min-h-9 flex-1 resize-none"
          />
          <Button
            size="icon"
            onClick={() => handleSend(input)}
            disabled={sendMessage.isPending || !input.trim()}
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  role,
  content,
  pending,
}: {
  role: "user" | "model";
  content: string;
  pending?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-foreground text-background" : "bg-brand-soft text-brand"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div
        className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
          isUser ? "bg-foreground text-background" : "border border-border bg-muted/30"
        } ${pending ? "animate-pulse text-muted-foreground" : ""}`}
      >
        {pending ? "Mentor is thinking…" : content}
      </div>
    </div>
  );
}
