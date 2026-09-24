import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Send, Search, ImagePlus, Check, CheckCheck, X, MessageSquarePlus } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  conversationsQueryKey,
  getSignedChatImageUrl,
  markConversationRead,
  messagesQueryKey,
  participantsQueryKey,
  setOnlinePresence,
  uploadChatImage,
  useConversationParticipants,
  useConversations,
  useMessages,
  useProfileSearch,
  useSendMessage,
  useStartConversation,
  type ConversationSummary,
  type ProfileLite,
} from "@/lib/messages-client";

const searchSchema = z.object({
  to: z.string().optional(),
});

export const Route = createFileRoute("/messages")({
  validateSearch: searchSchema,
  beforeLoad: requireAuth,
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

function displayName(profile: ProfileLite | null | undefined) {
  if (!profile) return "Unknown user";
  return profile.full_name || profile.username || "Unknown user";
}

function initials(profile: ProfileLite | null | undefined) {
  const name = displayName(profile);
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString();
}

function lastSeenLabel(profile: ProfileLite | null | undefined, online: boolean) {
  if (online) return "Online";
  if (!profile?.last_seen_at) return "Offline";
  return `Last seen ${formatTime(profile.last_seen_at)} ago`;
}

// messages.image_url stores a chat-images storage path (private bucket,
// Sprint 31), not a public URL — resolve it to a short-lived signed URL
// on render, same pattern as resume previews.
function ChatImage({ storagePath }: { storagePath: string }) {
  const { data: url } = useQuery({
    queryKey: ["chat-image-url", storagePath],
    queryFn: () => getSignedChatImageUrl(storagePath),
    staleTime: 8 * 60 * 1000,
  });
  if (!url) {
    return <div className="mb-1 h-40 w-full animate-pulse rounded-lg bg-muted" />;
  }
  return (
    <img
      src={url}
      alt="Shared attachment"
      className="mb-1 max-h-64 w-full rounded-lg object-cover"
    />
  );
}

function Messages() {
  const { data: user } = useCurrentUser();
  const search = Route.useSearch();
  const queryClient = useQueryClient();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [search_, setSearchQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newMessageQuery, setNewMessageQuery] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const presenceChannelRef = useRef<ReturnType<
    ReturnType<typeof getSupabaseBrowserClient>["channel"]
  > | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  const userId = user?.id;

  const { data: conversations, isLoading: conversationsLoading } = useConversations(userId);
  const { data: messages, isLoading: messagesLoading } = useMessages(activeId ?? undefined);
  const { data: participants } = useConversationParticipants(activeId ?? undefined);
  const sendMessage = useSendMessage(activeId ?? undefined, userId);
  const startConversation = useStartConversation(userId);
  const { data: searchResults, isLoading: searchLoading } = useProfileSearch(
    newMessageQuery,
    userId,
  );

  const active = useMemo(
    () => conversations?.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );
  const otherParticipant = active?.otherParticipants[0] ?? null;

  const otherParticipantRecord = useMemo(
    () => participants?.find((p) => p.profile_id !== userId) ?? null,
    [participants, userId],
  );

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    if (!search_.trim()) return conversations;
    const q = search_.trim().toLowerCase();
    return conversations.filter((c) =>
      c.otherParticipants.some((p) => displayName(p).toLowerCase().includes(q)),
    );
  }, [conversations, search_]);

  // Auto-select conversation from ?to= a friend's profile id, finding-or-creating it.
  useEffect(() => {
    if (!search.to || !userId || activeId) return;
    if (search.to === userId) return;
    startConversation.mutate(search.to, {
      onSuccess: (conversationId) => setActiveId(conversationId),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.to, userId]);

  // Default to the first (most recent) conversation once loaded.
  useEffect(() => {
    if (!activeId && conversations && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  // Mark conversation read whenever it's opened, and whenever new messages arrive while open.
  useEffect(() => {
    if (!activeId || !userId) return;
    markConversationRead(activeId, userId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: conversationsQueryKey(userId) });
        queryClient.invalidateQueries({ queryKey: participantsQueryKey(activeId) });
      })
      .catch(() => {});
  }, [activeId, userId, messages?.length, queryClient]);

  // Scroll to bottom on new messages / thread switch.
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ block: "end" });
  }, [activeId, messages?.length]);

  // Realtime: messages in the open thread.
  useEffect(() => {
    if (!activeId) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`messages-thread-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: messagesQueryKey(activeId) });
          queryClient.invalidateQueries({ queryKey: conversationsQueryKey(userId) });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${activeId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: participantsQueryKey(activeId) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, queryClient, userId]);

  // Realtime: broad inbox refresh so the conversation list stays live even
  // when a different thread receives a message.
  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`inbox-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: conversationsQueryKey(userId) });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // Presence: online status + typing indicator for the open thread.
  useEffect(() => {
    if (!activeId || !userId) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`presence:conversation:${activeId}`, {
      config: { presence: { key: userId } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
      })
      .on("broadcast", { event: "typing" }, ({ payload }: { payload: { userId?: string } }) => {
        if (payload?.userId && payload.userId !== userId) {
          setOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ online_at: new Date().toISOString() });
        }
      });
    presenceChannelRef.current = channel;
    return () => {
      setOtherTyping(false);
      setOnlineIds(new Set());
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [activeId, userId]);

  // Best-effort global online status: mark online on mount, offline on unmount,
  // and heartbeat periodically while the page is open.
  useEffect(() => {
    if (!userId) return;
    setOnlinePresence(userId, true).catch(() => {});
    const interval = setInterval(() => {
      setOnlinePresence(userId, true).catch(() => {});
    }, 30000);
    const handleUnload = () => {
      setOnlinePresence(userId, false).catch(() => {});
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
      setOnlinePresence(userId, false).catch(() => {});
    };
  }, [userId]);

  const broadcastTyping = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    presenceChannelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId } });
  };

  const handleSend = async () => {
    if (!activeId || !userId) return;
    if (!draft.trim() && !pendingImage) return;
    let imageUrl: string | null = null;
    try {
      if (pendingImage) {
        setUploading(true);
        imageUrl = await uploadChatImage(userId, pendingImage);
      }
      await sendMessage.mutateAsync({ content: draft, imageUrl });
      setDraft("");
      setPendingImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  const handleStartConversation = (otherUserId: string) => {
    startConversation.mutate(otherUserId, {
      onSuccess: (conversationId) => {
        setActiveId(conversationId);
        setNewMessageOpen(false);
        setNewMessageQuery("");
      },
    });
  };

  const isOtherOnline = otherParticipant
    ? onlineIds.has(otherParticipant.id) || !!otherParticipant.is_online
    : false;

  return (
    <AppShell>
      <div className="grid h-[calc(100vh-10rem)] grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[300px_1fr]">
        <div className="flex flex-col border-b border-border md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-border p-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Conversations
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setNewMessageOpen(true)}
              aria-label="New message"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          </div>
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search_}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading && (
              <div className="p-4 text-sm text-muted-foreground">Loading conversations…</div>
            )}
            {!conversationsLoading && filteredConversations.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                {conversations && conversations.length > 0
                  ? "No conversations match your search."
                  : "No conversations yet — message a friend to get started."}
              </div>
            )}
            {filteredConversations.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                online={c.otherParticipants.some((p) => onlineIds.has(p.id) || !!p.is_online)}
                onClick={() => setActiveId(c.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          {!active && (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              {conversationsLoading
                ? "Loading…"
                : "Select a conversation, or start a new one to say hello."}
            </div>
          )}

          {active && (
            <>
              <div className="flex items-center gap-3 border-b border-border p-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherParticipant?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{initials(otherParticipant)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate font-medium">{displayName(otherParticipant)}</div>
                  <div className="text-xs text-muted-foreground">
                    {otherTyping ? "Typing…" : lastSeenLabel(otherParticipant, isOtherOnline)}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messagesLoading && (
                  <div className="text-sm text-muted-foreground">Loading messages…</div>
                )}
                {!messagesLoading && messages && messages.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No messages yet. Say hello to {displayName(otherParticipant)}.
                  </div>
                )}
                {messages?.map((m) => {
                  const mine = m.sender_id === userId;
                  const seen =
                    mine &&
                    !!otherParticipantRecord &&
                    otherParticipantRecord.last_read_at >= m.created_at;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          mine ? "bg-brand text-brand-foreground" : "bg-muted text-foreground"
                        }`}
                      >
                        {m.image_url && <ChatImage storagePath={m.image_url} />}
                        {m.content && (
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        )}
                        <div
                          className={`mt-0.5 flex items-center gap-1 text-[10px] ${
                            mine ? "text-brand-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {formatTime(m.created_at)}
                          {mine &&
                            (seen ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollBottomRef} />
              </div>

              {pendingImage && (
                <div className="flex items-center gap-2 border-t border-border px-3 pt-2 text-xs text-muted-foreground">
                  <span className="truncate">{pendingImage.name}</span>
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    className="ml-auto hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2 border-t border-border p-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => setPendingImage(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach image"
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <Input
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    broadcastTyping();
                  }}
                  placeholder="Type a message…"
                  className="h-10"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={(!draft.trim() && !pendingImage) || uploading || sendMessage.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      <Dialog open={newMessageOpen} onOpenChange={setNewMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New message</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={newMessageQuery}
            onChange={(e) => setNewMessageQuery(e.target.value)}
            placeholder="Search by name or username…"
          />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {searchLoading && <div className="p-2 text-sm text-muted-foreground">Searching…</div>}
            {!searchLoading && newMessageQuery.trim() && (searchResults?.length ?? 0) === 0 && (
              <div className="p-2 text-sm text-muted-foreground">No one found.</div>
            )}
            {searchResults?.map((p) => (
              <button
                key={p.id}
                onClick={() => handleStartConversation(p.id)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-muted"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={p.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{initials(p)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{displayName(p)}</div>
                  {p.username && (
                    <div className="truncate text-xs text-muted-foreground">@{p.username}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ConversationRow({
  conversation,
  active,
  online,
  onClick,
}: {
  conversation: ConversationSummary;
  active: boolean;
  online: boolean;
  onClick: () => void;
}) {
  const other = conversation.otherParticipants[0] ?? null;
  const preview = conversation.lastMessage
    ? (conversation.lastMessage.content ?? (conversation.lastMessage.image_url ? "📷 Photo" : ""))
    : "No messages yet";

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-border p-3 text-left transition hover:bg-muted ${
        active ? "bg-muted" : ""
      }`}
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={other?.avatar_url ?? undefined} alt="" />
          <AvatarFallback>{initials(other)}</AvatarFallback>
        </Avatar>
        {online && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{displayName(other)}</span>
          {conversation.unreadCount > 0 && (
            <Badge className="ml-auto shrink-0 rounded-full px-1.5 text-[10px]">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <span className="truncate">{preview}</span>
          {conversation.lastMessage && (
            <span className="shrink-0">· {formatTime(conversation.lastMessageAt)}</span>
          )}
        </div>
      </div>
    </button>
  );
}
