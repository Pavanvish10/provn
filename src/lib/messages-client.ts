import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
export type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
export type ParticipantRow = Database["public"]["Tables"]["conversation_participants"]["Row"];

export type ProfileLite = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "username" | "avatar_url" | "is_online" | "last_seen_at"
>;

const PROFILE_LITE_COLUMNS = "id, full_name, username, avatar_url, is_online, last_seen_at";

export type ConversationSummary = {
  id: string;
  isGroup: boolean;
  createdAt: string;
  lastMessageAt: string;
  myLastReadAt: string;
  otherParticipants: ProfileLite[];
  lastMessage: MessageRow | null;
  unreadCount: number;
};

export type ParticipantWithProfile = ParticipantRow & { profile: ProfileLite | null };

// ---------------------------------------------------------------------
// Conversation list
// ---------------------------------------------------------------------

export function conversationsQueryKey(userId: string | undefined) {
  return ["conversations", userId] as const;
}

export function useConversations(userId: string | undefined) {
  return useQuery({
    queryKey: conversationsQueryKey(userId),
    queryFn: async (): Promise<ConversationSummary[]> => {
      const supabase = getSupabaseBrowserClient();

      const { data: myParticipants, error: myError } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("profile_id", userId!);
      if (myError) throw myError;
      if (!myParticipants || myParticipants.length === 0) return [];

      const conversationIds = myParticipants.map((p) => p.conversation_id);
      const readMap = new Map(myParticipants.map((p) => [p.conversation_id, p.last_read_at]));

      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("id, is_group, created_at, last_message_at")
        .in("id", conversationIds)
        .order("last_message_at", { ascending: false });
      if (convError) throw convError;

      const { data: otherParticipantRows, error: partError } = await supabase
        .from("conversation_participants")
        .select("conversation_id, profile_id")
        .in("conversation_id", conversationIds)
        .neq("profile_id", userId!);
      if (partError) throw partError;

      const otherProfileIds = Array.from(
        new Set((otherParticipantRows ?? []).map((r) => r.profile_id)),
      );
      let profileMap = new Map<string, ProfileLite>();
      if (otherProfileIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select(PROFILE_LITE_COLUMNS)
          .in("id", otherProfileIds);
        if (profileError) throw profileError;
        profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      }

      const participantsByConversation = new Map<string, ProfileLite[]>();
      for (const row of otherParticipantRows ?? []) {
        const profile = profileMap.get(row.profile_id);
        if (!profile) continue;
        const list = participantsByConversation.get(row.conversation_id) ?? [];
        list.push(profile);
        participantsByConversation.set(row.conversation_id, list);
      }

      const { data: recentMessages, error: msgError } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(500);
      if (msgError) throw msgError;

      const lastMessageMap = new Map<string, MessageRow>();
      for (const m of recentMessages ?? []) {
        if (!lastMessageMap.has(m.conversation_id)) lastMessageMap.set(m.conversation_id, m);
      }

      const minReadAt = myParticipants.reduce(
        (min, p) => (p.last_read_at < min ? p.last_read_at : min),
        myParticipants[0].last_read_at,
      );
      const { data: unreadRows, error: unreadError } = await supabase
        .from("messages")
        .select("conversation_id, created_at")
        .in("conversation_id", conversationIds)
        .neq("sender_id", userId!)
        .gt("created_at", minReadAt)
        .limit(2000);
      if (unreadError) throw unreadError;

      const unreadCounts = new Map<string, number>();
      for (const row of unreadRows ?? []) {
        const threshold = readMap.get(row.conversation_id);
        if (threshold && row.created_at > threshold) {
          unreadCounts.set(row.conversation_id, (unreadCounts.get(row.conversation_id) ?? 0) + 1);
        }
      }

      return (conversations ?? []).map((c) => ({
        id: c.id,
        isGroup: c.is_group,
        createdAt: c.created_at,
        lastMessageAt: c.last_message_at,
        myLastReadAt: readMap.get(c.id) ?? c.created_at,
        otherParticipants: participantsByConversation.get(c.id) ?? [],
        lastMessage: lastMessageMap.get(c.id) ?? null,
        unreadCount: unreadCounts.get(c.id) ?? 0,
      }));
    },
    enabled: !!userId,
  });
}

// ---------------------------------------------------------------------
// Participants of a single conversation (used for header + read receipts)
// ---------------------------------------------------------------------

export function participantsQueryKey(conversationId: string | undefined) {
  return ["conversation-participants", conversationId] as const;
}

export function useConversationParticipants(conversationId: string | undefined) {
  return useQuery({
    queryKey: participantsQueryKey(conversationId),
    queryFn: async (): Promise<ParticipantWithProfile[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data: rows, error } = await supabase
        .from("conversation_participants")
        .select("*")
        .eq("conversation_id", conversationId!);
      if (error) throw error;

      const ids = (rows ?? []).map((r) => r.profile_id);
      let profileMap = new Map<string, ProfileLite>();
      if (ids.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select(PROFILE_LITE_COLUMNS)
          .in("id", ids);
        if (profileError) throw profileError;
        profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      }

      return (rows ?? []).map((r) => ({ ...r, profile: profileMap.get(r.profile_id) ?? null }));
    },
    enabled: !!conversationId,
  });
}

