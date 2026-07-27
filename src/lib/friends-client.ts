import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type Friendship = Database["public"]["Tables"]["friendships"]["Row"];

export type ProfileLite = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  target_role: string | null;
  location: string | null;
};

export type FriendRequest = {
  id: string;
  created_at: string;
  profile: ProfileLite | null;
};

export type FriendEntry = {
  friendshipId: string;
  profile: ProfileLite | null;
};

const PROFILE_LITE_COLUMNS = "id, full_name, username, avatar_url, target_role, location";

export function useFriendSearch(userId: string | undefined, query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["friends", "search", userId, q],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const like = `%${q}%`;
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(PROFILE_LITE_COLUMNS)
        .neq("id", userId!)
        .or(`full_name.ilike.${like},username.ilike.${like}`)
        .limit(20);
      if (error) throw error;

      const { data: rels, error: relError } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .in("status", ["pending", "accepted", "blocked"]);
      if (relError) throw relError;

      const excluded = new Set<string>();
      (rels ?? []).forEach((r) => {
        excluded.add(r.requester_id === userId ? r.addressee_id : r.requester_id);
      });

      return (profiles ?? []).filter((p) => !excluded.has(p.id)) as ProfileLite[];
    },
    enabled: !!userId && q.length > 0,
  });
}

export function useIncomingRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ["friends", "incoming", userId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("friendships")
        .select(
          `id, created_at, profile:profiles!friendships_requester_id_fkey(${PROFILE_LITE_COLUMNS})`,
        )
        .eq("addressee_id", userId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FriendRequest[];
    },
    enabled: !!userId,
  });
}

export function useOutgoingRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ["friends", "outgoing", userId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("friendships")
        .select(
          `id, created_at, profile:profiles!friendships_addressee_id_fkey(${PROFILE_LITE_COLUMNS})`,
        )
        .eq("requester_id", userId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FriendRequest[];
    },
    enabled: !!userId,
  });
}

export function useFriendsList(userId: string | undefined) {
  return useQuery({
    queryKey: ["friends", "list", userId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("friendships")
        .select(
          `id, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(${PROFILE_LITE_COLUMNS}), addressee:profiles!friendships_addressee_id_fkey(${PROFILE_LITE_COLUMNS})`,
        )
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      if (error) throw error;

      type FriendshipRow = {
        id: string;
        requester_id: string;
        addressee_id: string;
        requester: ProfileLite | null;
        addressee: ProfileLite | null;
      };
      return ((data ?? []) as unknown as FriendshipRow[]).map((row) => ({
        friendshipId: row.id,
        profile: row.requester_id === userId ? row.addressee : row.requester,
      })) as FriendEntry[];
    },
    enabled: !!userId,
  });
}

export function useMutualFriendsCount(userId: string | undefined, otherId: string | undefined) {
  return useQuery({
    queryKey: ["friends", "mutual", userId, otherId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const [mine, theirs] = await Promise.all([
        supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
        supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${otherId},addressee_id.eq.${otherId}`),
      ]);
      if (mine.error) throw mine.error;
      if (theirs.error) throw theirs.error;

      const mineIds = new Set(
        (mine.data ?? []).map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id)),
      );
      const theirIds = new Set(
        (theirs.data ?? []).map((r) =>
          r.requester_id === otherId ? r.addressee_id : r.requester_id,
        ),
      );

      let count = 0;
      mineIds.forEach((id) => {
        if (theirIds.has(id)) count += 1;
      });
      return count;
    },
    enabled: !!userId && !!otherId && userId !== otherId,
  });
}

export function useSuggestedPeople(
  userId: string | undefined,
  targetRole: string | null | undefined,
  limit = 6,
) {
  return useQuery({
    queryKey: ["friends", "suggestions", userId, targetRole, limit],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();

      const { data: rels, error: relError } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      if (relError) throw relError;

      const excluded = new Set<string>([userId!]);
      (rels ?? []).forEach((r) => {
        excluded.add(r.requester_id === userId ? r.addressee_id : r.requester_id);
      });

      if (targetRole) {
        const { data, error } = await supabase
          .from("profiles")
          .select(PROFILE_LITE_COLUMNS)
          .eq("target_role", targetRole)
          .neq("id", userId!)
          .limit(limit + excluded.size);
        if (error) throw error;
        const filtered = (data ?? [])
          .filter((p) => !excluded.has(p.id))
          .slice(0, limit) as ProfileLite[];
        if (filtered.length > 0) return filtered;
      }

      const { data: mySkills, error: skillError } = await supabase
        .from("skills")
        .select("skill_name")
        .eq("profile_id", userId!);
      if (skillError) throw skillError;

      const names = Array.from(
        new Set((mySkills ?? []).map((s) => s.skill_name).filter((n): n is string => !!n)),
      );
      if (names.length === 0) return [] as ProfileLite[];

      const { data: overlapping, error: overlapError } = await supabase
        .from("skills")
        .select(`profile_id, profile:profiles!skills_profile_id_fkey(${PROFILE_LITE_COLUMNS})`)
        .in("skill_name", names)
        .neq("profile_id", userId!);
      if (overlapError) throw overlapError;

      type SkillRow = { profile_id: string; profile: ProfileLite | null };
      const seen = new Map<string, ProfileLite>();
      ((overlapping ?? []) as unknown as SkillRow[]).forEach((row) => {
        const p = row.profile;
        if (p && !excluded.has(p.id) && !seen.has(p.id)) seen.set(p.id, p);
      });

      return Array.from(seen.values()).slice(0, limit);
    },
    enabled: !!userId,
  });
}

export function useSendFriendRequest(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetId: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("friendships")
        .insert({ requester_id: userId!, addressee_id: targetId, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });
}

export function useAcceptRequest(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", friendshipId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });
}

/** Rejects an incoming request, cancels an outgoing one, or removes an accepted friend — all by row id. */
export function useDeleteFriendship(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });
}