// ---------------------------------------------------------------------
// Messages within a conversation
// ---------------------------------------------------------------------

export function messagesQueryKey(conversationId: string | undefined) {
  return ["messages", conversationId] as const;
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: messagesQueryKey(conversationId),
    queryFn: async (): Promise<MessageRow[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage(conversationId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { content?: string | null; imageUrl?: string | null }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId!,
        sender_id: userId!,
        content: input.content?.trim() ? input.content.trim() : null,
        image_url: input.imageUrl ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesQueryKey(conversationId) });
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey(userId) });
    },
  });
}

// ---------------------------------------------------------------------
// Read receipts
// ---------------------------------------------------------------------

export async function markConversationRead(conversationId: string, userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", userId);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Starting / finding a 1:1 conversation
// ---------------------------------------------------------------------

export function useStartConversation(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (otherUserId: string): Promise<string> => {
      const supabase = getSupabaseBrowserClient();

      const { data: mine, error: mineError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("profile_id", userId!);
      if (mineError) throw mineError;
      const myConversationIds = (mine ?? []).map((p) => p.conversation_id);

      if (myConversationIds.length > 0) {
        const { data: shared, error: sharedError } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("profile_id", otherUserId)
          .in("conversation_id", myConversationIds);
        if (sharedError) throw sharedError;
        const candidateIds = (shared ?? []).map((p) => p.conversation_id);

        if (candidateIds.length > 0) {
          const { data: candidateConversations, error: candError } = await supabase
            .from("conversations")
            .select("id")
            .in("id", candidateIds)
            .eq("is_group", false);
          if (candError) throw candError;
          const oneToOneIds = (candidateConversations ?? []).map((c) => c.id);

          if (oneToOneIds.length > 0) {
            const { data: allParticipantsOfCandidates, error: allPartError } = await supabase
              .from("conversation_participants")
              .select("conversation_id")
              .in("conversation_id", oneToOneIds);
            if (allPartError) throw allPartError;
            const counts = new Map<string, number>();
            for (const row of allParticipantsOfCandidates ?? []) {
              counts.set(row.conversation_id, (counts.get(row.conversation_id) ?? 0) + 1);
            }
            const exactMatch = oneToOneIds.find((id) => counts.get(id) === 2);
            if (exactMatch) return exactMatch;
          }
        }
      }

      // Sprint 34: generate the id client-side and skip .select() on this
      // insert. Postgres enforces a table's SELECT policy on the row
      // returned by INSERT...RETURNING too — and conversations_participant_
      // select requires an existing conversation_participants row, which
      // can't exist yet for a conversation that was just created. Chaining
      // .select().single() here always failed with a genuine "new row
      // violates row-level security policy" error (confirmed live), a
      // real pre-existing bug this sprint's verification work surfaced,
      // not a Sprint 34 regression — no Playwright coverage exercises
      // authenticated flows, and no prior sprint's live-account testing
      // happened to start a brand-new DM this way.
      const newConversationId = crypto.randomUUID();
      const { error: createError } = await supabase
        .from("conversations")
        .insert({ id: newConversationId, is_group: false });
      if (createError) throw createError;

      const { error: participantsError } = await supabase.from("conversation_participants").insert([
        { conversation_id: newConversationId, profile_id: userId! },
        { conversation_id: newConversationId, profile_id: otherUserId },
      ]);
      if (participantsError) throw participantsError;

      return newConversationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey(userId) });
    },
  });
}

// ---------------------------------------------------------------------
// Search people to start a new conversation with
// ---------------------------------------------------------------------

export function useProfileSearch(query: string, excludeId: string | undefined) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["profile-search", trimmed, excludeId],
    queryFn: async (): Promise<ProfileLite[]> => {
      const supabase = getSupabaseBrowserClient();
      const safe = trimmed.replace(/[%,]/g, "").trim();
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_LITE_COLUMNS)
        .neq("id", excludeId!)
        .or(`full_name.ilike.%${safe}%,username.ilike.%${safe}%`)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: trimmed.length > 0 && !!excludeId,
  });
}

// ---------------------------------------------------------------------
// Chat image upload — Sprint 31: moved to the private `chat-images`
// bucket (previously reused the public post-images bucket, so a DM
// image was viewable by anyone with the guessable URL). Returns the
// storage path, not a URL; messages.image_url now stores that path and
// callers must resolve it to a short-lived signed URL via
// getSignedChatImageUrl before rendering, same pattern as resumes.
// ---------------------------------------------------------------------

export async function uploadChatImage(userId: string, file: File): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${userId}/chat-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("chat-images")
    .upload(path, file, { upsert: false, cacheControl: "3600" });
  if (error) throw error;
  return path;
}

export async function getSignedChatImageUrl(storagePath: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from("chat-images")
    .createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

// ---------------------------------------------------------------------
// Online presence best-effort tracking (profiles.is_online / last_seen_at)
// ---------------------------------------------------------------------

export async function setOnlinePresence(userId: string, online: boolean) {
  const supabase = getSupabaseBrowserClient();
  await supabase
    .from("profiles")
    .update({ is_online: online, last_seen_at: new Date().toISOString() })
    .eq("id", userId);
}
